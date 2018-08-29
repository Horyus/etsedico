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

        test('Encrypt test message', () => {
            const key = Crypto.randomBytes(32);
            const cipher = rsa_encrypt(key, new Buffer('Salut'));

            expect(cipher.toString()).not.toBe('Salut');
            expect(cipher.length).toBe('Salut'.length);
        });

    });

    describe('rsa_decrypt', () => {

        const decrypt_and_check = (msg: Buffer): void => {
            const key = Crypto.randomBytes(32);

            const cipher = rsa_encrypt(key, msg);
            const decryption = rsa_decrypt(key, cipher);
            expect(decryption.compare(msg)).toBe(0);
        };

        for (let idx = 0; idx < 200; ++idx) {
            const msg = RandomHex(idx + 1);
            test('Testing encrypt / decrypt with ' + msg, decrypt_and_check.bind(null, new Buffer(msg)));
        }

    });
});
