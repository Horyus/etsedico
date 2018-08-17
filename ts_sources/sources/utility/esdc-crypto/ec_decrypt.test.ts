declare var describe;
declare var expect;
declare var test;

import { ec_decrypt } from './ec_decrypt';

const test_buff = new Buffer('test');
const test_key = new Buffer('key');

describe('ec_decrypt', () => {

    test('dummy test', () => {
        ec_decrypt(test_buff, test_key);
    });

});
