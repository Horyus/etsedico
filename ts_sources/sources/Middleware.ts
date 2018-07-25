import { EventEmitter } from 'events';

export { EventEmitter } from 'events';

import { MiddlewareNamingRegex } from './Utils';

/**
 *  Interface for constructor options.
 *
 * @interface MiddlewareOptions
 * @param {number} weigth Weigth of current middleware
 */
export interface MiddlewareOptions<ConfigType = any> {
    weight?: number;
    config: MiddlewareConfig<ConfigType>;
}

/**
 * Enumeration with action types.
 *
 * @enum MiddlewareActionTypes
 */
export enum MiddlewareActionTypes {
    Continue = 0,
    End,
    Error
}

/**
 * Interface for actions. Actions implementation should extend it.
 *
 * @interface MiddlewareAction
 * @param {number} type Type of current action
 */
export interface MiddlewareAction<DataType> {
    type: number;
}

/**
 * Continue action implementation.
 *
 * @interface MiddlewareActionContinue
 * @param {DataType} payload Data travelling to next middleware
 */
export interface MiddlewareActionContinue<DataType = any> extends MiddlewareAction<DataType> {
    payload: DataType;
}

/**
 * End action implementation.
 *
 * @interface MiddlewareActionEnd
 */
export interface MiddlewareActionEnd<DataType = any> extends MiddlewareAction<DataType> {

}

/**
 * Error action implementation.
 *
 * @interface MiddlewareActionEnd
 * @param {Error} error Error to throw on high level
 */
export interface MiddlewareActionError<DataType = any> extends MiddlewareAction<DataType> {
    error: Error;
}

/**
 * Type definition for the next callback.
 *
 * @type MiddlewareNext
 */
export type MiddlewareNext<DataType = any> = (action: MiddlewareAction<DataType>) => void;

/**
 * Event emission encapsulation
 *
 * @type MiddlewareEvent
 */
export type MiddlewareEvent = (event_name: string, ...args: any[]) => void;

/**
 * Type definition for the middleware function.
 *
 * @type MiddlewareFunction
 */
export type MiddlewareFunction<DataType = any, EnvType = any> = (data: DataType,
                                                                 env: EnvType,
                                                                 next: MiddlewareNext<DataType>,
                                                                 event: MiddlewareEvent) => void;

export type MiddlewareConfig<ConfigType = any> = (config: ConfigType) => Promise<boolean>;

/** Middleware class */
export class Middleware<DataType = any, EnvType = any, ConfigType = any> {

    /**
     * Name of the middleware.
     */
    public readonly name: string;

    /**
     * Weight of the middleware. Defaults to 0.
     */
    public weight: number = 0;

    /**
     * Middleware function.
     */
    private readonly mdw: MiddlewareFunction<DataType, EnvType>;

    /**
     * Middleware configuration checker.
     */
    private config: MiddlewareConfig<ConfigType>;

    /**
     * Event emitter exposed in the middleware function.
     */
    private readonly event: EventEmitter;

    /**
     * Creates a Middleware.
     *
     * @param {string} _name Name to give to the middleware
     * @param {MiddlewareFunction} _mdw Middleware function
     * @param {EventEmitter} _event Event Emitter for the middleware function
     * @param {MiddlewareOptions} _options Deep options configuration
     */
    public constructor(_name: string,
                       _mdw: MiddlewareFunction<DataType, EnvType>,
                       _event: EventEmitter,
                       _options?: MiddlewareOptions<ConfigType>) {

        if (!_name || !_mdw || !_event) {
            throw new Error('Missing argument while creating Middleware instance');
        }

        if (!MiddlewareNamingRegex.test(_name)) {
            throw new Error('Invalid Middleware name. Should match regExp ^[a-zA-Z0-9_]{1,32}$');
        }

        this.name = _name;
        this.mdw = _mdw;
        this.event = _event;

        if (_options) this._load_options(_options);

    }

    /**
     * Sends configuration to middleware. Allows config check.
     *
     * @param _config
     */
    public async configure(_config: ConfigType): Promise<boolean> {
        if (!this.config) {
            return Promise.resolve<boolean>(true);
        } else {
            return (this.config(_config));
        }
    }

    /**
     * Run middleware function and recover MiddlewareAction
     *
     * @param _data Data to send to middleware function
     * @param _env Env to send to middleware function
     */
    public async run(_data: DataType, _env: EnvType): Promise<MiddlewareAction<DataType>> {
        return new Promise<MiddlewareAction<DataType>>(async (ok: any, ko: any): Promise<void> => {

            const next: MiddlewareNext<DataType> = (action: MiddlewareAction<DataType>): void => {
                ok(action);
            };

            try {
                this.mdw(_data, _env, next, this._emit_event.bind(this));
            } catch (e) {
                ok({
                    type: MiddlewareActionTypes.Error,
                    error: e
                } as MiddlewareActionError<DataType>);
            }

        });
    }

    /**
     * Loads options.
     *
     * @param {MiddlewareOptions} _options Options to load into class
     * @private
     */
    private _load_options(_options: MiddlewareOptions<ConfigType>): void {
        if (_options.weight) this.weight = _options.weight;
        if (_options.config) this.config = _options.config;
    }

    /**
     * Emit encapsulation. Used to wrap event with middleware name.
     *
     * @param _event_name Name of events. Will be combined with name of middleware.
     * @param args Arguments forwarded to event emitter.
     * @private
     */
    private _emit_event(_event_name: string, ...args: any[]): void {
        if (!MiddlewareNamingRegex.test(_event_name)) throw new Error('Invalid event name. Should match regExp ^[a-zA-Z0-9_]{1,32}$');
        this.event.emit(this.name + ':' + _event_name, ...args);
    }

}
