import { Packet, PacketType, RawPackets }   from './Packet';
import { ECKeyPair }                        from '../btbd-crypto/ec_gen';
import { ec_address, ec_sign, ec_verify }   from '../btbd-crypto';
import { UPackets, UPacketsEncryptionType } from '../btbd-upackets/UPackets';

const OFFSET_TYPE: number = 0;
const SIZE_TYPE: number = 1;
const OFFSET_PACKET_ID: number = OFFSET_TYPE + SIZE_TYPE;
const SIZE_PACKET_ID: number = 8;
const OFFSET_MASTER_ADDRESS: number = OFFSET_PACKET_ID + SIZE_PACKET_ID;
const SIZE_MASTER_ADDRESS: number = 20;
const OFFSET_DESTINATION_ADDRESS: number = OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS;
const SIZE_DESTINATION_ADDRESS: number = 20;
const OFFSET_PUBLIC_KEY: number = OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS;
const SIZE_PUBLIC_KEY: number = 65;
const OFFSET_MASTER_SIGNATURE: number = OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY;
const SIZE_MASTER_SIGNATURE: number = 65;
const OFFSET_MISS_SIZE: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
const SIZE_MISS_SIZE: number = 2;
const OFFSET_MISS: number = OFFSET_MISS_SIZE + SIZE_MISS_SIZE;
const OFFSET_SECURITY_SIGNATURE: ((miss_field_size: number) => number) = ((miss_field_size: number): number => OFFSET_MISS + miss_field_size);
const SIZE_SECURITY_SIGNATURE: number = 65;

const HEADER_SIZE: ((miss_field_size: number) => number) = ((miss_field_size: number): number => OFFSET_SECURITY_SIGNATURE(miss_field_size) + SIZE_SECURITY_SIGNATURE);
const SIGNATURE_PAYLOAD_SIZE: ((miss_field_size: number) => number) = ((miss_field_size: number): number => HEADER_SIZE(miss_field_size) - SIZE_SECURITY_SIGNATURE);

export interface MissUniqueElement {
    packet_idx: number;
}

export interface MissRange {
    begin: number;
    end: number;
}

/**
 * Implementation of the ConfirmationPacket Packet type
 */
export class LossPacket extends Packet {

