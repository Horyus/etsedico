import { encrypt } from 'eccrypto';

export const ec_encrypt = async (publicKey: Buffer, message: Buffer): Promise<Buffer> => {
    const encryption = await encrypt(publicKey, message, {});
    return (Buffer.concat([encryption.iv, encryption.ephemPublicKey, encryption.mac, encryption.ciphertext]));
};
