import { Packet, PacketType, RawPackets } from './Packet';
import { ECKeyPair }                      from '../btbd-crypto/ec_gen';
import { ec_address, ec_sign, ec_verify } from '../btbd-crypto';
import { DropStatus }                     from './DropStatus';

const OFFSET_TYPE: number = 0;
const SIZE_TYPE: number = 1;
const OFFSET_MASTER_ADDRESS: number = OFFSET_TYPE + SIZE_TYPE;
const SIZE_MASTER_ADDRESS: number = 20;
const OFFSET_DESTINATION_ADDRESS: number = OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS;
const SIZE_DESTINATION_ADDRESS: number = 20;
const OFFSET_PUBLIC_KEY: number = OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS;
const SIZE_PUBLIC_KEY: number = 65;
const OFFSET_MASTER_SIGNATURE: number = OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY;
const SIZE_MASTER_SIGNATURE: number = 65;
const OFFSET_ERROR_CODE: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
const SIZE_ERROR_CODE: number = 2;
const OFFSET_SECURITY_SIGNATURE: number = OFFSET_ERROR_CODE + SIZE_ERROR_CODE;
const SIZE_SECURITY_SIGNATURE: number = 65;

const HEADER_SIZE: number = OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE;
const SIGNATURE_PAYLOAD_SIZE: number = HEADER_SIZE - SIZE_SECURITY_SIGNATURE;

/**
 * Implementation of the DropPacket Packet type
 */
export class DropPacket extends Packet {

    public ErrorCode: DropStatus;
    public RawHeader: Buffer = new Buffer(HEADER_SIZE);
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number, error_code: DropStatus) {
        super(PacketType.DropPacket, master_address, destination_address, master_signature, timestamp);
        this.ErrorCode = error_code;
    }

    /**
     * Static method to build and check if a received raw DropPacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): DropPacket {
        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE);
        const error_code: DropStatus = header.readUInt16BE(OFFSET_ERROR_CODE);
        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE, OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE);

        const dp: DropPacket = new DropPacket(master_address, destination_address, master_signature, timestamp, error_code);
        dp.Type = type;
        dp.MasterSignature = master_signature;
        dp.PublicSessionKey = session_public_key;
        dp.SecuritySignature = security_signature;
        dp.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        dp.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        dp.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);

        const session_address: Buffer = ec_address(dp.PublicSessionKey);

        if (dp.Type !== PacketType.DropPacket) throw new Error('Invalid Packet Type detected');
        if (!ec_verify(sign_buffer, dp.SecuritySignature, session_address)) throw new Error('Invalid Security Signature detected');
        if (!ec_verify(session_address, dp.MasterSignature, dp.MasterAddress)) throw new Error('Invalid Master Signature detected');

        return dp;
    }

    public async getRaw(SessionKey: ECKeyPair): Promise<RawPackets> {

        this.RawHeader.writeUInt8(this.Type, OFFSET_TYPE);
        this.MasterAddress.copy(this.RawHeader, OFFSET_MASTER_ADDRESS);
        this.DestinationAddress.copy(this.RawHeader, OFFSET_DESTINATION_ADDRESS);
        SessionKey.publicKey.copy(this.RawHeader, OFFSET_PUBLIC_KEY);
        this.PublicSessionKey = SessionKey.publicKey;
        this.MasterSignature.copy(this.RawHeader, OFFSET_MASTER_SIGNATURE);
        this.RawHeader.writeUInt16BE(this.ErrorCode, OFFSET_ERROR_CODE);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE);
        return ({header: this.RawHeader, body: null});
    }

}
