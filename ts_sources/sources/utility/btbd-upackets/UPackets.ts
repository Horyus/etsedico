import { ECKeyPair }                                        from '../btbd-crypto/ec_gen';
import { Packet, PacketType, RawPackets }                   from '../btbd-packets/Packet';
import { ec_decrypt, ec_encrypt, rsa_decrypt, rsa_encrypt } from '../btbd-crypto';
import { keccak256 }                                        from 'js-sha3';
import { Uint64BE }                                         from 'int64-buffer';

const UHEADER_SIZE: number = 15;

/**
 * Used mainly to be able to require dynamically the modules
 */
const PacketTypeToPacketName: any = {
    [PacketType.AgreePacket]: 'AgreePacket',
    [PacketType.ConfirmationPacket]: 'ConfirmationPacket',
    [PacketType.DataPacket]: 'DataPacket',
    [PacketType.DropPacket]: 'DropPacket',
    [PacketType.EngagePacket]: 'EngagePacket',
    [PacketType.LossPacket]: 'LossPacket',
    [PacketType.PingPacket]: 'PingPacket',
    [PacketType.PongPacket]: 'PongPacket',
    [PacketType.RememberPacket]: 'RememberPacket',
    [PacketType.RespondPacket]: 'RespondPacket'
};

/**
 * Encryption types values
 */
export enum UPacketsEncryptionType {
    RSA = 0,
    EC,
    None
}

interface Encryptions {
    [key: number]: (key: Buffer, msg: Buffer) => Promise<Buffer>;
}

interface Decryptions {
    [key: number]: (key: Buffer, msg: Buffer) => Promise<Buffer>;
}

interface UPacketHeader<T> {
    packet_id: Buffer;
    index: T;
    size: T;
}

interface FragmentedPacket {
    header: Buffer;
    bodies: Buffer[];
    body_packet_count: number;
    type: number;
    timestamp: Uint64BE;
    encryption_scheme: UPacketsEncryptionType;
    from: Buffer;
    master_address: Buffer;
}

interface PacketStore {
    [key: string]: FragmentedPacket;
}

/**
 * Class used to transform Packets into encrypted fragments called UPackets.
 */
export class UPackets {

    public static UPacketSize: number = 550;
    private static readonly store: PacketStore = {};

    private static readonly encryptions: Encryptions = {
        [UPacketsEncryptionType.EC]: ec_encrypt,
        [UPacketsEncryptionType.RSA]: rsa_encrypt,
        [UPacketsEncryptionType.None]: async (key: Buffer, msg: Buffer): Promise<Buffer> => msg
    };

    private static readonly decryptions: Decryptions = {
        [UPacketsEncryptionType.EC]: ec_decrypt,
        [UPacketsEncryptionType.RSA]: rsa_decrypt,
        [UPacketsEncryptionType.None]: async (key: Buffer, msg: Buffer): Promise<Buffer> => msg
    };

    /**
     * Estimates the packet count with the provided encryption, data, and packet size
     * @param enc Encryption type
     * @param data Buffer that will be fragmented
     * @param size Max size of a fragment
     */
    public static estimatePacketCount(enc: UPacketsEncryptionType, data: Buffer, size: number): number {
        switch (enc) {
            case UPacketsEncryptionType.EC:
                const estimation: number = data.length + (data.length % 16 === 0 ? 16 : (16 - data.length % 16));
                return Math.floor(estimation / size) + ((estimation % size) ? 1 : 0);
            case UPacketsEncryptionType.RSA:
            case UPacketsEncryptionType.None:
                return Math.floor(data.length / size) + ((data.length % size) ? 1 : 0);
        }
    }

    /**
     * Estimates the size of the encrypted version of the data
     * @param enc Encryption type
     * @param data_size Original size
     */
    public static estimatePacketSize(enc: UPacketsEncryptionType, data_size: number): number {
        switch (enc) {
            case UPacketsEncryptionType.EC:
                return data_size + (data_size % 16 === 0 ? 16 : (16 - data_size % 16));
            case UPacketsEncryptionType.RSA:
            case UPacketsEncryptionType.None:
                return data_size;
        }
    }

    /**
     * Static setter of the max UPacket Size
     * @param size New size
     */
    public static setUpacketSize(size: number): void {
        UPackets.UPacketSize = size;
    }

