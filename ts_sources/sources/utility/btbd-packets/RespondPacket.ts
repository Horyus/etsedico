import { Packet, PacketType, RawPackets } from './Packet';
import { ECKeyPair }                      from '../btbd-crypto/ec_gen';
import { ec_address, ec_sign, ec_verify } from '../btbd-crypto';

export const OFFSET_TYPE: number = 0;
export const SIZE_TYPE: number = 1;
export const OFFSET_MASTER_ADDRESS: number = OFFSET_TYPE + SIZE_TYPE;
export const SIZE_MASTER_ADDRESS: number = 20;
export const OFFSET_DESTINATION_ADDRESS: number = OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS;
export const SIZE_DESTINATION_ADDRESS: number = 20;
export const OFFSET_PUBLIC_KEY: number = OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS;
export const SIZE_PUBLIC_KEY: number = 65;
export const OFFSET_MASTER_SIGNATURE: number = OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY;
export const SIZE_MASTER_SIGNATURE: number = 65;
export const OFFSET_SECOND_HALF_KEY: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
export const SIZE_SECOND_HALF_KEY: number = 16;
export const OFFSET_SECOND_CHALLENGE: number = OFFSET_SECOND_HALF_KEY + SIZE_SECOND_HALF_KEY;
export const SIZE_SECOND_CHALLENGE: number = 16;
export const OFFSET_ENCRYPTED_FIRST_CHALLENGE: number = OFFSET_SECOND_CHALLENGE + SIZE_SECOND_CHALLENGE;
export const SIZE_ENCRYPTED_FIRST_CHALLENGE: number = 16;
export const OFFSET_SECURITY_SIGNATURE: number = OFFSET_ENCRYPTED_FIRST_CHALLENGE + SIZE_ENCRYPTED_FIRST_CHALLENGE;
export const SIZE_SECURITY_SIGNATURE: number = 65;
export const HEADER_SIZE: number = OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE;
export const SIGNATURE_PAYLOAD_SIZE: number = HEADER_SIZE - SIZE_SECURITY_SIGNATURE;

/**
 * Implementation of the RespondPacket Packet type
 */
export class RespondPacket extends Packet {

    public RawHeader: Buffer = new Buffer(HEADER_SIZE);
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;
    public EncryptedFirstChallenge: Buffer;
    public SecondHalfKey: Buffer;
    public SecondChallenge: Buffer;

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number, second_half_key: Buffer, second_challenge: Buffer, encrypted_first_challenge: Buffer) {
        super(PacketType.RespondPacket, master_address, destination_address, master_signature, timestamp);
        if (second_half_key.length !== 16) throw new Error('Invalid Second Half Key');
        if (second_challenge.length !== 16) throw new Error('Invalid Second Challenge');
        if (encrypted_first_challenge.length !== 16) throw new Error('Invalid Encrypted First Challenge');
        this.SecondHalfKey = second_half_key;
        this.SecondChallenge = second_challenge;
        this.EncryptedFirstChallenge = encrypted_first_challenge;
    }

    /**
     * Static method to build and check if a received raw RespondPacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): RespondPacket {

        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE);
        const second_half_key: Buffer = header.slice(OFFSET_SECOND_HALF_KEY, OFFSET_SECOND_HALF_KEY + SIZE_SECOND_HALF_KEY);
        const second_challenge: Buffer = header.slice(OFFSET_SECOND_CHALLENGE, OFFSET_SECOND_CHALLENGE + SIZE_SECOND_CHALLENGE);
        const encrypted_first_challenge: Buffer = header.slice(OFFSET_ENCRYPTED_FIRST_CHALLENGE, OFFSET_ENCRYPTED_FIRST_CHALLENGE + SIZE_ENCRYPTED_FIRST_CHALLENGE);
        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE, OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE);

        const cp: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_half_key, second_challenge, encrypted_first_challenge);
        cp.Type = type;
        cp.MasterSignature = master_signature;
        cp.PublicSessionKey = session_public_key;
        cp.SecuritySignature = security_signature;
        cp.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        cp.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        cp.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);

        const session_address: Buffer = ec_address(cp.PublicSessionKey);

        if (cp.Type !== PacketType.RespondPacket) throw new Error('Invalid Packet Type detected');
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
        this.SecondHalfKey.copy(this.RawHeader, OFFSET_SECOND_HALF_KEY);
        this.SecondChallenge.copy(this.RawHeader, OFFSET_SECOND_CHALLENGE);
        this.EncryptedFirstChallenge.copy(this.RawHeader, OFFSET_ENCRYPTED_FIRST_CHALLENGE);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE);
        return ({header: this.RawHeader, body: null});
    }

}
