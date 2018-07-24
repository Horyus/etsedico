declare var describe;
declare var test;
declare var expect;

import { Bush } from './bush';

describe('Dummy Test Suite', () => {

    test('Dummy Testing Bush', () => {
        const bush = new Bush();
        expect(bush.dummy()).toBe('test');
    })

});
