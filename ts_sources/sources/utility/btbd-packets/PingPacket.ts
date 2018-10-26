import { Packet, PacketType, RawPackets } from './Packet';
import { ECKeyPair }                      from '../btbd-crypto/ec_gen';
import { ec_address, ec_sign, ec_verify } from '../btbd-crypto';

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
const OFFSET_SECURITY_SIGNATURE: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
const SIZE_SECURITY_SIGNATURE: number = 65;

const HEADER_SIZE: number = OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE;
const SIGNATURE_PAYLOAD_SIZE: number = HEADER_SIZE - SIZE_SECURITY_SIGNATURE;

/**
 * Implementation of the PingPacket Packet type
 */
export class PingPacket extends Packet {

    public RawHeader: Buffer = new Buffer(HEADER_SIZE);
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number) {
        super(PacketType.PingPacket, master_address, destination_address, master_signature, timestamp);
    }

    /**
     * Static method to build and check if a received raw PingPacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): PingPacket {
        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_SECURITY_SIGNATURE);
        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE, OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE);

        const cp: PingPacket = new PingPacket(master_address, destination_address, master_signature, timestamp);
        cp.Type = type;
        cp.MasterSignature = master_signature;
        cp.PublicSessionKey = session_public_key;
        cp.SecuritySignature = security_signature;
        cp.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        cp.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        cp.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);

        const session_address: Buffer = ec_address(cp.PublicSessionKey);

        if (cp.Type !== PacketType.PingPacket) throw new Error('Invalid Packet Type detected');
        if (!ec_verify(sign_buffer, cp.SecuritySignature, session_address)) throw new Error('Invalid Security Signature detected');
        if (!ec_verify(session_address, cp.MasterSignature, cp.MasterAddress)) throw new Error('Invalid Master Signature detected');

        return cp;
    }

    public async getRaw(SessionKey: ECKeyPair): Promise<RawPackets> {

        this.RawHeader.writeUInt8(this.Type, OFFSET_TYPE);
        this.MasterAddress.copy(this.RawHeader, OFFSET_MASTER_ADDRESS);
        this.DestinationAddress.copy(this.RawHeader, OFFSET_DESTINATION_ADDRESS);
        SessionKey.publicKey.copy(this.RawHeader, OFFSET_PUBLIC_KEY);
        this.PublicSessionKey = SessionKey.publicKey;
        this.MasterSignature.copy(this.RawHeader, OFFSET_MASTER_SIGNATURE);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE);
        return ({header: this.RawHeader, body: null});
    }

}
