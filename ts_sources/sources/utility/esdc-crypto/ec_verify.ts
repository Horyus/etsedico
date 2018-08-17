import { Wallet } from 'ethers';
import * as Web3Utils from 'web3-utils';

export function ec_verify(message: Buffer, signature: Buffer, address: Buffer): boolean {
    try {
        const signer = Wallet.verifyMessage(message.toString(), '0x' + signature.toString('hex'), '0x' + signature.toString('hex'));
        return (Web3Utils.toChecksumAddress(signer) === Web3Utils.toChecksumAddress('0x' + address.toString('hex')));
    } catch (e) {
        return false;
    }
}
