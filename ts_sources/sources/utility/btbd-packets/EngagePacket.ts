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
export const OFFSET_FIRST_HALF_KEY: number = OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE;
export const SIZE_FIRST_HALF_KEY: number = 16;
export const OFFSET_FIRST_CHALLENGE: number = OFFSET_FIRST_HALF_KEY + SIZE_FIRST_HALF_KEY;
export const SIZE_FIRST_CHALLENGE: number = 16;
export const OFFSET_REMEMBER_HASH: number = OFFSET_FIRST_CHALLENGE + SIZE_FIRST_CHALLENGE;
export const SIZE_REMEMBER_HASH: number = 32;
export const OFFSET_SECURITY_SIGNATURE: ((remember: boolean) => number) = ((remember: boolean): number => remember ? OFFSET_REMEMBER_HASH + SIZE_REMEMBER_HASH : OFFSET_FIRST_CHALLENGE + SIZE_FIRST_CHALLENGE);
export const SIZE_SECURITY_SIGNATURE: number = 65;
export const HEADER_SIZE: ((remember: boolean) => number) = ((remember: boolean): number => OFFSET_SECURITY_SIGNATURE(remember) + SIZE_SECURITY_SIGNATURE);
export const SIGNATURE_PAYLOAD_SIZE: ((remember: boolean) => number) = ((remember: boolean): number => HEADER_SIZE(remember) - SIZE_SECURITY_SIGNATURE);

/**
 * Implementation of the EngagePacket Packet type
 */
export class EngagePacket extends Packet {

    public RawHeader: Buffer;
    public PublicSessionKey: Buffer;
    public SecuritySignature: Buffer;
    public FirstKeyHalf: Buffer;
    public FirstChallenge: Buffer;
    public RememberHash: Buffer;
    public RememberMode: boolean;

    constructor(master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number, first_key_half: Buffer, first_challenge: Buffer, remember_hash?: Buffer) {
        super(PacketType.EngagePacket, master_address, destination_address, master_signature, timestamp);
        if (first_key_half.length !== 16) throw new Error('Invalid First Half Key');
        if (first_challenge.length !== 16) throw new Error('Invalid First Challenge');
        if (remember_hash && remember_hash.length !== 32) throw new Error('Invalid Remember Hash');
        this.FirstKeyHalf = first_key_half;
        this.FirstChallenge = first_challenge;
        this.RememberHash = remember_hash || null;
        this.RememberMode = !!this.RememberHash;
        this.RawHeader = new Buffer(HEADER_SIZE(this.RememberMode));
    }

    /**
     * Static method to build and check if a received raw EngagePacket is valid
     *
     * @param header
     * @param body
     * @param timestamp
     */
    public static fromRaw(header: Buffer, body: Buffer, timestamp: number): EngagePacket {
        let remember_mode: boolean;

        if (header.length === HEADER_SIZE(true)) {
            remember_mode = true;
        } else if (header.length === HEADER_SIZE(false)) {
            remember_mode = false;
        } else throw new Error('Invalid Header Size');

        const type: PacketType = header.readUInt8(OFFSET_TYPE);
        const master_address: Buffer = header.slice(OFFSET_MASTER_ADDRESS, OFFSET_MASTER_ADDRESS + SIZE_MASTER_ADDRESS);
        const destination_address: Buffer = header.slice(OFFSET_DESTINATION_ADDRESS, OFFSET_DESTINATION_ADDRESS + SIZE_DESTINATION_ADDRESS);
        const session_public_key: Buffer = header.slice(OFFSET_PUBLIC_KEY, OFFSET_PUBLIC_KEY + SIZE_PUBLIC_KEY);
        const master_signature: Buffer = header.slice(OFFSET_MASTER_SIGNATURE, OFFSET_MASTER_SIGNATURE + SIZE_MASTER_SIGNATURE);
        const first_half_key: Buffer = header.slice(OFFSET_FIRST_HALF_KEY, OFFSET_FIRST_HALF_KEY + SIZE_FIRST_HALF_KEY);
        const first_challenge: Buffer = header.slice(OFFSET_FIRST_CHALLENGE, OFFSET_FIRST_CHALLENGE + SIZE_FIRST_CHALLENGE);
        const remember_hash: Buffer = remember_mode ? header.slice(OFFSET_REMEMBER_HASH, OFFSET_REMEMBER_HASH + SIZE_REMEMBER_HASH) : null;

        const security_signature: Buffer = header.slice(OFFSET_SECURITY_SIGNATURE(remember_mode), OFFSET_SECURITY_SIGNATURE(remember_mode) + SIZE_SECURITY_SIGNATURE);

        const cp: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_half_key, first_challenge, remember_hash);
        cp.Type = type;
        cp.MasterSignature = master_signature;
        cp.PublicSessionKey = session_public_key;
        cp.SecuritySignature = security_signature;
        cp.RawHeader = header;

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE(remember_mode));
        cp.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE(remember_mode));
        cp.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE(remember_mode));

        const session_address: Buffer = ec_address(cp.PublicSessionKey);

        if (cp.Type !== PacketType.EngagePacket) throw new Error('Invalid Packet Type detected');
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
        this.FirstKeyHalf.copy(this.RawHeader, OFFSET_FIRST_HALF_KEY);
        this.FirstChallenge.copy(this.RawHeader, OFFSET_FIRST_CHALLENGE);
        if (this.RememberMode) this.RememberHash.copy(this.RawHeader, OFFSET_REMEMBER_HASH);

        const sign_buffer: Buffer = new Buffer(SIGNATURE_PAYLOAD_SIZE(this.RememberMode));
        this.RawHeader.copy(sign_buffer, 0, 0, OFFSET_SECURITY_SIGNATURE(this.RememberMode));
        this.Timestamp.toBuffer().copy(sign_buffer, OFFSET_SECURITY_SIGNATURE(this.RememberMode));
        this.SecuritySignature = await ec_sign(SessionKey.privateKey, sign_buffer);
        this.SecuritySignature.copy(this.RawHeader, OFFSET_SECURITY_SIGNATURE(this.RememberMode));
        return ({header: this.RawHeader, body: null});
    }

}