    /**
     * Fragment takes a Packet class, and returns an array of Buffers that are encrypted and can be sent in any order.
     *
     * @param enc Encryption to use
     * @param packet Packet class instance
     * @param ec_keys The EC Keypair to use to sign the packet when computing the raw buffers
     * @param header_enc_key The EC Public key to use for the header encryption
     * @param enc_key The RSA or EC Public key to use for the body
     */
    public static async fragment(enc: UPacketsEncryptionType, packet: Packet, ec_keys: ECKeyPair, header_enc_key: Buffer, enc_key: Buffer): Promise<Buffer[]> {

        // Check provided key depending on provided encryption type
        switch (enc) {
            case UPacketsEncryptionType.EC:
                if (enc_key.length !== 65) throw new Error('Invalid Public EC Key provided for EC Encryption');
                break;
            case UPacketsEncryptionType.RSA:
                if (enc_key.length !== 32) throw new Error('Invalid RSA Key provided for RSA Encryption');
                break;
        }

        // Encrypt header with EC cryptography
        const payload: Buffer[] = [];
        const raw: RawPackets = await packet.getRaw(ec_keys);
        let encrypted_header_size: number = 0;

        if ((encrypted_header_size = UPackets.estimatePacketSize(enc, raw.header.length)) > UPackets.UPacketSize) throw new Error('Header too big for current UPacketSize');

        const encrypted_header: Buffer = await UPackets.encryptions[UPacketsEncryptionType.EC](header_enc_key, raw.header);

        // Build UHeader for encrypted header fragment
        const uheader: UPacketHeader<Buffer> = {
            packet_id: new Buffer(9),
            index: new Buffer(4),
            size: new Buffer(2)
        };
        packet.Timestamp.toBuffer().copy(uheader.packet_id, 1);
        uheader.packet_id.writeUInt8(enc, 0);

        uheader.index.writeUInt32BE(0, 0);
        uheader.size.writeUInt16BE(encrypted_header_size, 0);

        const end_body: Buffer[] = [];

        // If body available, start process of encryption / split
        if (raw.body && raw.body.length) {

            // Encrypts body with provided encryption scheme
            raw.body = await UPackets.encryptions[enc](enc_key, raw.body);
            const packet_id: Buffer = Buffer.from(keccak256(packet.Timestamp.toBuffer().toString('hex') + packet.MasterAddress.toString('hex')), 'hex').slice(0, 8);
            const chunk_size: number = UPackets.UPacketSize - UHEADER_SIZE;

            // Chunk size needs no check as it will always be above 0, otherwise line 133 would throw
            let idx = 0;
            let packet_idx = 1;

            while (raw.body.length - idx) {
                const current_chunk_size: number = ((raw.body.length - idx) % chunk_size) || chunk_size;
                const uheader: UPacketHeader<Buffer> = {
                    packet_id: new Buffer(9),
                    index: new Buffer(4),
                    size: new Buffer(2)
                };
                packet_id.copy(uheader.packet_id, 1);
                uheader.packet_id.writeUInt8(enc, 0);
                uheader.index.writeUInt32BE(packet_idx, 0);
                uheader.size.writeUInt16BE(current_chunk_size, 0);
                end_body.push(Buffer.concat([
                    uheader.packet_id,
                    uheader.index,
                    uheader.size,
                    raw.body.slice(idx, idx + current_chunk_size)
                ]));
                idx += current_chunk_size;
                ++packet_idx;
            }
        }

        // Add the header fragment
        payload.push(Buffer.concat([
            uheader.packet_id,
            uheader.index,
            uheader.size,
            encrypted_header
        ]));
        // Add all body fragments
        for (const body_framgent of end_body) {
            payload.push(body_framgent);
        }

        return payload;
    }

