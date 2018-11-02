import { ConnectPreSendDT }                                                                 from '../connect';
import {
    MiddlewareActionContinue,
    MiddlewareActionError,
    MiddlewareActionTypes,
    MiddlewareEvent,
    MiddlewareNext
} from '../../Middleware';
import { UPackets, UPacketsEncryptionType }                                                 from '../../utility/btbd-upackets/UPackets';

export default async (data: ConnectPreSendDT, env: any, next: MiddlewareNext<ConnectPreSendDT>, event: MiddlewareEvent): Promise<void> => {
    if (data.type === undefined || !data.destination_session_public_key) {
        return next({
            type: MiddlewareActionTypes.Continue,
            payload: data
        } as MiddlewareActionContinue);
    }

    let fragments;
    try {
        fragments = await UPackets.fragment(UPacketsEncryptionType.EC, data.packet, env.crypto.ec_keypair, data.destination_session_public_key, data.destination_session_public_key);
    } catch (e) {
        return next({
            type: MiddlewareActionTypes.Error,
            error: e
        } as MiddlewareActionError);
    }

    return next({
        type: MiddlewareActionTypes.Continue,
        payload: {
            ...data,
            data: fragments
        }
    } as MiddlewareActionContinue);
};
