export { EventEmitter }          from 'events';
import { EventEmitter }          from 'events';
import { MiddlewareNamingRegex } from './Utils';

/**
 *  Interface for constructor options.
 *
 * @interface MiddlewareOptions
 * @param {number} weigth Weigth of current middleware
 */
export interface MiddlewareOptions<ConfigType = any> {
    weight?: number;
    config?: MiddlewareConfig<ConfigType>;
    before?: string[];
    after?: string[];
    require?: string[];
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
 * @param {DataType} payload Data probably exiting chain
 */
export interface MiddlewareActionEnd<DataType = any> extends MiddlewareAction<DataType> {
    payload: DataType;
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

/**
 * Middleware Class. Fancy callback encapsulation. Used to be chained before actions. Useful for plugin-based projects.
 *
 * ```typescript
 *
 * // Create your middleware callback
 * const append_a_middleware: MiddlewareFunction<string, any> = (data: string, env: any, next: MiddlewareNext<string>, event: MiddlewareEvent): void => {
 *
 *    // Emit your events
 *    event('my_own_custom_event', data);
 *
 *    // Send an action to the MiddlewareCHhain
 *    next({
 *        type: MiddlewareActionTypes.Continue,
 *        payload: data + (env.letter || '?')
 *    } as MiddlewareActionContinue<string>);
 * };
 *
 * // Create your custom config checker
 * const config_checker: MiddlewareConfig<string> = async (config: string): Promise<boolean> => {
 *      return (config.properly_configured);
 * };
 *
 * // Give weight to your Middleware and it would get sorted in the MiddlewareChain. Higher has more priority.
 * const weight = 123;
 *
 * // Give your own event emitter
 * const event_emitter = new EventEmitter();
 *
 * const middleware = new Middleware('my_very_own_middleware', append_a_middleware, event_emitter, {weight: weight, config: config_checker});
 *
 * // Calls your config_checker. If no config checker is set, always returns true.
 * middleware.configure({properly_configured: true});
 *
 * // true
 *
 * // Run your middleware. You should always return a MiddlewareAction implementation (like MiddlewareActionContinue)
 * middleware.run('the first letter of the alphabet is ', {letter: 'a'});
 *
 * //   {
 * //       type: MiddlewareActionTypes.Continue,
 * //       payload: 'the first letter of the alphabet is a'
 * //   }
 *
 * ```
 *
 * @param DataType The data going through the {@link Middleware} instances can be extended from the DataType.
 * @param EnvType Type of the env given to all the {@link Middleware} instances. The Env is a mean of communication between {@link Middleware} instances, caching, data saving ...
 * @param ConfigType Type of the config object given when called the configure method.
 */
export class Middleware<DataType = any, EnvType = any, ConfigType = any> {

    /**
     * Name of the {@link Middleware}.
     */
    public readonly name: string;

    /**
     * Weight of the {@link Middleware}. Defaults to 0.
     */
    public weight: number = 0;

    /**
     * {@link Middleware} function.
     */
    private readonly mdw: MiddlewareFunction<DataType, EnvType>;

    /**
     * {@link Middleware} configuration checker.
     */
    private config: MiddlewareConfig<ConfigType>;

    /**
     * Event emitter exposed in the {@link Middleware} function.
     */
    private readonly event: EventEmitter;

    /**
     * Creates a {@link Middleware}.
     *
     * @param {string} _name Name to give to the {@link Middleware}
     * @param {MiddlewareFunction} _mdw {@link Middleware} function
     * @param {EventEmitter} _event Event Emitter for the {@link Middleware} function
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
     * Sends configuration to {@link Middleware}. Allows config check.
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
     * Run {@link Middleware} function and recover {@link MiddlewareAction}
     *
     * @param _data Data to send to {@link Middleware} function
     * @param _env Env to send to {@link Middleware} function
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
     * Emit encapsulation. Used to wrap event with {@link Middleware} name.
     *
     * @param _event_name Name of events. Will be combined with name of {@link Middleware}.
     * @param args Arguments forwarded to event emitter.
     * @private
     */
    private _emit_event(_event_name: string, ...args: any[]): void {
        if (!MiddlewareNamingRegex.test(_event_name)) throw new Error('Invalid event name. Should match regExp ^[a-zA-Z0-9_]{1,32}$');
        this.event.emit(this.name + ':' + _event_name, ...args);
    }

}
