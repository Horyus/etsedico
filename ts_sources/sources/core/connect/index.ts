import { IBushPlugin }                 from '../../IBushPlugin';
import { Bush, PostSendDT, PreSendDT } from '../../Bush';
import {
    MiddlewareActionContinue,
    MiddlewareActionError,
    MiddlewareActionTypes,
    MiddlewareEvent,
    MiddlewareFunction,
    MiddlewareNext
}                                      from '../../Middleware';
import { ActionType }                  from '../constants';
import { PreSendPriorities }           from '../settings';
import { EngagePacket }     from '../../utility/btbd-packets';

import check_current_status from './check_current_status';
import build_engage_packet from './build_engage_packet';

export interface ConnectPreSendDT extends PreSendDT {
    // Initial arguments
    type: ActionType;
    destination_address: Buffer;
    destination_session_public_key: Buffer;

    // Added in chain of actions
    packet?: EngagePacket;
    timestamp?: number;
}

export enum ConnectionStatus {
    None = 0,
}

export interface ConnectionHandshake {
    first_challenge?: Buffer;
    second_challenge?: Buffer;
    first_key_half?: Buffer;
    second_key_half?: Buffer;
}

export interface ConnectionInfos {
    status: ConnectionStatus;
    master_address: Buffer;
    public_session_key: Buffer;
    ip: string;
    port: number;
    rsa_key?: Buffer;
    reas_key_has?: Buffer;
    handshake?: ConnectionHandshake;
}

export interface Connections {
    [key: string]: ConnectionInfos;
}

const PRESEND_CHECK_CURRENT_STATUS = 'presend_check_current_status';
const PRESEND_BUILD_ENGAGE_PACKET = 'presend_build_engage_packet';
export const PresendCaughtActionTypes = [
    ActionType.Connect
];

export class ConnectPlugin implements IBushPlugin {
    public readonly name: string = 'connect';
    private readonly connections: Connections = {};

    public inject(bush: Bush): void {
        if (!bush.requires('timestamp')) throw new Error('[connect] missing timestamp plugin dependency');
        if (!bush.requires('crypto')) throw new Error('[connect] missing crypto plugin dependency');

        bush.setEnv(`${this.name}.connections`, this.connections);

        bush.addPreSendMiddleware(PRESEND_CHECK_CURRENT_STATUS, check_current_status, {weight: PreSendPriorities[PRESEND_CHECK_CURRENT_STATUS]});
        bush.addPreSendMiddleware(PRESEND_BUILD_ENGAGE_PACKET, build_engage_packet, {weight: PreSendPriorities[PRESEND_BUILD_ENGAGE_PACKET]});

        bush.expand('connect', async (ip: string, port: number, destination_master_address: Buffer, destination_session_public_key: Buffer): Promise<PostSendDT> =>
            await bush.send<ConnectPreSendDT>({
                ip: ip,
                port: port,
                type: ActionType.Connect,
                destination_address: destination_master_address,
                destination_session_public_key: destination_session_public_key
            }));
    }
}
