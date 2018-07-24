declare var describe;
declare var test;
declare var expect;

import { MiddlewareChain } from './MiddlewareChain';

describe('Dummy Test Suite', () => {

    test('Dummy Testing MiddlewareChain', () => {
        const mdwc = new MiddlewareChain();
        expect(mdwc.dummy()).toBe('test');
    })

});
