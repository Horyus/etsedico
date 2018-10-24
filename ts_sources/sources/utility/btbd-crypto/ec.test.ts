import { ec_address } from './ec_address';

declare var describe;
declare var expect;
declare var test;

import { Wallet }     from 'ethers';
import * as Crypto    from 'crypto';
import { ec_sign }    from './ec_sign';
import { ec_verify }  from './ec_verify';
import { ec_encrypt } from './ec_encrypt';
import { ec_gen }     from './ec_gen';
import { ec_decrypt } from './ec_decrypt';

type Done = (arg?: any) => void;

describe('EC Crypto', () => {

    describe('ec_gen', () => {

        test('Generate KeyPair', () => {
            const keyPair = ec_gen();
            expect(keyPair.privateKey.length).toBe(32);
            expect(keyPair.publicKey.length).toBe(65);
        });

    });

    describe('ec_address', () => {

        test('Generate and compare', () => {
            const keyPair = Wallet.createRandom();

            const address = ec_address(Buffer.from((<any> keyPair).signingKey.keyPair.publicKey.slice(2), 'hex'));

            expect(address.compare(Buffer.from(keyPair.address.slice(2), 'hex'))).toBe(0);

        });

    });

    describe('ec_encrypt', () => {

        // @ts-ignore
        test('Encrypt', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();

            if ((await ec_encrypt(keypair.publicKey, message)).length !== 129) return done(new Error('Invalid Encryption payload'));

            return done();
        });

    });

    describe('ec_decrypt', () => {

        // @ts-ignore
        test('Decrypt', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();
            let encryption;

            if ((encryption = (await ec_encrypt(keypair.publicKey, message))).length !== 129) return done(new Error('Invalid Encryption payload'));

            if ((await ec_decrypt(keypair.privateKey, encryption)).compare(message) !== 0) return done(new Error('Invalid Decryption payload'));

            return done();
        });

    });

    describe('ec_sign', () => {

        // @ts-ignore
        test('Sign', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();
            const signature = await ec_sign(keypair.privateKey, message);
            if (signature.length !== 65) return done(new Error('Invalid signature length'));
            done();
        });

    });

    describe('ec_verify', () => {

        // @ts-ignore
        test('Verify - valid scenario', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();
            const wallet = new Wallet(keypair.privateKey);
            const signature = await ec_sign(keypair.privateKey, message);

            if (!ec_verify(message, signature, new Buffer(wallet.address.slice(2), 'hex'))) return done(new Error('Signature should be valid'));
            done();
        });

        // @ts-ignore
        test('Verify - invalid message', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();
            const wallet = new Wallet(keypair.privateKey);
            const signature = await ec_sign(keypair.privateKey, message);

            if (ec_verify(new Buffer('Testing ... ... '), signature, new Buffer(wallet.address.slice(2), 'hex'))) return done(new Error('Signature should be invalid'));
            done();
        });

        // @ts-ignore
        test('Verify - invalid signer', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();
            const wallet = new Wallet(keypair.privateKey);
            const signature = await ec_sign(keypair.privateKey, message);

            if (ec_verify(message, signature, new Buffer('4bC0898D2c2c0Fe9929C42814F5B128062a35D25', 'hex'))) return done(new Error('Signature should be invalid'));
            done();
        });

        // @ts-ignore
        test('Verify - invalid signature', async (done: Done) => {
            const message = new Buffer('Testing ... ');
            const keypair = ec_gen();
            const wallet = new Wallet(keypair.privateKey);

            try {
                ec_verify(message, new Buffer('eeff', 'hex'), new Buffer(wallet.address.slice(2), 'hex'));
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

    });

});
