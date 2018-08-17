declare var describe;
declare var expect;
declare var test;

import { rsa_encrypt } from './rsa_encrypt';

const test_buff = new Buffer('test');
const test_key = new Buffer('key');

describe('rsa_encrypt', () => {

    test('dummy test', () => {
        rsa_encrypt(test_buff, test_key);
    });

});
