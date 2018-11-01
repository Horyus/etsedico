import { IBushPlugin }                          from '../../IBushPlugin';
import { Bush }                                 from '../../Bush';
import {
    MiddlewareActionContinue,
    MiddlewareActionTypes,
    MiddlewareEvent,
    MiddlewareFunction,
    MiddlewareNext
}                                               from '../../Middleware';
import { PreSendPriorities, ReceivePriorities } from '../settings';

export type TimestampGetter = () => number;

const PRESEND_TIMESTAMP_MIDDLEWARE: string = 'presend_timestamp_middleware';
const RECEIVE_TIMESTAMP_MIDDLEWARE: string = 'receive_timestamp_middleware';

/**
 * Timestamp plugin, used to inject a timestamp in the payload
 */
export class TimestampPlugin implements IBushPlugin {

    public readonly name: string = 'timestamp';
    private readonly getter: TimestampGetter;

    private readonly timestamp_middleware: MiddlewareFunction<any, any>;

    constructor(getter: TimestampGetter) {
        this.getter = getter;

        this.timestamp_middleware = (data: any, env: any, next: MiddlewareNext<any>, _: MiddlewareEvent): void => {
            next({
                type: MiddlewareActionTypes.Continue,
                payload: {
                    ...data,
                    timestamp: this.getter()
                }
            } as MiddlewareActionContinue<any>);
        };
    }

    public inject(bush: Bush): void {
        bush.addPreSendMiddleware(PRESEND_TIMESTAMP_MIDDLEWARE, this.timestamp_middleware, {weight: PreSendPriorities[PRESEND_TIMESTAMP_MIDDLEWARE]});
        bush.addReceiveMiddleware(RECEIVE_TIMESTAMP_MIDDLEWARE, this.timestamp_middleware, {weight: ReceivePriorities[RECEIVE_TIMESTAMP_MIDDLEWARE]});
    }

}
