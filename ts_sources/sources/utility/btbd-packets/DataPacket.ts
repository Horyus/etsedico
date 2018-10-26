import { Packet, PacketType, RawPackets }   from './Packet';
import { ECKeyPair }                        from '../btbd-crypto/ec_gen';
import { keccak256 }                        from 'js-sha3';
import { ec_address, ec_sign, ec_verify }   from '../btbd-crypto';
import { UPackets, UPacketsEncryptionType } from '../btbd-upackets/UPackets';

const OFFSET_TYPE: number = 0;
const SIZE_TYPE: number = 1;
const OFFSET_METHOD: number = OFFSET_TYPE + SIZE_TYPE;
const SIZE_METHOD: number = 32;
const OFFSET_MASTER_ADDRESS: number = OFFSET_METHOD + SIZE_METHOD;
const SIZE_MASTER_ADDRESS: number = 20;
const OFFSET_DESTINATION_ADDRESS: number = OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS;
const SIZE_DESTINATION_ADDRESS: number = 20;
const OFFSET_PUBLIC_KEY: number = OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS;
const SIZE_PUBLIC_KEY: number = 65;
const OFFSET_MASTER_SIGNATURE: number = OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY;
const SIZE_MASTER_SIGNATURE: number = 65;
const OFFSET_BODY_CHECKSUM: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
const SIZE_BODY_CHECKSUM: number = 32;
const OFFSET_BODY_PACKET: number = OFFSET_BODY_CHECKSUM + SIZE_BODY_CHECKSUM;
const SIZE_BODY_PACKET: number = 4;
const OFFSET_SECURITY_SIGNATURE: number = OFFSET_BODY_PACKET + SIZE_BODY_PACKET;
const SIZE_SECURITY_SIGNATURE: number = 65;

const HEADER_SIZE: number = OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE;
const SIGNATURE_PAYLOAD_SIZE: number = HEADER_SIZE - SIZE_SECURITY_SIGNATURE;

/**
 * Implementation of the ConfirmationPacket Packet type
 */
export class DataPacket extends Packet {

    public Data: Buffer;
    public DataChecksum: Buffer;
    public Method: string;
    public RawHeader: Buffer = new Buffer(HEADER_SIZE);
    public PacketCount: number;
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number, data: Buffer, method: string) {
        super(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);
        if (method.length > 32) throw new Error('Method name should not exceed 32 characters');
        this.Data = data;
        this.Method = method;
        this.DataChecksum = Buffer.from(keccak256(this.Data), 'hex');
        this.PacketCount = UPackets.estimatePacketCount(UPacketsEncryptionType.RSA, this.Data, UPackets.UPacketSize);
    }

    /**
     * Static method to build and check if a received raw ConfirmationPacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): DataPacket {
        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const method: string = header.slice(OFFSET_METHOD, SIZE_METHOD).toString().replace(/\0/g, '');
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE);
        const data_checksum: Buffer = header.slice(OFFSET_BODY_CHECKSUM, OFFSET_BODY_CHECKSUM + SIZE_BODY_CHECKSUM);
        const packet_count: number = header.readUInt32BE(OFFSET_BODY_PACKET);
        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE, OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE);

        const dp: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, body, method);
        dp.Type = type;
        dp.MasterSignature = master_signature;
        dp.DataChecksum = data_checksum;
        dp.PacketCount = packet_count;
        dp.PublicSessionKey = session_public_key;
        dp.SecuritySignature = security_signature;
        dp.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        dp.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        dp.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);

        const session_address: Buffer = ec_address(dp.PublicSessionKey);

        if (dp.Type !== PacketType.DataPacket) throw new Error('Invalid Packet Type detected');
        if (Buffer.from(keccak256(body), 'hex').compare(dp.DataChecksum)) throw new Error('Invalid Data Checksum detected');
        if (!ec_verify(sign_buffer, dp.SecuritySignature, session_address)) throw new Error('Invalid Security Signature detected');
        if (!ec_verify(session_address, dp.MasterSignature, dp.MasterAddress)) throw new Error('Invalid Master Signature detected');

        return dp;
    }

    public async getRaw(SessionKey: ECKeyPair): Promise<RawPackets> {

        this.RawHeader.writeUInt8(this.Type, OFFSET_TYPE);
        this.RawHeader.write(this.Method, OFFSET_METHOD, 32);
        this.MasterAddress.copy(this.RawHeader, OFFSET_MASTER_ADDRESS);
        this.DestinationAddress.copy(this.RawHeader, OFFSET_DESTINATION_ADDRESS);
        SessionKey.publicKey.copy(this.RawHeader, OFFSET_PUBLIC_KEY);
        this.PublicSessionKey = SessionKey.publicKey;
        this.MasterSignature.copy(this.RawHeader, OFFSET_MASTER_SIGNATURE);
        this.DataChecksum.copy(this.RawHeader, OFFSET_BODY_CHECKSUM);
        this.RawHeader.writeUInt32BE(this.PacketCount, OFFSET_BODY_PACKET);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE);
        return ({header: this.RawHeader, body: this.Data});
    }

}
