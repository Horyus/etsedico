declare var describe;
declare var expect;
declare var test;

import * as Crypto         from 'crypto';
import { ModeOfOperation } from 'aes-js';
import * as RandomHex      from 'randomhex';
import { rsa_decrypt }     from './rsa_decrypt';
import { rsa_encrypt }     from './rsa_encrypt';

describe('RSA Crypto', () => {

    describe('rsa_encrypt', () => {

        test('Encrypt test message', async (done: any) => {
            const key = Crypto.randomBytes(32);
            const cipher = await rsa_encrypt(key, new Buffer('Salut'));

            if (cipher.toString() === 'Salut') return done('Should not return the same string');
            if (cipher.length !== 'Salut'.length) return done('Should keep the same size');
            done();
        });

    });

    describe('rsa_decrypt', () => {

        const decrypt_and_check = async (msg: Buffer, done: any): void => {
            const key = Crypto.randomBytes(32);

            const cipher = await rsa_encrypt(key, msg);
            const decryption = await rsa_decrypt(key, cipher);
            if (decryption.compare(msg) !== 0) return done('Invalid decryption result');
            done();
        };

        for (let idx = 0; idx < 200; ++idx) {
            const msg = RandomHex(idx + 1);
            test('Testing encrypt / decrypt with ' + msg, decrypt_and_check.bind(null, Buffer.from(msg, 'hex')));
        }

    });
});
