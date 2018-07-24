declare var describe;
declare var test;
declare var expect;

import {Middleware} from './middleware';

describe('Dummy Test Suite', () => {

    test('Dummy Testing Middleware', () => {
        const mdw = new Middleware();
        expect(mdw.dummy()).toBe('test');
    })

});
