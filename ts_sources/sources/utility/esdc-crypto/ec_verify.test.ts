declare var describe;
declare var expect;
declare var test;

import { ec_verify } from './ec_verify';

const test_buff = new Buffer('test');
const test_key = new Buffer('key');

describe('ec_verify', () => {

    test('dummy test', () => {
        ec_verify(test_buff, test_key);
    });

});
