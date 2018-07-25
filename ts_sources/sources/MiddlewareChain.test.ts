import {
    EventEmitter,
    MiddlewareActionContinue, MiddlewareActionEnd, MiddlewareActionError,
    MiddlewareActionTypes, MiddlewareConfig,
    MiddlewareEvent,
    MiddlewareFunction,
    MiddlewareNext
}                          from './Middleware';
import { MiddlewareChain } from './MiddlewareChain';

declare var describe;
declare var test;
declare var expect;


const event = new EventEmitter();
const env = {};
let mdwc;

const string_any_middleware: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    event('loaded', data);
    next({
        type: MiddlewareActionTypes.Continue,
        payload: data + 'a'
    } as MiddlewareActionContinue<string>);
};

const string_any_middleware_end: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    event('loaded', data);
    next({
        type: MiddlewareActionTypes.End,
        payload: data + 'a'
    } as MiddlewareActionEnd<string>);
};

const string_any_middleware_error: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    event('loaded', data);
    next({
        type: MiddlewareActionTypes.Error,
        error: new Error('Test')
    } as MiddlewareActionError<string>);
};

const string_config: MiddlewareConfig<string> = async (config: string) => {
    return new Promise<boolean>((ok: any, _: any): void => {
        ok(true);
    });
};

const string_config_false: MiddlewareConfig<string> = async (config: string) => {
    return new Promise<boolean>((ok: any, _: any): void => {
        ok(false);
    });
};

type Done = (reason?: Error) => void;

describe('MiddlewareChain Test Suite', () => {

    test('Create new chain and add middleware', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('middleware_name', string_any_middleware, {weight: 23, config: string_config});
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Add same name middleware again', async (done: Done) => {
        try {
            mdwc.addMiddleware('middleware_name', string_any_middleware, {weight: 23, config: string_config});
            done(new Error('Using same middleware_name is forbidden'));
        } catch (e) {
            done();
        }
    });

    test('Create new chain and add same name middleware again', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('middleware_name', string_any_middleware, {weight: 23, config: string_config});
            done(new Error('Using same middleware_name is forbidden'));
        } catch (e) {
            done();
        }
    });

    test('Get middleware weigth extrema', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('extrema_name1', string_any_middleware, {weight: -10, config: string_config});
            mdwc.addMiddleware('extrema_name2', string_any_middleware, {weight: 2, config: string_config});
            mdwc.addMiddleware('extrema_name3', string_any_middleware, {weight: 300, config: string_config});
            const lowest = mdwc.getLowestMiddleware();
            const highest = mdwc.getHighestMiddleware();
            if (lowest !== -10 || highest !== 300) return done(new Error('Invalid extrema'));
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Get middleware weigth extrema with empty chain', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            const lowest = mdwc.getLowestMiddleware();
            const highest = mdwc.getHighestMiddleware();
            if (lowest !== 0 || highest !== 0) return done(new Error('Invalid extrema'));
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Get list of middlewares', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('middleware_name1', string_any_middleware, {weight: 1, config: string_config});
            mdwc.addMiddleware('middleware_name2', string_any_middleware, {weight: 2, config: string_config});
            mdwc.addMiddleware('middleware_name3', string_any_middleware, {weight: 3, config: string_config});
            const list = mdwc.getMiddlewareList();
            if (list.length !== 3) return done(new Error('Invalid amount of middlewares'));
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Run middlewares', async (done: Done) => {
        try {
            const result = await mdwc.run('');
            if (result !== 'aaa') return done(new Error('Invalid end of chain data'));
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Run middlewares with interuption', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('interupt1', string_any_middleware, {weight: 2, config: string_config});
            mdwc.addMiddleware('interupt2', string_any_middleware, {weight: 1, config: string_config});
            mdwc.addMiddleware('interupt3', string_any_middleware, {weight: 4, config: string_config});
            mdwc.addMiddleware('interupt4', string_any_middleware_end, {weight: 3, config: string_config});
            const result = await mdwc.run('');
            if (result !== 'aa') return done(new Error('Invalid end of chain data'));
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Run middlewares with error', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('error1', string_any_middleware, {weight: 2, config: string_config});
            mdwc.addMiddleware('error2', string_any_middleware, {weight: 1, config: string_config});
            mdwc.addMiddleware('error3', string_any_middleware, {weight: 4, config: string_config});
            mdwc.addMiddleware('error4', string_any_middleware_error, {weight: 3, config: string_config});
            await mdwc.run('');
            done(new Error('Should throw'));
        } catch (e) {
            done();
        }
    });

    test('Run working configs', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('ok_config1', string_any_middleware, {weight: 1, config: string_config});
            mdwc.addMiddleware('ok_config2', string_any_middleware, {weight: 2});
            mdwc.addMiddleware('ok_config3', string_any_middleware, {weight: 3, config: string_config});
            await mdwc.configure({});
            done();
        } catch (e) {
            done(e);
        }
    });

    test('Run non working configs', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('ko_config1', string_any_middleware, {weight: 3, config: string_config});
            mdwc.addMiddleware('ko_config2', string_any_middleware, {weight: 2});
            mdwc.addMiddleware('ko_config3', string_any_middleware, {weight: 1, config: string_config_false});
            await mdwc.configure({})
            done(new Error('Configuration should not be valid'));
        } catch (e) {
            done();
        }
    });

});
