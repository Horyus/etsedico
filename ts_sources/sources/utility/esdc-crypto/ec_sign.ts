import { Wallet } from 'ethers';

/**
 * ECDSA Signature with the given private key.
 *
 * @param {Buffer} privateKey Private Key to use for the signature.
 * @param {Buffer} message Message to sign.
 */
export function ec_sign(privateKey: Buffer, message: Buffer): Buffer {
    const wallet = new Wallet(privateKey);
    return new Buffer(wallet.signMessage(message).slice(2), 'hex');
}
