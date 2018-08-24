import * as Crypto from 'crypto';
import { ec }      from 'elliptic';

const EC = new ec('secp256k1');

/**
 * Interface defining an EC KeyPair
 */
export interface ECKeyPair {
    publicKey: Buffer;
    privateKey: Buffer;
}

/**
 * Interface defining options for the ec_gen function
 */
export interface ECGenOptions {
    privateKey?: Buffer;
    compressed?: boolean;
}

function getPublic(privateKey: Buffer, compressed?: boolean): Buffer {
    if (privateKey.length !== 32) throw new Error('Invalid Private Key');
    return new Buffer(EC.keyFromPrivate(privateKey).getPublic(compressed, 'arr'));
}

/**
 * Generates an EC KeyPair.
 *
 * @param {ECGenOptions} options Options for the KeyPair generation
 * @returns {ECKeyPair}
 */
export function ec_gen(options?: ECGenOptions): ECKeyPair {
    const privateKey: Buffer = options && options.privateKey ? options.privateKey : Crypto.randomBytes(32);
    const publicKey: Buffer = getPublic(privateKey, options && options.compressed ? options.compressed : false);
    return {
        publicKey,
        privateKey
    };
}
