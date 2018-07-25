declare var describe;
declare var test;
declare var expect;

import {
    EventEmitter,
    Middleware, MiddlewareActionContinue,
    MiddlewareActionTypes,
    MiddlewareConfig, MiddlewareEvent,
    MiddlewareFunction,
    MiddlewareNext,
    MiddlewareOptions
} from './Middleware';

let mdw;
const event = new EventEmitter();

const string_any_middleware: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    event('loaded', data);
    next({
        type: MiddlewareActionTypes.Continue,
        payload: data
    } as MiddlewareActionContinue<string>);
};

const string_any_middleware_illegal_event_name: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    event('loaded+', data);
    next({
        type: MiddlewareActionTypes.Continue,
        payload: data
    } as MiddlewareActionContinue<string>);
};

const string_any_middleware_throw: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
    throw new Error('Test throw');
};

const string_config: MiddlewareConfig<string> = async (config: string): Promise<boolean> => {
    return false;
};

type Done = (reason?: Error) => void;

describe('Middleware Test Suite', () => {

    test('Constructing without name and <string, any>mdw', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, any>(undefined, string_any_middleware, event);
            done(new Error('Should throw when missing mandatory argument'));
        } catch (e) {
            return done();
        }
    });

    test('Constructing with invalid name and <string, any>mdw', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, any>('hello+world', string_any_middleware, event);
            done(new Error('Should throw when name is invalid'));
        } catch (e) {
            return done();
        }
    });

    test('Constructing with name and <string, any>mdw', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, any>('middleware_name', string_any_middleware, event);

            if (mdw.name !== 'middleware_name') {
                return done(new Error('Invalid Name'));
            }

            if (mdw.weight !== 0) {
                return done(new Error('Invalid Weight'));
            }

            if (!await mdw.configure('test')) {
                return done(new Error('Invalid Configuration result'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

    test('Constructing with name, <string, any>mdw and empty options', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, any>('middleware_name', string_any_middleware, event, {} as MiddlewareOptions<any>);

            if (mdw.name !== 'middleware_name') {
                return done(new Error('Invalid Name'));
            }

            if (mdw.weight !== 0) {
                return done(new Error('Invalid Weight'));
            }

            if (!await mdw.configure('test')) {
                return done(new Error('Invalid Configuration result'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

    test('Constructing with name, <string, any>mdw and weigth', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, any>('middleware_name', string_any_middleware, event, {weight: 23} as MiddlewareOptions<any>);

            if (mdw.name !== 'middleware_name') {
                return done(new Error('Invalid Name'));
            }

            if (mdw.weight !== 23) {
                return done(new Error('Invalid Weight'));
            }

            if (!await mdw.configure('test')) {
                return done(new Error('Invalid Configuration result'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

    test('Constructing with name, <string, any>mdw and config', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, string>('middleware_name', string_any_middleware, event, {config: string_config} as MiddlewareOptions<string>);

            if (mdw.name !== 'middleware_name') {
                return done(new Error('Invalid Name'));
            }

            if (mdw.weight !== 0) {
                return done(new Error('Invalid Weight'));
            }

            if (await mdw.configure('test')) {
                return done(new Error('Invalid Configuration result'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

    test('Run middleware', async (done: Done) => {
        try {
            const result = await mdw.run('hello', {});

            if (result.type !== 0) {
                return done(new Error('Invalid result type'));
            }

            if (result.payload !== 'hello') {
                return done(new Error('Invalid payload'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

    test('Run throwing middleware', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, string>('middleware_name', string_any_middleware_throw, event, {config: string_config} as MiddlewareOptions<string>);

            if (mdw.name !== 'middleware_name') {
                return done(new Error('Invalid Name'));
            }

            if (mdw.weight !== 0) {
                return done(new Error('Invalid Weight'));
            }

            if (await mdw.configure('test')) {
                return done(new Error('Invalid Configuration result'));
            }

            const result = await mdw.run('hello', {});

            if (result.type !== MiddlewareActionTypes.Error) {
                return done(new Error('Invalid result type'));
            }

            if (result.error.message !== 'Test throw') {
                return done(new Error('Invalid error'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

    test('Run illegal event name', async (done: Done) => {
        try {
            mdw = new Middleware<string, any, string>('middleware_name', string_any_middleware_illegal_event_name, event, {config: string_config} as MiddlewareOptions<string>);

            if (mdw.name !== 'middleware_name') {
                return done(new Error('Invalid Name'));
            }

            if (mdw.weight !== 0) {
                return done(new Error('Invalid Weight'));
            }

            if (await mdw.configure('test')) {
                return done(new Error('Invalid Configuration result'));
            }

            const result = await mdw.run('hello', {});

            if (result.type !== MiddlewareActionTypes.Error) {
                return done(new Error('Invalid result type'));
            }

            if (result.error.message !== 'Invalid event name. Should match regExp ^[a-zA-Z0-9_]{1,32}$') {
                return done(new Error('Invalid error'));
            }

            done();
        } catch (e) {
            return done(e);
        }
    });

});
