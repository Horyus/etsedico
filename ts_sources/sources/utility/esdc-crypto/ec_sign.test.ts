declare var describe;
declare var expect;
declare var test;

import { ec_sign } from './ec_sign';

const test_buff = new Buffer('test');
const test_key = new Buffer('key');

describe('ec_sign', () => {

    test('dummy test', () => {
        ec_sign(test_buff, test_key);
    });

});
