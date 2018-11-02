import {
    EventEmitter,
    MiddlewareActionContinue,
    MiddlewareActionTypes,
    MiddlewareEvent,
    MiddlewareFunction,
    MiddlewareNext
} from './Middleware';

declare var describe;
declare var test;
declare var expect;

import {
    AnyDT,
    Bush, ErrorDT,
    MiddlewareSummay,
    OnMessageFunction,
    PostBindDT,
    PreBindDT, PreSendDT,
    ReceiveDT
} from './Bush';
import { IBushPlugin } from './IBushPlugin';

let george;
let bush;

const ip: string = '127.0.0.1';
let bush_port = 20202;
let george_port = 10101;
let port: number = 30303;

const string_any_middleware: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    event('loaded', data);
    next({
        type: MiddlewareActionTypes.Continue,
        payload: data
    } as MiddlewareActionContinue<string>);
};

let async_done: Done;

// Error Middleware Functions

const error_mdw: MiddlewareFunction<ErrorDT, any> = (data: ErrorDT, env: any, next: MiddlewareNext<ErrorDT>, _: MiddlewareEvent): void => {
    async_done();
    next({
        type: MiddlewareActionTypes.Continue,
        payload: data
    } as MiddlewareActionContinue<ErrorDT>);
};

// Any Middleware Function

const end_log: string[] = [];
const logger: MiddlewareFunction<AnyDT, any> = (data: AnyDT, env: any, next: MiddlewareNext<AnyDT>, _: MiddlewareEvent): void => {
    try {
        end_log.push(`[${data.action}]: ${JSON.stringify(data.payload)}`);
    } catch (e) {
        end_log.push(`[${data.action}]: Circular Data`);
    }
    next({
        type: MiddlewareActionTypes.Continue,
        payload: data
    } as MiddlewareActionContinue<AnyDT>);
};

// Post Bind Middleware Functions

const double_ip_port_middleware: MiddlewareFunction<PostBindDT, any> = (data: PostBindDT, env: any, next: MiddlewareNext<PostBindDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {ip: data.ip + data.ip, port: data.port * 2} as PostBindDT
    } as MiddlewareActionContinue<PostBindDT>);
};

const local_to_global: MiddlewareFunction<PostBindDT, any> = (data: PostBindDT, env: any, next: MiddlewareNext<PostBindDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {ip: '0.0.0.0', port: data.port * 2} as PostBindDT
    } as MiddlewareActionContinue<PostBindDT>);
};

// Pre Bind Middleware Functions

const ip_eraser: MiddlewareFunction<PreBindDT, any> = (data: PreBindDT, env: any, next: MiddlewareNext<PreBindDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {ip: undefined, port: data.port * 2} as PreBindDT
    } as MiddlewareActionContinue<PreBindDT>);
};

// Send Middleware Function

const send_broker: MiddlewareFunction<PreSendDT, any> = (data: PreSendDT, env: any, next: MiddlewareNext<PreSendDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {ip: '127.0.0.1', port: -123, data: data.data}
    } as MiddlewareActionContinue<PreSendDT>);
};

// Receive Middleware Function

const buffer_uppercase: MiddlewareFunction<ReceiveDT, any> = (data: ReceiveDT, env: any, next: MiddlewareNext<ReceiveDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {info: data.info, data: new Buffer(data.data.toString().toUpperCase())}
    } as MiddlewareActionContinue<ReceiveDT>);
};

const interrupt_mdw: MiddlewareFunction<ReceiveDT, any> = (data: ReceiveDT, env: any, next: MiddlewareNext<ReceiveDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {info: data.info, data: new Buffer(data.data.toString().toUpperCase()), __interrupt_signal: true}
    } as MiddlewareActionContinue<ReceiveDT>);
};

// Test Plugins

// tslint:disable-next-line:max-classes-per-file
class InvalidExpandingPlugin implements IBushPlugin {

    public name: string;
    private readonly done: Done;

    public constructor(_name: string, done: Done) {
        this.name = _name;
        this.done = done;
    }

    public inject(bush: Bush): void {
        bush.expand('done', () => {
            this.done();
        });
        bush.expand('done', () => {
            this.done();
        });
    }
}

