import {
    ConnectionInfos,
    ConnectionStatus,
    ConnectPreSendDT,
    PresendCaughtActionTypes
}                             from './index';
import {
    MiddlewareActionContinue,
    MiddlewareActionError,
    MiddlewareActionTypes,
    MiddlewareEvent,
    MiddlewareNext
}                             from '../../Middleware';
import { ActionType, ignore } from '../constants';

export default (data: ConnectPreSendDT, env: any, next: MiddlewareNext<ConnectPreSendDT>, event: MiddlewareEvent): void => {

    // Status needs to be checked only on specific data action types
    if (ignore(data.type, PresendCaughtActionTypes)) {
        return next({
            type: MiddlewareActionTypes.Continue,
            payload: data
        } as MiddlewareActionContinue<ConnectPreSendDT>);
    }

    const user_key: string = data.destination_address.toString('hex');

    if (!env.connect.connections[user_key]) {
        env.connect.connections[user_key] = {
            status: ConnectionStatus.None,
            master_address: data.destination_address,
            public_session_key: data.destination_session_public_key,
            ip: data.ip,
            port: data.port
        } as ConnectionInfos;
    }

    switch (data.type) {
        case ActionType.Connect:
            if ((env.connect.connections[user_key].status !== ConnectionStatus.None)
                || (!env.connect.connections[user_key].master_address)
                || (!env.connect.connections[user_key].public_session_key)
                || (!env.connect.connections[user_key].ip)
                || (env.connect.connections[user_key].port === undefined))
            {
                return next({
                    type: MiddlewareActionTypes.Error,
                    error: new Error('Invalid User Info state for current action')
                } as MiddlewareActionError);
            }
    }
    return next({
        type: MiddlewareActionTypes.Continue,
        payload: data
    } as MiddlewareActionContinue<ConnectPreSendDT>);
};
