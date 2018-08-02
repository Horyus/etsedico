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
    Bush,
    MiddlewareSummay,
    OnMessageFunction,
    PostBindDT,
    PreBindDT,
    PreDisconnectDT,
    ReceiveDT
} from './Bush';

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

// Pre Disconnect Middleware Functions

const signature_eraser: MiddlewareFunction<PreDisconnectDT, any> = (data: PreDisconnectDT, env: any, next: MiddlewareNext<PreDisconnectDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {signature: undefined} as PreDisconnectDT
    } as MiddlewareActionContinue<PreDisconnectDT>);
};

// Receive Middleware Function

const buffer_uppercase: MiddlewareFunction<ReceiveDT, any> = (data: ReceiveDT, env: any, next: MiddlewareNext<ReceiveDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {signature: data.signature, data: new Buffer(data.data.toString().toUpperCase())}
    } as MiddlewareActionContinue<ReceiveDT>);
};

const interrupt_mdw: MiddlewareFunction<ReceiveDT, any> = (data: ReceiveDT, env: any, next: MiddlewareNext<ReceiveDT>, _: MiddlewareEvent): void => {
    next({
        type: MiddlewareActionTypes.Continue,
        payload: {signature: data.signature, data: new Buffer(data.data.toString().toUpperCase()), __interrupt_signal: true}
    } as MiddlewareActionContinue<ReceiveDT>);
};

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
        test('Add middleware to pre_listen_mdw', async (done: Done) => {
            try {
                bush.addPreListenMiddleware('six', string_any_middleware, {weight: 6});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_listen_mdw'].length !== 1 || summary['pre_listen_mdw'][0] !== '<six 6>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to post_listen_mdw', async (done: Done) => {
            try {
                bush.addPostListenMiddleware('seven', string_any_middleware, {weight: 777});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['post_listen_mdw'].length !== 1 || summary['post_listen_mdw'][0] !== '<seven 777>') return done(new Error('Invalid Summary'));
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
        test('Add middleware to new_connection_mdw', async (done: Done) => {
            try {
                bush.addNewConnectionMiddleware('ten', string_any_middleware, {weight: 10});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['new_connection_mdw'].length !== 1 || summary['new_connection_mdw'][0] !== '<ten 10>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to new_disconnection_mdw', async (done: Done) => {
            try {
                bush.addNewDisconnectionMiddleware('eleven', string_any_middleware, {weight: 11});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['new_disconnection_mdw'].length !== 1 || summary['new_disconnection_mdw'][0] !== '<eleven 11>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to pre_connect', async (done: Done) => {
            try {
                bush.addPreConnectMiddleware('twelve', string_any_middleware, {weight: 12});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_connect_mdw'].length !== 1 || summary['pre_connect_mdw'][0] !== '<twelve 12>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to post_connect', async (done: Done) => {
            try {
                bush.addPostConnectMiddleware('thirteen', string_any_middleware, {weight: 13});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['post_connect_mdw'].length !== 1 || summary['post_connect_mdw'][0] !== '<thirteen 13>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to pre_disconnect', async (done: Done) => {
            try {
                bush.addPreDisconnectMiddleware('fourteen', string_any_middleware, {weight: 14});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_disconnect_mdw'].length !== 1 || summary['pre_disconnect_mdw'][0] !== '<fourteen 14>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Add middleware to post_disconnect', async (done: Done) => {
            try {
                bush.addPostDisconnectMiddleware('fifteen', string_any_middleware, {weight: 15});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['post_disconnect_mdw'].length !== 1 || summary['post_disconnect_mdw'][0] !== '<fifteen 15>') return done(new Error('Invalid Summary'));
                done();
            } catch (e) {
                done(e);
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

    describe('Testing Listen Features', () => {

        // @ts-ignore
        test('Call listen before start call', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                await bush.listen();
                done(new Error('Calling listen before calling start should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Call listen after start and bind', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});
            bush_event.on('core:listen', (): void => {
                done();
            });
            await bush.start();
            await bush.bind({ip, port});
            ++port;
            await bush.listen();
        });

    });

    describe('Testing Connect Features', () => {

        // @ts-ignore
        test('Call connect before start call', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                await bush.connect({ip, port: bush_port});
                done(new Error('Calling connect before calling start should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Connecting two instances', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            await bush.start();
            await bush.bind({ip, port: save_bush});

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));

                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        done();
                    }
                }, 100);
            });

            await george.listen();

            await bush.connect({ip, port: save_george});
        });

        // @ts-ignore
        test('Using ip eraser middleware', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                bush.addPreConnectMiddleware('eraser2', ip_eraser, {weight: 999});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_connect_mdw'].length !== 1 || summary['pre_connect_mdw'][0] !== '<eraser2 999>') return done(new Error('Invalid Summary'));

                await bush.start();
                await bush.bind({ip, port});
                ++port;
                try {
                    await bush.connect({ip, port});
                    done(new Error('Should throw is ip or port is undefined'));
                } catch (e) {
                    done();
                }

            } catch (e) {
                done(e);
            }
        });

    });

    describe('Testing Disconnect Features', () => {

        // @ts-ignore
        test('Call disconnect before start call', async (done: Done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                await bush.disconnect({signature: 'ANY'});
                done(new Error('Calling disconnect before calling start should throw'));
            } catch (e) {
                done();
            }
        });

        // @ts-ignore
        test('Connecting two instances and disconnecting', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            await bush.start();
            await bush.bind({ip, port: save_bush});

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        bush.disconnect({signature: identifier});
                    }
                }, 100);
            });

            bush_event.on('core:disconnect', (_: string): void => {
                done();
            });

            await george.listen();

            await bush.connect({ip, port: save_george});
        });

        // @ts-ignore
        test('Connecting two instances and disconnecting from the other one', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});
            await bush.start();
            await bush.bind({ip, port: save_bush});

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        george.disconnect({signature: george_signature});
                    }
                }, 100);
            });

            george_event.on('core:disconnect', (_: string): void => {
                done();
            });

            await george.listen();

            await bush.connect({ip, port: save_george});
        });

        // @ts-ignore
        test('Using signature eraser middleware', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                bush.addPreDisconnectMiddleware('eraser3', signature_eraser, {weight: 999});
                const summary: MiddlewareSummay = bush.getMiddlewareSummary();
                if (summary['pre_disconnect_mdw'].length !== 1 || summary['pre_disconnect_mdw'][0] !== '<eraser3 999>') return done(new Error('Invalid Summary'));

                await bush.start();
                await bush.bind({ip, port});
                ++port;
                try {
                    await bush.disconnect({signature: 'ANY'});
                    done(new Error('Should throw if end of chain is undefined'));
                } catch (e) {
                    done();
                }

            } catch (e) {
                done(e);
            }
        });

        // @ts-ignore
        test('Disconnecting from non existing user', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                await bush.start();
                await bush.bind({ip, port});
                ++port;
                try {
                    await bush.disconnect({signature: 'ANY'});
                    done(new Error('Should throw if trying to remove non existing user'));
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
                await bush.send({signature: 'Signature', data: [new Buffer('Data')]});
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
        test('Connecting two instances and sending', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
            george = new Bush({event: george_event, env: george_env});
            await george.start();
            await george.bind({ip, port: save_george});

            bush = new Bush({event: bush_event, env: bush_env});

            await bush.start();
            await bush.bind({ip, port: save_bush});

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        bush.send({signature: identifier, data: [new Buffer('Hello')]});
                    }
                }, 100);
            });

            bush_event.on('core:send', (_: string): void => {
                done();
            });

            await george.listen();

            await bush.connect({ip, port: save_george});
        });

        // @ts-ignore
        test('Send to non existing user', async (done: Done) => {
            const bush_event = new EventEmitter();
            const bush_env = {};

            bush = new Bush({event: bush_event, env: bush_env});

            try {
                await bush.start();
                await bush.bind({ip, port});
                ++port;
                try {
                    await bush.send({signature: 'ANY', data: [new Buffer('You ! exist')]});
                    done(new Error('Should throw if trying to remove non existing user'));
                } catch (e) {
                    done();
                }

            } catch (e) {
                done(e);
            }
        });

    });

    describe('Testing Receive Features', () => {

        // @ts-ignore
        test('Connecting two instances and sending', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
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

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        bush.send({signature: identifier, data: [new Buffer('Hello')]});
                        george.send({signature: george_signature, data: [new Buffer('Hello too')]});
                    }
                }, 100);
            });

            george.onMessage(george_message);
            await george.listen();

            bush.onMessage(bush_message);
            await bush.connect({ip, port: save_george});
        });

        // @ts-ignore
        test('Connecting two instances and sending with pre_mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
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

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        bush.send({signature: identifier, data: [new Buffer('Hello')]});
                        george.send({signature: george_signature, data: [new Buffer('Hello too')]});
                    }
                }, 100);
            });

            george.addReceiveMiddleware('upper1', buffer_uppercase);
            george.onMessage(george_message);
            await george.listen();

            bush.addReceiveMiddleware('upper2', buffer_uppercase);
            bush.onMessage(bush_message);
            await bush.connect({ip, port: save_george});
        });

        // @ts-ignore
        test('Connecting two instances and sending with interrupting pre_mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
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

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        bush.send({signature: identifier, data: [new Buffer('Hello')]});
                        george.send({signature: george_signature, data: [new Buffer('Hello too')]});
                    }
                }, 100);
            });

            george.addReceiveMiddleware('interrupt1', interrupt_mdw);
            george.onMessage(george_message);
            await george.listen();

            bush.addReceiveMiddleware('interrupt2', interrupt_mdw);
            bush.onMessage(bush_message);
            await bush.connect({ip, port: save_george});

            setTimeout((): void => {
                if (!count) done();
                else done(new Error('Should not have received any data'));
            }, 3000);
        });

    });

    describe('Testing Any Middleware Features', () => {

        // @ts-ignore
        test('Connecting two instances and sending and using logging mdw', async (done: Done) => {
            const save_george = george_port;
            const save_bush = bush_port;

            ++george_port;
            ++bush_port;

            const george_event = new EventEmitter();
            const bush_event = new EventEmitter();

            const george_env = {};
            const bush_env = {};

            const george_signature = '<I 127.0.0.1 ' + (save_bush) + '>';
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

            bush_event.on('core:connect', (identifier: string): void => {
                if (!bush.getConnection(identifier)) return done(new Error('Could not find connection inside bush instance'));
                const intervalId = setInterval((): void => {
                    if (george.getConnection(george_signature)) {
                        clearInterval(intervalId);
                        bush.send({signature: identifier, data: [new Buffer('Hello')]});
                        george.send({signature: george_signature, data: [new Buffer('Hello too')]});
                    }
                }, 100);
            });

            george.onMessage(george_message);
            await george.listen();

            bush.onMessage(bush_message);
            await bush.connect({ip, port: save_george});

            setTimeout((): void => {
                if (end_log.length === 7) done();
                else done(new Error('Invalid number of logged lines'));
            }, 3000);
        });

    });

    describe('Testing Env Features', () => {

        test('Setting data in env with invalid path', (done) => {
            try {
                const bush_event = new EventEmitter();
                const bush_env = {};

                bush = new Bush({event: bush_event, env: bush_env});
                bush.setEnv('this.is.an.invalid.path.9', {data: 'yes', another_data: 'yes yes'});

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