// tslint:disable-next-line:max-classes-per-file
class ExpandingPlugin implements IBushPlugin {

    public name: string;
    private readonly done: Done;

    public constructor(_name: string, done: Done) {
        this.name = _name;
        this.done = done;
    }

    public inject(bush: Bush): void {
        bush.expand('done', () => {
            this.done();
        });
    }
}

// tslint:disable-next-line:max-classes-per-file
class WorkingPlugin implements IBushPlugin {

    public name: string;
    private readonly done: Done;

    public constructor(_name: string, done: Done) {
        this.name = _name;
        this.done = done;
    }

    public inject(bush: Bush): void {
        bush.addReceiveMiddleware(this.name + ':interrupt_mdw', interrupt_mdw);
        setTimeout(() => {
            this.done();
        }, 1000);
    }
}

// tslint:disable-next-line:max-classes-per-file
class ThrowingPlugin implements IBushPlugin {

    public name: string;

    public constructor(_name: string) {
        this.name = _name;
    }

    public inject(bush: Bush): void {
        throw new Error('manual error');
    }
}

const env = {};
const event = new EventEmitter();

type Done = (reason?: Error) => void;

describe('Bush Test Suite', () => {

    describe('Testing Constructor and Setters', () => {

        // @ts-ignore
        test('Create Bush instance and start empty', async (done: Done) => {
            try {
                bush = new Bush();
                await bush.start();
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Create Bush instance with custom env and start empty', async (done: Done) => {
            try {
                bush = new Bush({env: env});
                await bush.start();
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Create Bush instance with custom event emitter and start empty', async (done: Done) => {
            try {
                bush = new Bush({event: event});
                await bush.start();
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to pre_send_mdw', async (done: Done) => {
            try {
                bush.addPreSendMiddleware('one', string_any_middleware);
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_send_mdw'].length !== 1 || summary['pre_send_mdw'][0] !== '<one 0>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to post_send_mdw', async (done: Done) => {
            try {
                bush.addPostSendMiddleware('two', string_any_middleware);
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['post_send_mdw'].length !== 1 || summary['post_send_mdw'][0] !== '<two 0>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to receive_mdw', async (done: Done) => {
            try {
                bush.addReceiveMiddleware('three', string_any_middleware);
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['receive_mdw'].length !== 1 || summary['receive_mdw'][0] !== '<three 0>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to any_mdw', async (done: Done) => {
            try {
                bush.addAnyMiddleware('four', string_any_middleware, {weight: 69});
                bush.addAnyMiddleware('five', string_any_middleware);
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['any_mdw'].length !== 2 || summary['any_mdw'][1] !== '<five 0>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to listen_mdw', async (done: Done) => {
            try {
                bush.addListenMiddleware('six', string_any_middleware, {weight: 6});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['listen_mdw'].length !== 1 || summary['listen_mdw'][0] !== '<six 6>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to pre_bind_mdw', async (done: Done) => {
            try {
                bush.addPreBindMiddleware('height', string_any_middleware, {weight: 8});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_bind_mdw'].length !== 1 || summary['pre_bind_mdw'][0] !== '<height 8>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to post_bind_mdw', async (done: Done) => {
            try {
                bush.addPostBindMiddleware('nine', string_any_middleware, {weight: 9});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['post_bind_mdw'].length !== 1 || summary['post_bind_mdw'][0] !== '<nine 9>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to pre_send_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addPreSendMiddleware('one_miss', string_any_middleware, {require: ['test']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to post_send_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addPostSendMiddleware('two_miss', string_any_middleware, {require: ['test', 'another_test'], before: ['hi'], after: ['bye']});
                bush.addPostSendMiddleware('another_test', string_any_middleware);
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to receive_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addReceiveMiddleware('three_miss', string_any_middleware, {before: ['hi']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to any_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addAnyMiddleware('four_miss', string_any_middleware, {require: ['test']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to listen_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addListenMiddleware('five_miss', string_any_middleware, {require: ['test']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to pre_bind_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addPreBindMiddleware('six_miss', string_any_middleware, {require: ['test']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to post_bind_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addPostBindMiddleware('seven_miss', string_any_middleware, {require: ['test']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Add middleware to error_mdw with missing deps', async (done: Done) => {
            try {
                bush = new Bush();
                bush.addErrorMiddleware('seven_miss', string_any_middleware, {require: ['test']});
                await bush.start();
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }
        });

    });

    describe('Testing Bind Features', () => {

        // @ts-ignore
        test('Call bind before start call', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                await bush.bind({ip, port});
                ++port;
                done(new Error('Calling bind before calling start should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Call Bind on same port', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            const george_event = new EventEmitter();
            const george_env = {};

            const george = new Bush({event: george_event, env: george_env});

            await bush.start();
            await george.start();
            george.addErrorMiddleware('error1', error_mdw);
            async_done = done;
            await bush.bind({ip, port: 12345});
            await george.bind({ip, port: 12345});
        });

        // @ts-ignore
        test('Call Bind with post_mdw', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                bush.addPostBindMiddleware('double1', double_ip_port_middleware, {weight: 999});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['post_bind_mdw'].length !== 1 || summary['post_bind_mdw'][0] !== '<double1 999>') return done(new Error('Invalid Summary'));

                await bush.start();
                const result = await bush.bind({ip, port});
                ++port;
                if (result.ip !== '127.0.0.1127.0.0.1') return done(new Error('Invalid end of chain'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Call Bind with post_mdw and pre_mdw', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                bush.addPreBindMiddleware('global1', local_to_global, {weight: 999});
                let summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_bind_mdw'].length !== 1 || summary['pre_bind_mdw'][0] !== '<global1 999>') return done(new Error('Invalid Summary'));

                bush.addPostBindMiddleware('double2', double_ip_port_middleware, {weight: 999});
                summary = bush.getMiddlewareSummary();
                if (summary['post_bind_mdw'].length !== 1 || summary['post_bind_mdw'][0] !== '<double2 999>') return done(new Error('Invalid Summary'));

                await bush.start();
                const result = await bush.bind({ip, port});
                ++port;
                if (result.ip !== '0.0.0.00.0.0.0') return done(new Error('Invalid end of chain'));
                done();
            } catch (e) {
                done(e);
            }

        });

        // @ts-ignore
        test('Call Bind with ip eraser pre_mdw', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                bush.addPreBindMiddleware('eraser1', ip_eraser, {weight: 999});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_bind_mdw'].length !== 1 || summary['pre_bind_mdw'][0] !== '<eraser1 999>') return done(new Error('Invalid Summary'));
                try {
                    await bush.start();
                    await bush.bind({ip, port});
                    ++port;
                    done(new Error('Should not be able to call bind with empty ip'));
                } catch (e) {
                    done();
                }
            } catch (e) {
                done(e);
            }
        });

    });

    describe('Testing Send Features', () => {

        // @ts-ignore
        test('Call send before start call', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                await bush.send({ip: '127.0.0.1', port: 1234, data: [new Buffer('Data')]});
                done(new Error('Calling send before calling start should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Call send with invalid payload', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                await bush.send({});
                done(new Error('Calling send before calling start should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Sending with wrong pre_mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});

            await bush.start();
            await bush.bind({ip, port: save_bush});

            bush.addPreSendMiddleware('broke1', send_broker);

            try {
                await bush.send({ip: '127.0.0.1', port: george_port, data: [new Buffer('Hello')]});
                done(new Error('Should throw'));
            } catch (e) {
                done();
            }

        });

        // @ts-ignore
        test('Sending', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});

            await bush.start();
            await bush.bind({ip, port: save_bush});

            bush_event.on('core:send', (_: string): void => {
                done();
            });

            bush.send({ip: '127.0.0.1', port: george_port, data: [new Buffer('Hello')]});

        });

    });

    describe('Testing Receive Features', () => {

        // @ts-ignore
        test('Sending', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            await bush.start();
            await bush.bind({ip, port: save_bush});

            let count = 0;

            const george_message: OnMessageFunction = (data: any): void => {
                if (data.data.toString() === 'Hello') ++count;
                if (count === 2) done();
            };

            const bush_message: OnMessageFunction = (data: any): void => {
                if (data.data.toString() === 'Hello too') ++count;
                if (count === 2) done();
            };

            george.onMessage(george_message);

            bush.onMessage(bush_message);

            bush.send({ip: '127.0.0.1', port: save_george, data: [new Buffer('Hello')]});
            george.send({ip: '127.0.0.1', port: save_bush, data: [new Buffer('Hello too')]});
        });

        // @ts-ignore
        test('Send data with pre_mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            await bush.start();
            await bush.bind({ip, port: save_bush});

            let count = 0;

            const george_message: OnMessageFunction = (data: any): void => {
                if (data.data.toString() === 'HELLO') ++count;
                if (count === 2) done();
            };

            const bush_message: OnMessageFunction = (data: any): void => {
                if (data.data.toString() === 'HELLO TOO') ++count;
                if (count === 2) done();
            };

            george.addReceiveMiddleware('upper1', buffer_uppercase);
            george.onMessage(george_message);

            bush.addReceiveMiddleware('upper2', buffer_uppercase);
            bush.onMessage(bush_message);

            bush.send({ip: '127.0.0.1', port: save_george, data: [new Buffer('Hello')]});
            george.send({ip: '127.0.0.1', port: save_bush, data: [new Buffer('Hello too')]});
        });

        // @ts-ignore
        test('Send data with interrupting pre_mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            await bush.start();
            await bush.bind({ip, port: save_bush});

            let count = 0;

            const george_message: OnMessageFunction = (data: any): void => {
                ++count;
            };

            const bush_message: OnMessageFunction = (data: any): void => {
                ++count;
            };

            george.addReceiveMiddleware('interrupt1', interrupt_mdw);
            george.onMessage(george_message);

            bush.addReceiveMiddleware('interrupt2', interrupt_mdw);
            bush.onMessage(bush_message);

            bush.send({ip: '127.0.0.1', port: save_george, data: [new Buffer('Hello')]});
            george.send({ip: '127.0.0.1', port: save_bush, data: [new Buffer('Hello too')]});

            setTimeout((): void => {
                if (!count) done();
                else done(new Error('Should not have received any data'));
            }, 3000);

        });

    });

    describe('Testing Any Middleware Features', () => {

        // @ts-ignore
        test('Send data using logging mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            bush.addAnyMiddleware('logger', logger);
            await bush.start();
            await bush.bind({ip, port: save_bush});

            const george_message: OnMessageFunction = (data: any): void => {
            };

            const bush_message: OnMessageFunction = (data: any): void => {
            };

            george.onMessage(george_message);

            bush.onMessage(bush_message);

            bush.send({ip: '127.0.0.1', port: save_george, data: [new Buffer('Hello')]});
            george.send({ip: '127.0.0.1', port: save_bush, data: [new Buffer('Hello too')]});

            setTimeout((): void => {
                if (end_log.length === 5) done();
                else done(new Error('Invalid number of logged lines'));
            }, 3000);
        });

    });

    describe('Testing Env Features', () => {

        test('Setting data in env with invalid path', (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.setEnv('this.is.an.invalid.path.-', {data: 'yes', another_data: 'yes yes'});

            } catch (e) {
                done();
            }
        });

        test('Setting data in env', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.setEnv('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
            bush.setEnv('this.is.going.not.too.deep', {data: 'yes', another_data: 'yes yes'});

            if (bush.Env.this.is.going.too.deep.data !== 'yes' || bush.Env.this.is.going.too.deep.another_data !== 'yes yes') throw new Error('Invalid Env after setEnv');
        });

        test('Adding data in env', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.addEnv('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
            bush.addEnv('this.is.going.too.deep', {testing: 'test'});
            bush.addEnv('this.is.going.not.too.deep', {testing: 'test'});

            if (bush.Env.this.is.going.too.deep.data !== 'yes' || bush.Env.this.is.going.too.deep.another_data !== 'yes yes' || bush.Env.this.is.going.too.deep.testing !== 'test') throw new Error('Invalid Env after addEnv');
        });

        test('Pushing data in env', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.pushEnv('this.is.going.too.deep', 'hi');
            bush.pushEnv('this.is.going.too.deep', 'bye');

            if (bush.Env.this.is.going.too.deep[0] !== 'hi' || bush.Env.this.is.going.too.deep[1] !== 'bye') throw new Error('Invalid Env after pushEnv');
        });

        test('Removing data in env', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.setEnv('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
            bush.addEnv('this.is.going.too.deep', {testing: 'test'});
            bush.removeEnv('this.is.going.too.deep');

            if (bush.Env.this.is.going.too.deep) throw new Error('Invalid Env after removeEnv');
        });

        test('Removing data not in env', (done: Done): void => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.setEnv('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
                bush.addEnv('this.is.going.too.deep', {testing: 'test'});
                bush.removeEnv('this.is.going.way.too.deep');
                done(new Error('Should not delete non existing path'));
            } catch (e) {
                done();
            }
        });

    });

    describe('Testing Config Features', () => {

        test('Setting data in config', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.setConfig('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
            bush.setConfig('this.is.going.not.too.deep', {data: 'yes', another_data: 'yes yes'});

            if (bush.Config.this.is.going.too.deep.data !== 'yes' || bush.Config.this.is.going.too.deep.another_data !== 'yes yes') throw new Error('Invalid Config after setConfig');
        });

        test('Adding data in config', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.setConfig('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
            bush.addConfig('this.is.going.too.deep', {testing: 'test'});
            bush.addConfig('this.is.going.not.too.deep', {testing: 'test'});

            if (bush.Config.this.is.going.too.deep.data !== 'yes' || bush.Config.this.is.going.too.deep.another_data !== 'yes yes' || bush.Config.this.is.going.too.deep.testing !== 'test') throw new Error('Invalid Config after addConfig');
        });

        test('Pushing data in config', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.pushConfig('this.is.going.too.deep', 'hi');
            bush.pushConfig('this.is.going.too.deep', 'bye');

            if (bush.Config.this.is.going.too.deep[0] !== 'hi' || bush.Config.this.is.going.too.deep[1] !== 'bye') throw new Error('Invalid Config after pushConfig');
        });

        test('Removing data in config', () => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.setConfig('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
            bush.addConfig('this.is.going.too.deep', {testing: 'test'});
            bush.removeConfig('this.is.going.too.deep');

            if (bush.Config.this.is.going.too.deep) throw new Error('Invalid Config after removeConfig');
        });

        test('Removing data not in config', (done: Done): void => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.setConfig('this.is.going.too.deep', {data: 'yes', another_data: 'yes yes'});
                bush.addConfig('this.is.going.too.deep', {testing: 'test'});
                bush.removeConfig('this.is.going.way.too.deep');
                done(new Error('Should not delete non existing path'));
            } catch (e) {
                done();
            }
        });

    });

    describe('Testing Plugin Features', () => {

        // @ts-ignore
        test('Adding working plugin', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.plug(new WorkingPlugin('working_plugin', done));
            await bush.start();
        });

        // @ts-ignore
        test('Adding throwing plugin', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.plug(new ThrowingPlugin('throwing_plugin'));
                await bush.start();
                done(new Error('Plugin should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Adding expanding plugin', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush.plug(new ExpandingPlugin('expanding_plugin', done));
            await bush.start();
            bush.methods.done();
        });

        // @ts-ignore
        test('Adding invalid expanding plugin', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.plug(new InvalidExpandingPlugin('expanding_plugin', done));
                await bush.start();
                done(new Error('Plugin should throw'));
            } catch (e) {
                done();
            }
        });

        test('Checking for plugin when none is there', async (done: Done) => {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                if (bush.requires('test')) return done(new Error('Should return false'));
                done();
        });

        test('Adding expanding plugin and checking with requires', async (done: Done) => {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.plug(new ExpandingPlugin('expanding_plugin', done));
                if (!bush.requires('expanding_plugin')) return done(new Error('Should return true'));
                done();
        });

    });

    describe('Testing direct private calls', () => {

        // @ts-ignore
        test('Add midleware to unexisting field', async (done: Done) => {
            try {
                (<any> bush)._add_mdw('george', 'same', string_any_middleware);
                done(new Error('Should not be able to add middleware to field george'));
            } catch (e) {
                done();
            }
        });

    });

});
