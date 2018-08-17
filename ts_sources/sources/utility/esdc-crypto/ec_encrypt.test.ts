declare var describe;
declare var expect;
declare var test;

import { ec_encrypt } from './ec_encrypt';

const test_buff = new Buffer('test');
const test_key = new Buffer('key');

describe('ec_encrypt', () => {

    test('dummy test', () => {
        ec_encrypt(test_buff, test_key);
    });

});
