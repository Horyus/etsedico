import { utils }     from 'ethers';

/**
 * EC Utility method to recover Ethereum Address from EC Public Key
 *
 * @param {Buffer} publicKey Public key to derive from
 */
export const ec_address = (publicKey: Buffer): Buffer =>
    Buffer.from(utils.computeAddress('0x' + publicKey.toString('hex')).slice(2), 'hex');
