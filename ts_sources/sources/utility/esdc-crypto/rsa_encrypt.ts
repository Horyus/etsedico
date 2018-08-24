import { ModeOfOperation, utils, Counter } from 'aes-js';

/**
 * RSA Encryption with the given Key.
 *
 * @param {Buffer} key Valid RSA Key.
 * @param {Buffer} message Message to encrypt.
 */
export function rsa_encrypt(key: Buffer, message: Buffer): Buffer {
    const instance = new ModeOfOperation.ctr(Array.prototype.slice.call(key, 0), new Counter(5));
    return new Buffer(instance.encrypt(utils.utf8.toBytes(message.toString())));
}
