import { EventEmitter }    from 'events';
import { Bush }            from '../../Bush';
import { ConnectPlugin }   from './index';
import { TimestampPlugin } from '../timestamp';

declare var describe;
declare var test;
declare var expect;

type Done = (arg?: any) => void;

describe('connect Test Suite', () => {

    test('Add ConnectPlugin Without TimestampPlugin', async (done: Done): Promise<void> => {
        const bush_event = new EventEmitter();
        const bush_env = {};

        const bush = new Bush({event: bush_event, env: bush_env});
        try {
            bush.plug(new ConnectPlugin());
            await bush.start();
            done(new Error('Should be throwing'));
        } catch (e) {
            done();
        }
    });

    test('Add ConnectPlugin Without CryptoPlugin', async (done: Done): Promise<void> => {
        const bush_event = new EventEmitter();
        const bush_env = {};

        const bush = new Bush({event: bush_event, env: bush_env});
        bush.plug(new TimestampPlugin((): number => 0));
        try {
            bush.plug(new ConnectPlugin());
            await bush.start();
            done(new Error('Should be throwing'));
        } catch (e) {
            done();
        }
    });

});
