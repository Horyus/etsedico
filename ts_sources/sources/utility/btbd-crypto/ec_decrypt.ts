import { decrypt } from 'eccrypto';

/**
 * ECIES Decryption with the given private key.
 *
 * @param {Buffer} privateKey Private key to use for decryption.
 * @param {Buffer} payload Encrytped payload.
 */
export const ec_decrypt = async (privateKey: Buffer, payload: Buffer): Promise<Buffer> => {
    const rebuilt_payload = {
        iv: payload.slice(0, 16),
        ephemPublicKey: payload.slice(16, 16 + 65),
        mac: payload.slice(81, 81 + 32),
        ciphertext: payload.slice(113)
    };
    return decrypt(privateKey, rebuilt_payload);
};
