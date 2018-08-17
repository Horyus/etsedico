declare var describe;
declare var expect;
declare var test;

import { rsa_decrypt } from './rsa_decrypt';

const test_buff = new Buffer('test');
const test_key = new Buffer('key');

describe('rsa_decrypt', () => {

    test('dummy test', () => {
        rsa_decrypt(test_buff, test_key);
    });

});
