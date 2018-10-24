import { utils }     from 'ethers';
import * as Web3Utils from 'web3-utils';

/**
 * ECDSA Signature Verification for the given Eth Address.
 *
 * @param {Buffer} message Original message that was signed.
 * @param {Buffer} signature Signature to verify.
 * @param {Buffer} address Address that made the signature.
 * @returns {boolean} False is returned if the given address does not match.
 */
export function ec_verify(message: Buffer, signature: Buffer, address: Buffer): boolean {
    const signer = utils.verifyMessage(message.toString('hex'), '0x' + signature.toString('hex'));
    return (Web3Utils.toChecksumAddress(signer) === Web3Utils.toChecksumAddress('0x' + address.toString('hex')));
}
