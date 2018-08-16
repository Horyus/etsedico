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

    test('Try correct before configuration', async (done: Done) => {
        mdwc = new MiddlewareChain(event, env);
        mdwc.addMiddleware('middleware_name4', string_any_middleware, {weight: 11, config: string_config});
        mdwc.addMiddleware('middleware_name6', string_any_middleware, {weight: 10, config: string_config});
        mdwc.addMiddleware('middleware_name5', string_any_middleware, {config: string_config, before: ['middleware_name6']});
        if (mdwc.getMiddlewareList()[1] !== '<middleware_name5 11>') done(new Error('Invalid Middleware Weight'));
        done();
    });

    test('Try correct multi before configuration', async (done: Done) => {
        mdwc = new MiddlewareChain(event, env);
        mdwc.addMiddleware('multi_before_name4', string_any_middleware, {weight: -10, config: string_config});
        mdwc.addMiddleware('multi_before_name6', string_any_middleware, {weight: 10, config: string_config});
        mdwc.addMiddleware('multi_before_name5', string_any_middleware, {config: string_config, before: ['multi_before_name6', 'multi_before_name4']});
        if (mdwc.getMiddlewareList()[0] !== '<multi_before_name5 11>') done(new Error('Invalid Middleware Weight'));
        done();
    });

    test('Try incorrect before configuration', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('invalid_middleware6', string_any_middleware, {config: string_config, before: ['middleware_name6']});
            done(new Error('Should throw'));
        } catch (e) {
            done();
        }
    });

    test('Try correct after configuration', async (done: Done) => {
        mdwc = new MiddlewareChain(event, env);
        mdwc.addMiddleware('middleware_namee4', string_any_middleware, {weight: 9, config: string_config});
        mdwc.addMiddleware('middleware_namee6', string_any_middleware, {weight: 10, config: string_config});
        mdwc.addMiddleware('middleware_namee5', string_any_middleware, {config: string_config, after: ['middleware_namee6']});
        if (mdwc.getMiddlewareList()[2] !== '<middleware_namee5 9>') done(new Error('Invalid Middleware Weight'));
        done();
    });

    test('Try correct multi after configuration', async (done: Done) => {
        mdwc = new MiddlewareChain(event, env);
        mdwc.addMiddleware('multi_after_namee4', string_any_middleware, {weight: -10, config: string_config});
        mdwc.addMiddleware('multi_after_namee6', string_any_middleware, {weight: 10, config: string_config});
        mdwc.addMiddleware('multi_after_namee5', string_any_middleware, {config: string_config, after: ['multi_after_namee6', 'multi_after_namee4']});
        if (mdwc.getMiddlewareList()[1] !== '<multi_after_namee5 9>') done(new Error('Invalid Middleware Weight'));
        done();
    });

    test('Try incorrect after configuration', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('invalid_middleware5', string_any_middleware, {
                config: string_config,
                after: ['middleware_namee6']
            });
            done(new Error('Should throw'));
        } catch (e) {
            done();
        }
    });

    test('Try correct before/after configuration', async (done: Done) => {
        mdwc = new MiddlewareChain(event, env);
        mdwc.addMiddleware('middleware_name7', string_any_middleware, {weight: 10, config: string_config});
        mdwc.addMiddleware('middleware_name8', string_any_middleware, {weight: -10, config: string_config});
        mdwc.addMiddleware('middleware_name9', string_any_middleware, {config: string_config, after: ['middleware_name7'], before: ['middleware_name8']});
        if (mdwc.getMiddlewareList()[1] !== '<middleware_name9 0>') done(new Error('Invalid Middleware Weight'));
        done();
    });

    test('Try incorrect before/after configuration', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('middleware_name10', string_any_middleware, {weight: -10, config: string_config});
            mdwc.addMiddleware('middleware_name11', string_any_middleware, {weight: 10, config: string_config});
            mdwc.addMiddleware('middleware_name12', string_any_middleware, {
                config: string_config,
                after: ['middleware_name10'],
                before: ['middleware_name11']
            });
            done(new Error('Should throw'));
        } catch (e) {
            done();
        }
    });

    test('Try incorrect before/after configuration', async (done: Done) => {
        try {
            mdwc = new MiddlewareChain(event, env);
            mdwc.addMiddleware('middleware_name13', string_any_middleware, {weight: 1, config: string_config});
            mdwc.addMiddleware('middleware_name14', string_any_middleware, {weight: 2, config: string_config});
            mdwc.addMiddleware('middleware_name15', string_any_middleware, {
                config: string_config,
                after: ['middleware_name13'],
                before: ['middleware_name14']
            });
            done(new Error('Should throw'));
        } catch (e) {
            done();
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
