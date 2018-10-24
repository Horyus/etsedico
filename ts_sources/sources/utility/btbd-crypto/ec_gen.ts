import { Wallet }  from 'ethers';

/**
 * Interface defining an EC KeyPair
 */
export interface ECKeyPair {
    publicKey: Buffer;
    privateKey: Buffer;
}

/**
 * Generates an EC KeyPair.
 *
 * @returns {ECKeyPair}
 */
export function ec_gen(): ECKeyPair {
    const wallet = Wallet.createRandom();
    return {
        publicKey: Buffer.from((<any> wallet).signingKey.keyPair.publicKey.slice(2), 'hex'),
        privateKey: Buffer.from((<any> wallet).signingKey.keyPair.privateKey.slice(2), 'hex')
    };
}
