import { ConnectPreSendDT, PresendCaughtActionTypes }                                       from './index';
import { MiddlewareActionContinue, MiddlewareActionTypes, MiddlewareEvent, MiddlewareNext } from '../../Middleware';
import * as RandomBytes                                                                     from 'randombytes';
import { EngagePacket }                                                                     from '../../utility/btbd-packets';
import { ignore }                                                                           from '../constants';

export default (data: ConnectPreSendDT, env: any, next: MiddlewareNext<ConnectPreSendDT>, event: MiddlewareEvent): void => {

    if (ignore(data.type, PresendCaughtActionTypes)) {
        return next({
            type: MiddlewareActionTypes.Continue,
            payload: data
        } as MiddlewareActionContinue<ConnectPreSendDT>);
    }

    const target = data.destination_address.toString('hex');
    let remember_hash: Buffer = null;
    if (env.connect.connections[target].rsa_key_hash !== undefined) {
        remember_hash = env.connect.connections[target].rsa_key_hash;
    }
    const first_key_half: Buffer = RandomBytes(16);
    const first_challenge: Buffer = RandomBytes(16);

    const packet: EngagePacket = new EngagePacket(env.crypto.master_address, data.destination_address, env.crypto.master_signature, data.timestamp, first_key_half, first_challenge, remember_hash);

    env.connect.connections[target].handshake = {};
    env.connect.connections[target].handshake.first_key_half = first_key_half;
    env.connect.connections[target].handshake.first_challenge = first_challenge;

    next({
        type: MiddlewareActionTypes.Continue,
        payload: {
            ...data,
            packet
        }
    } as MiddlewareActionContinue);
};
