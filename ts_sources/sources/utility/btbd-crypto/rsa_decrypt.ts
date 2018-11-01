import { ModeOfOperation, utils, Counter } from 'aes-js';

/**
 * RSA Decryption with the given Key.
 *
 * @param {Buffer} key Valid RSA Key.
 * @param {Buffer} cipher The ciphered payload.
 */
export async function rsa_decrypt(key: Buffer, cipher: Buffer): Promise<Buffer> {
    const instance = new ModeOfOperation.ctr(Array.prototype.slice.call(key, 0), new Counter(5));
    return new Buffer(instance.decrypt(Array.prototype.slice.call(cipher, 0)));
}
