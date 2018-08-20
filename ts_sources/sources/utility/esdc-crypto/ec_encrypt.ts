import { encrypt } from 'eccrypto';

/**
 * ECIES Encryption for the given public key.
 *
 * @param {Buffer} publicKey The public key for the encryption.
 * @param {Buffer} message The message to encrypt.
 */
export const ec_encrypt = async (publicKey: Buffer, message: Buffer): Promise<Buffer> => {
    const encryption = await encrypt(publicKey, message, {});
    return (Buffer.concat([encryption.iv, encryption.ephemPublicKey, encryption.mac, encryption.ciphertext]));
};
