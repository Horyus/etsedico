import { Wallet } from 'ethers';

export function ec_sign(privateKey: Buffer, message: Buffer): Buffer {
   const wallet = new Wallet(privateKey);
   return new Buffer(wallet.signMessage(message).slice(2), 'hex');
}