    public PacketID: Buffer;
    public RawHeader: Buffer;
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;
    public Miss: (MissUniqueElement | MissRange)[];

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number, packet_id: Buffer, miss: (MissUniqueElement | MissRange)[]) {
        super(PacketType.ConfirmationPacket, master_address, destination_address, master_signature, timestamp);
        if (packet_id.length !== 8) throw new Error('Invalid Packet ID');
        this.PacketID = packet_id;
        this.Miss = miss;
    }

    public static recoverMissElements(original_miss_field: Buffer): (MissUniqueElement | MissRange)[] {
        const ret: (MissUniqueElement | MissRange)[] = [];
        let miss_field: Buffer = new Buffer(original_miss_field.length);
        original_miss_field.copy(miss_field, 0);

        while (miss_field.length) {
            switch (miss_field[0]) {
                case 0:

                    const element_count: number = miss_field.readUInt32BE(1);
                    if (miss_field.length < (element_count * 4) + 5) throw new Error('Invalid Miss field format: not enough size for unique field');
                    for (let idx = 0; idx < element_count; ++idx) {
                        ret.push({
                            packet_idx: miss_field.readUInt32BE((idx * 4) + 5)
                        });
                    }
                    miss_field = miss_field.slice((element_count * 4) + 5);
                    break;

                case 1:

                    if (miss_field.length < 9) throw new Error('Invalid Miss field format: not enought space for range field');
                    ret.push({
                        begin: miss_field.readUInt32BE(1),
                        end: miss_field.readUInt32BE(5)
                    });
                    miss_field = miss_field.slice(9);
                    break;

                default:
                    throw new Error('Invalid Miss field format: invalid field type');
            }
        }

        return ret;
    }

    /**
     * Static method to build and check if a received raw ConfirmationPacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): LossPacket {
        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const packet_id: Buffer = header.slice(OFFSET_PACKET_ID, OFFSET_PACKET_ID + SIZE_PACKET_ID);
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE);
        const miss_size: number = header.readUInt16BE(OFFSET_MISS_SIZE);
        const miss_field: Buffer = header.slice(OFFSET_MISS, OFFSET_MISS + miss_size);
        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE(miss_size), OFFSET_SECURITY_SIGNATURE(miss_size) + SIZE_SECURITY_SIGNATURE);

        const cp: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, LossPacket.recoverMissElements(miss_field));
        cp.Type = type;
        cp.MasterSignature = master_signature;
        cp.PublicSessionKey = session_public_key;
        cp.SecuritySignature = security_signature;
        cp.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE(miss_size));
        cp.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE(miss_size));
        cp.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE(miss_size));

        const session_address: Buffer = ec_address(cp.PublicSessionKey);

        if (cp.Type !== PacketType.ConfirmationPacket) throw new Error('Invalid Packet Type detected');
        if (!ec_verify(sign_buffer, cp.SecuritySignature, session_address)) throw new Error('Invalid Security Signature detected');
        if (!ec_verify(session_address, cp.MasterSignature, cp.MasterAddress)) throw new Error('Invalid Master Signature detected');

        return cp;
    }

    public async getRaw(SessionKey: ECKeyPair): Promise<RawPackets> {

        const miss_field: Buffer = this.genMissField();
        const miss_size: number = miss_field.length;

        const total_size: number = UPackets.estimatePacketSize(UPacketsEncryptionType.RSA, HEADER_SIZE(miss_size));
        if (total_size > UPackets.UPacketSize) throw new Error('Miss field too big, you need to split');

        this.RawHeader = new Buffer(HEADER_SIZE(miss_size));

        this.RawHeader.writeUInt8(this.Type, OFFSET_TYPE);
        this.PacketID.copy(this.RawHeader, OFFSET_PACKET_ID);
        this.MasterAddress.copy(this.RawHeader, OFFSET_MASTER_ADDRESS);
        this.DestinationAddress.copy(this.RawHeader, OFFSET_DESTINATION_ADDRESS);
        SessionKey.publicKey.copy(this.RawHeader, OFFSET_PUBLIC_KEY);
        this.PublicSessionKey = SessionKey.publicKey;
        this.MasterSignature.copy(this.RawHeader, OFFSET_MASTER_SIGNATURE);
        this.RawHeader.writeUInt16BE(miss_size, OFFSET_MISS_SIZE);
        miss_field.copy(this.RawHeader, OFFSET_MISS);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE(miss_size));
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE(miss_size));
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE(miss_size));
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE(miss_field.length));
        return ({header: this.RawHeader, body: null});
    }

    private genMissField(): Buffer {

        const regrouped_uniques: MissUniqueElement[] = [];
        let result: Buffer = Buffer.from('');

        for (const elem of this.Miss) {
            if ((<MissRange> elem).begin !== undefined && (<MissRange> elem).end !== undefined) {
                const range_tmp_buffer: Buffer = new Buffer(9);
                range_tmp_buffer.writeUInt8(1, 0);
                range_tmp_buffer.writeInt32BE((<MissRange> elem).begin, 1);
                range_tmp_buffer.writeInt32BE((<MissRange> elem).end, 5);
                result = Buffer.concat([result, range_tmp_buffer]);
            } else if ((<MissUniqueElement> elem).packet_idx !== undefined) {
                regrouped_uniques.push(elem as MissUniqueElement);
            } else throw new Error('Invalid element in miss array');
        }

        if (regrouped_uniques.length) {
            const unique_tmp_buffer: Buffer = new Buffer(5 + regrouped_uniques.length * 4);
            unique_tmp_buffer.writeUInt8(0, 0);
            unique_tmp_buffer.writeUInt32BE(regrouped_uniques.length, 1);
            let idx: number = 5;

            for (const elem of regrouped_uniques) {
                unique_tmp_buffer.writeUInt32BE(elem.packet_idx, idx);
                idx += 4;
            }

            result = Buffer.concat([result, unique_tmp_buffer]);
        }

        return result;
    }

}
