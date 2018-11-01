declare var describe;
declare var test;
declare var expect;

import { Battlebird } from './Battlebird';

describe('Battlebird test suite', () => {

    test('Building valid instance', async (done: any): Promise<void> => {

        const instance = new Battlebird();
        await instance.start();
        const res = await instance.Bush.send({data: [Buffer.from('test')], ip: '127.0.0.1', port: 3000});

        if ((res as any).timestamp === undefined) return done(new Error('Timestamp should get added by middleware'));

        done();
    });

});
