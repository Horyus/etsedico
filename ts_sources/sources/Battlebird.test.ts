import { ec_address, ec_gen, ec_sign } from './utility/btbd-crypto';

declare var describe;
declare var test;
declare var expect;

import { Battlebird } from './Battlebird';
import { ECKeyPair }  from './utility/btbd-crypto/ec_gen';

describe('Battlebird test suite', () => {

    test('Building valid instance', async (done: any): Promise<void> => {

        const ec_keypair: ECKeyPair = ec_gen();
        const master_keypair: ECKeyPair = ec_gen();
        const signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(ec_keypair.publicKey));

        const instance = new Battlebird(ec_keypair, signature);
        await instance.start();
        const res = await instance.Bush.send({data: [Buffer.from('test')], ip: '127.0.0.1', port: 3000});

        if ((res as any).timestamp === undefined) return done(new Error('Timestamp should get added by middleware'));

        done();
    });

});
