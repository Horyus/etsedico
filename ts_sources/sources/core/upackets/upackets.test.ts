import { EventEmitter }    from 'events';
import { Bush }            from '../../Bush';
import { UPacketsPlugin }   from './index';

declare var describe;
declare var test;
declare var expect;

type Done = (arg?: any) => void;

describe('connect Test Suite', () => {

    test('Add ConnectPlugin Without CryptoPlugin', async (done: Done): Promise<void> => {
        const bush_event = new EventEmitter();
        const bush_env = {};

        const bush = new Bush({event: bush_event, env: bush_env});
        try {
            bush.plug(new UPacketsPlugin());
            await bush.start();
            done(new Error('Should be throwing'));
        } catch (e) {
            done();
        }
    });

});