    /**
     * This method takes fragments and returns a built Packet when a packet is completely reconstructed
     *
     * @param data Fragment
     * @param header_dec_key Private key to use to decrypt header
     * @param rsa_keys Rsa keys registry, mapping user addresses to RSA key buffers
     */
    public static async feed(data: Buffer, header_dec_key: Buffer, rsa_keys: any): Promise<Packet> {
        if (data.length < UHEADER_SIZE) throw new Error('Invalid Buffer size provided to feed');

        // Recover UHeader from fragment
        const uheader: UPacketHeader<number> = {
            packet_id: data.slice(0, 9),
            index: data.readUInt32BE(9),
            size: data.readUInt16BE(13)
        };

        await UPackets.update_registry(uheader, data, header_dec_key, rsa_keys);

        const packet_id = uheader.packet_id.toString('hex');
        // Now we check if we have all the pieces of the packet
        if (UPackets.is_packet_complete(packet_id)) {

            let decrypted_body: Buffer = null;
            // We check if the packet contained a body
            if (UPackets.store[packet_id].body_packet_count > 0) {

                let dec_key: Buffer;
                // Recover key depending on encryption scheme recovered from packet_id
                switch (UPackets.store[packet_id].encryption_scheme) {

                    case UPacketsEncryptionType.EC:
                        dec_key = header_dec_key;
                        break;

                    case UPacketsEncryptionType.RSA:
                        if ((dec_key = rsa_keys[UPackets.store[packet_id].master_address.toString('hex')]) === undefined) {
                            throw new Error('Trying to use RSA Encryption but no key found for target');
                        }
                        break;

                }

                // Remove all uheader, concat and decrypts body with appropriate decryption scheme
                decrypted_body = await UPackets.decryptions[UPackets.store[packet_id].encryption_scheme](dec_key, Buffer.concat([
                    ...(UPackets.store[packet_id].bodies.map((elem: Buffer): Buffer => elem.slice(UHEADER_SIZE)))
                ]));
            }

            // Recover proper rebuilder from type of packet
            const PacketClass: any = (await import(`../btbd-packets/${PacketTypeToPacketName[UPackets.store[packet_id].type]}`))[PacketTypeToPacketName[UPackets.store[packet_id].type]];

            // Returns a rebuilt instance of the Packet
            const ret_packet: Packet = PacketClass.fromRaw(
                UPackets.store[packet_id].header,
                decrypted_body,
                UPackets.store[packet_id].timestamp.toNumber()
            );
            delete UPackets.store[packet_id];
            return ret_packet;
        }
        return null;
    }

    private static async update_registry(uheader: UPacketHeader<number>, data: Buffer, header_dec_key: Buffer, rsa_keys: any): Promise<void> {
        // If index is 0, then it was a header fragment
        if (uheader.index === 0) {
            try {
                // Decrypts the header that is always encrypted with EC cryptography
                data = await UPackets.decryptions[UPacketsEncryptionType.EC](header_dec_key, data.slice(UHEADER_SIZE));

                // Recover informations from the header, like the type, the master address or the timestamp
                const type: number = data.readUInt8(0);
                const {OFFSET_MASTER_ADDRESS, SIZE_MASTER_ADDRESS, OFFSET_BODY_PACKET}: any = await import(`../btbd-packets/${PacketTypeToPacketName[type]}`);
                const master_address: Buffer = data.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
                let body_packet_count: number = null;
                if (OFFSET_BODY_PACKET) {
                    body_packet_count = data.readUInt32BE(OFFSET_BODY_PACKET);
                }
                const timestamp = uheader.packet_id.slice(1);
                const enc: number = uheader.packet_id.readUInt8(0);
                const enc_buffer: Buffer = new Buffer(1);
                enc_buffer.writeUInt8(enc, 0);
                const packet_id = Buffer.concat([enc_buffer, Buffer.from(keccak256(timestamp.toString('hex') + master_address.toString('hex')), 'hex').slice(0, 8)]).toString('hex');

                // If no entries in the static store, create new entry
                if (!UPackets.store[packet_id]) {
                    UPackets.store[packet_id] = {
                        body_packet_count: body_packet_count || 0,
                        bodies: [],
                        type: type,
                        timestamp: new Uint64BE(timestamp),
                        encryption_scheme: enc,
                        master_address
                    } as FragmentedPacket;
                }

                // If entry already exists, just add new informations
                if (!UPackets.store[packet_id].body_packet_count) {
                    UPackets.store[packet_id].body_packet_count = body_packet_count || 0;
                    UPackets.store[packet_id].type = type;
                    UPackets.store[packet_id].timestamp = new Uint64BE(timestamp);
                    UPackets.store[packet_id].encryption_scheme = enc;
                    UPackets.store[packet_id].master_address = master_address;
                }

                UPackets.store[packet_id].header = data;
                uheader.packet_id = Buffer.from(packet_id, 'hex');

            } catch (e) {
                throw new Error('Error while extracting data from presumed packet header');
            }

        } else /* If this is not a header */ {

            if (!UPackets.store[uheader.packet_id.toString('hex')]) {
                UPackets.store[uheader.packet_id.toString('hex')] = {
                    bodies: []
                } as FragmentedPacket;
            }

            UPackets.store[uheader.packet_id.toString('hex')].bodies.push(data);
            UPackets.store[uheader.packet_id.toString('hex')].bodies.sort((a: Buffer, b: Buffer): number =>
                (a.readUInt32BE(9) - b.readUInt32BE(9)));
        }

    }

    private static is_packet_complete(packet_id: string): boolean {
        return (UPackets.store[packet_id] && UPackets.store[packet_id].body_packet_count !== undefined && UPackets.store[packet_id].body_packet_count === UPackets.store[packet_id].bodies.length);
    }

}
