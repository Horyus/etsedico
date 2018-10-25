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
const OFFSET_ENCRYPTED_SECOND_CHALLENGE: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
const SIZE_ENCRYPTED_SECOND_CHALLENGE: number = 16;

const OFFSET_SECURITY_SIGNATURE: number = OFFSET_ENCRYPTED_SECOND_CHALLENGE + SIZE_ENCRYPTED_SECOND_CHALLENGE;
const SIZE_SECURITY_SIGNATURE: number = 65;

const HEADER_SIZE: number = OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE;
const SIGNATURE_PAYLOAD_SIZE: number = HEADER_SIZE - SIZE_SECURITY_SIGNATURE;

/**
 * Implementation of the AgreePacket Packet type
 */
export class AgreePacket extends Packet {

    public RawHeader: Buffer = new Buffer(HEADER_SIZE);
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;
    public EncryptedSecondChallenge: Buffer;

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number, encrypted_second_challenge: Buffer) {
        super(PacketType.AgreePacket, master_address, destination_address, master_signature, timestamp);
        if (encrypted_second_challenge.length !== 16) throw new Error('Invalid Second Challenge');
        this.EncryptedSecondChallenge = encrypted_second_challenge;
    }

    /**
     * Static method to build and check if a received raw AgreePacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): AgreePacket {

        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE);
        const encrypted_second_challenge: Buffer = header.slice(OFFSET_ENCRYPTED_SECOND_CHALLENGE, OFFSET_ENCRYPTED_SECOND_CHALLENGE + SIZE_ENCRYPTED_SECOND_CHALLENGE);
        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE, OFFSET_SECURITY_SIGNATURE + SIZE_SECURITY_SIGNATURE);

        const ap: AgreePacket = new AgreePacket(master_address, destination_address, master_signature, timestamp, encrypted_second_challenge);
        ap.Type = type;
        ap.MasterSignature = master_signature;
        ap.PublicSessionKey = session_public_key;
        ap.SecuritySignature = security_signature;
        ap.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        ap.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        ap.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);

        const session_address: Buffer = ec_address(ap.PublicSessionKey);

        if (ap.Type !== PacketType.AgreePacket) throw new Error('Invalid Packet Type detected');
        if (!ec_verify(sign_buffer, ap.SecuritySignature, session_address)) throw new Error('Invalid Security Signature detected');
        if (!ec_verify(session_address, ap.MasterSignature, ap.MasterAddress)) throw new Error('Invalid Master Signature detected');

        return ap;
    }

    public async getRaw(SessionKey: ECKeyPair): Promise<RawPackets> {

        this.RawHeader.writeUInt8(this.Type, OFFSET_TYPE);
        this.MasterAddress.copy(this.RawHeader, OFFSET_MASTER_ADDRESS);
        this.DestinationAddress.copy(this.RawHeader, OFFSET_DESTINATION_ADDRESS);
        SessionKey.publicKey.copy(this.RawHeader, OFFSET_PUBLIC_KEY);
        this.PublicSessionKey = SessionKey.publicKey;
        this.MasterSignature.copy(this.RawHeader, OFFSET_MASTER_SIGNATURE);
        this.EncryptedSecondChallenge.copy(this.RawHeader, OFFSET_ENCRYPTED_SECOND_CHALLENGE);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE);
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE);
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE);
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE);
        return ({header: this.RawHeader, body: null});
    }

}
