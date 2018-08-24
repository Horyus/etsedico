declare var describe;
declare var test;
declare var expect;

import { Battlebird } from './Battlebird';

describe('Dummy Test Suite', () => {

    test('Testing Battlebird', () => {
        const instance = new Battlebird('test');
        expect(instance.getValue()).toBe('test');
    });

});
