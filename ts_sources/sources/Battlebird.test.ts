import { ec_address, ec_gen, ec_sign } from './utility/btbd-crypto';

declare var describe;
declare var test;
declare var expect;

import { Battlebird } from './Battlebird';
import { ECKeyPair }  from './utility/btbd-crypto/ec_gen';
import * as Crypto    from 'crypto';
import { keccak256 }    from 'js-sha3';

describe('Battlebird test suite', () => {

    test('Building valid instance, calling send manually', async (done: any): Promise<void> => {

        const ec_keypair: ECKeyPair = ec_gen();
        const master_keypair: ECKeyPair = ec_gen();
        const signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(ec_keypair.publicKey));

        const instance = new Battlebird(ec_keypair, signature, ec_address(master_keypair.publicKey));
        await instance.start();
        const res = await instance.Bush.send({data: [Buffer.from('test')], ip: '127.0.0.1', port: 3000});

        done();
    });

    test('Building valid instance, calling connect', async (done: any): Promise<void> => {

        const ec_keypair: ECKeyPair = ec_gen();
        const master_keypair: ECKeyPair = ec_gen();
        const signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(ec_keypair.publicKey));

        const instance = new Battlebird(ec_keypair, signature, ec_address(master_keypair.publicKey));
        await instance.start();
        const res = await instance.Bush.methods.connect('127.0.0.1', 3000, ec_address(master_keypair.publicKey), ec_keypair.publicKey);

        // ADD CHECKS ON RES
        done();
    });

    test('Building invalid instance, calling connect', async (done: any): Promise<void> => {

        const ec_keypair: ECKeyPair = ec_gen();
        const master_keypair: ECKeyPair = ec_gen();
        const signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(ec_keypair.publicKey));

        const instance = new Battlebird(ec_keypair, signature, ec_address(master_keypair.publicKey));
        await instance.start();
        try {
            const res = await instance.Bush.methods.connect('127.0.0.1', 3000, ec_address(master_keypair.publicKey), ec_keypair.publicKey.slice(1));
            done(new Error('Should throw with invalid public key'));
        } catch (e) {
            done();
        }
    });

    test('Building valid instance, calling connect with remember_hash', async (done: any): Promise<void> => {

        const ec_keypair: ECKeyPair = ec_gen();
        const master_keypair: ECKeyPair = ec_gen();
        const signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(ec_keypair.publicKey));
        const rsa_key: Buffer = Crypto.randomBytes(32);
        const rsa_key_hash: Buffer = Buffer.from(keccak256(rsa_key.toString('hex')), 'hex');

        const instance = new Battlebird(ec_keypair, signature, ec_address(master_keypair.publicKey));
        await instance.start();
        let res = await instance.Bush.methods.connect('127.0.0.1', 3000, ec_address(master_keypair.publicKey), ec_keypair.publicKey);
        instance.Bush.setEnv(`connect.connections.${ec_address(master_keypair.publicKey).toString('hex')}.rsa_key_hash`, rsa_key_hash);
        res = await instance.Bush.methods.connect('127.0.0.1', 3000, ec_address(master_keypair.publicKey), ec_keypair.publicKey);

        // ADD CHECKS ON RES
        done();
    });

    test('Building valid instance, calling connect, setting user status', async (done: any): Promise<void> => {

        const ec_keypair: ECKeyPair = ec_gen();
        const master_keypair: ECKeyPair = ec_gen();
        const signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(ec_keypair.publicKey));

        const instance = new Battlebird(ec_keypair, signature, ec_address(master_keypair.publicKey));
        await instance.start();
        instance.Bush.setEnv(`connect.connections.${ec_address(master_keypair.publicKey).toString('hex')}.status`, 1);
        try {
            const res = await instance.Bush.methods.connect('127.0.0.1', 3000, ec_address(master_keypair.publicKey), ec_keypair.publicKey);
            done(new Error('Should throw on invalid user status'));
        } catch (e) {
            done();
        }
    });
});
