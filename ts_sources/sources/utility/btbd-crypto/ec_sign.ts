import { Wallet }     from 'ethers';
import { ec_address } from './ec_address';

/**
 * ECDSA Signature with the given private key.
 *
 * @param {Buffer} privateKey Private Key to use for the signature.
 * @param {Buffer} message Message to sign.
 */
export async function ec_sign(privateKey: Buffer, message: Buffer): Promise<Buffer> {
    const wallet = new Wallet(privateKey);
    return new Buffer((await wallet.signMessage(message.toString('hex'))).slice(2), 'hex');
}
