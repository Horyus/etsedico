import * as UDP from 'dgram';
import { MiddlewareChain }                                     from './MiddlewareChain';
import { EventEmitter, MiddlewareFunction, MiddlewareOptions } from './Middleware';
import { PathNamingRegex }                                     from './Utils';
import { IBushPlugin }                                         from './IBushPlugin';

/**
 * Type of Env
 */
export type Env = any;

/**
 * Options for constructin Bush
 *
 * @param {Env} env Custom env. Useful if needed elsewhere.
 * @param {EventEmitter} event Custom Event Emitter. Useful if needed elsewhere.
 */
export interface BushOptions {
    env?: Env;
    event?: EventEmitter;
}

/**
 * DataType for the Pre-Send {@link MiddlewareChain} instance.
 */
export interface PreSendDT {
    ip?: string;
    port?: number;
    data?: Buffer[];
}

/**
 * DataType for the Post-Send {@link MiddlewareChain} instance.
 */
export interface PostSendDT {
    ip?: string;
    port?: number;
    data?: Buffer[];
}

/**
 * DataType for the Receive {@link MiddlewareChain} instance.
 */
export interface ReceiveDT {
    info?: any;
    data?: Buffer;
    __interrupt_signal?: Boolean;
}

/**
 * DataType for the Any {@link MiddlewareChain} instance.
 */
export interface AnyDT {
    action?: string;
    payload?: any;
}

/**
 * DataType for the Pre-Listen {@link MiddlewareChain} instance.
 */
export type ListenDT = void;

/**
 * DataType for the Pre-Bind {@link MiddlewareChain} instance.
 */
export interface PreBindDT {
    ip?: string;
    port?: number;
}

/**
 * DataType for the Post-Bind {@link MiddlewareChain} instance.
 */
export interface PostBindDT {
    ip?: string;
    port?: number;
}

/**
 * DataType for the Error {@link MiddlewareChain} instance.
 */
export interface ErrorDT {
    error?: Error;
}

/**
 * Interface returned when requesting a {@link Bush.getMiddlewareSummary}
 */
export interface MiddlewareSummay {
    [key: string]: string[];
}

/**
 * Type of the callback triggered when a new message has been treated by the receive_mdw {@link MiddlewareChain} correctly.
 */
export type OnMessageFunction<CustomDataType extends ReceiveDT = ReceiveDT> = (data: CustomDataType) => void;

/**
 * Bidirectional UDP Socket Handler. Uses the UTP-Punch implementation of the UTP protocol and wrap every method and
 * logic around async methods and {@link MiddlewareChain} instances.
 * Logic is that the UDP Socket is used both as Server and Client and is able to connect or to receive connections.
 *
 * ```typescript
 *
 * const my_custom_env = {};
 * const my_custom_event_emitter = new EventEmitter();
 *
 * const bush = new Bush({env: my_custom_env, event: my_custom_event_emitter});
 *
 * ```
 *
 */
export class Bush {

    /**
     * UDP Socket. Can be used both as Server and Client. Ability to Punch.
     *
     * TODO: remove when needed as cannot instanciate in constructor.
     */
    private udp: UDP.Socket;

    /**
     * Event Emitter available in all {@link Middleware} instances.
     */
    private readonly event: EventEmitter;

    /**
     * Env available in all {@link Middleware} instances.
     */
    private readonly env: Env;

    /**
     * Configuration object given to all {@link Middleware} instances.
     */
    private readonly config: any = {};

    private readonly pre_send_mdw: MiddlewareChain<PreSendDT, Env>;
    private readonly post_send_mdw: MiddlewareChain<PostSendDT, Env>;

    private readonly receive_mdw: MiddlewareChain<ReceiveDT, Env>;

    private readonly any_mdw: MiddlewareChain<AnyDT, Env>;

    private readonly listen_mdw: MiddlewareChain<ListenDT, Env>;

    private readonly pre_bind_mdw: MiddlewareChain<PreBindDT, Env>;
    private readonly post_bind_mdw: MiddlewareChain<PostBindDT, Env>;

    private readonly error_mdw: MiddlewareChain<ErrorDT, Env>;

    private readonly message_callbacks: OnMessageFunction[] = [];

    private readonly plugins: IBushPlugin[] = [];

    /**
     * Create an instance of Bush - Bidirectional UDP Socket Handler
     *
     * @param {BushOptions} _options
     */
    public constructor(_options?: BushOptions) {
        this.env = _options ? (_options.env || {}) : {};
        this.event = _options ? (_options.event || new EventEmitter()) : new EventEmitter();

        this.pre_send_mdw = new MiddlewareChain<PreSendDT, Env>(this.event, this.env);
        this.post_send_mdw = new MiddlewareChain<PostSendDT, Env>(this.event, this.env);

        this.receive_mdw = new MiddlewareChain<ReceiveDT, Env>(this.event, this.env);

        this.any_mdw = new MiddlewareChain<AnyDT, Env>(this.event, this.env);

        this.listen_mdw = new MiddlewareChain<ListenDT, Env>(this.event, this.env);

        this.pre_bind_mdw = new MiddlewareChain<PreBindDT, Env>(this.event, this.env);
        this.post_bind_mdw = new MiddlewareChain<PostBindDT, Env>(this.event, this.env);

        this.error_mdw = new MiddlewareChain<ErrorDT, Env>(this.event, this.env);
    }

    /**
     * Start the socket.
     */
    public async start(): Promise<void> {
        this._plug();
        await this._configure();
        this.udp = UDP.createSocket('udp4');

        this.udp.on('listening', async () => {
            await this.any_mdw.run({action: 'listen', payload: undefined});
            await this.listen_mdw.run(void 0);
            this.event.emit('core:listen');
        });

        this.udp.on('message', async (msg: Buffer, rinfo: any) => {
            const treated = await this.receive_mdw.run({data: msg, info: rinfo});
            if (treated.__interrupt_signal) return ;
            this.event.emit('core:receive');
            for (const callback of this.message_callbacks) {
                callback(treated);
            }
        });

        this.udp.on('error', async (error: Error) => {
            await this.error_mdw.run({error});
        });

    }

    /**
     * Returns a {@link MiddlewareSummay} of all currently plugged {@link Middleware} instances. Useful for debugging purposes.
     */
    public getMiddlewareSummary(): MiddlewareSummay {
        const ret: MiddlewareSummay = {};
        ret['pre_send_mdw'] = this.pre_send_mdw.getMiddlewareList();
        ret['post_send_mdw'] = this.post_send_mdw.getMiddlewareList();

        ret['receive_mdw'] = this.receive_mdw.getMiddlewareList();

        ret['any_mdw'] = this.any_mdw.getMiddlewareList();

        ret['listen_mdw'] = this.listen_mdw.getMiddlewareList();

        ret['pre_bind_mdw'] = this.pre_bind_mdw.getMiddlewareList();
        ret['post_bind_mdw'] = this.post_bind_mdw.getMiddlewareList();

        ret['error_mdw'] = this.post_bind_mdw.getMiddlewareList();

        return ret;
    }

    /**
     * Add {@link Middleware} to `pre_send_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before the send method has been called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPreSendMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PreSendDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PreSendDT, Env, ConfigType>('pre_send', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `post_send_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after the send method has been called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPostSendMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PostSendDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PostSendDT, Env, ConfigType>('post_send', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `receive_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called right after receiving a new message.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addReceiveMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<ReceiveDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<ReceiveDT, Env, ConfigType>('receive', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `any_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after any type of action.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addAnyMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<AnyDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<AnyDT, Env, ConfigType>('any', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `listen_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after the listening event is triggered.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addListenMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<ListenDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<ListenDT, Env, ConfigType>('listen', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `pre_bind_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before bind method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPreBindMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PreBindDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PreBindDT, Env, ConfigType>('pre_bind', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `post_bind_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after bind method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPostBindMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PostBindDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PostBindDT, Env, ConfigType>('post_bind', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `error_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after any error from the udp socket.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addErrorMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<ErrorDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<ErrorDT, Env, ConfigType>('error', _name, _mdw_func, _options);
    }

    /**
     * Send method. You can give any argument as long as it extends the {@link PreSendDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: send -> pre_send_mdw -> _send -> post_send_mdw
     *
     * @param payload
     */
    public async send<CustomDataType extends PreSendDT = PreSendDT>(payload: CustomDataType): Promise<PostSendDT> {
        await this.any_mdw.run({action: 'pre_send', payload});
        const result = await this.pre_send_mdw.run(payload);
        if (!result || !result.data || !result.ip || !result.port) throw new Error(`Invalid Payload after pre_send Middleware Chain`);
        for (const buffer of result.data) {
            await this._send(result.ip, result.port, buffer);
        }
        this.event.emit('core:send', result);
        await this.any_mdw.run({action: 'post_send', payload: result});
        return await this.post_send_mdw.run(result);
    }

    /**
     * Bind method. You can give any argument as long as it extends the {@link PreBindDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: bind -> pre_bind_mdw -> _bind -> post_bind_mdw
     *
     * @param payload
     */
    public async bind<CustomDataType extends PreBindDT = PreBindDT>(payload: CustomDataType): Promise <PostBindDT> {
        await this.any_mdw.run({action: 'pre_bind', payload});
        const result = await this.pre_bind_mdw.run(payload);
        if (!result || !result.ip || !result.port) throw new Error('Invalid Payload after pre_bind Middleware Chain');
        await this._bind(result.ip, result.port);
        this.event.emit('core:bind', result);
        await this.any_mdw.run({action: 'post_bind', payload: result});
        return await this.post_bind_mdw.run(result);
    }

    /**
     * onMessage callback. The argument must be a callback triggered a the end of the receive_mdw chain.
     * Pipeline: *receive data* -> receive_mdw -> _cb
     *
     * @param {OnMessageFunction} _cb
     */
    public onMessage<CustomDataType extends ReceiveDT = ReceiveDT>(_cb: OnMessageFunction<CustomDataType>): void {
        this.message_callbacks.push(_cb);
    }

    /**
     * Getter for the env.
     */
    public get Env(): Env {
        return this.env;
    }

    public setEnv(path: string, data: any): void {
        let navigator = this.env;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
            navigator = navigator[complete_path[path_bit]];
        }
        navigator[complete_path[path_bit]] = data;
    }

    /**
     * Add data at provided path. Make use of spread operator to merge with data already there (if any).
     *
     * @param {string} path A path to the data to add (example 'foo.bar.test')
     * @param {any} data Data to add
     */
    public addEnv(path: string, data: any): void {
        let navigator = this.env;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
            navigator = navigator[complete_path[path_bit]];
        }
        if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
        navigator[complete_path[path_bit]] = {
            ...data,
            ...navigator[complete_path[path_bit]]
        };
    }

    /**
     * Add data at provided path. Make use of spread operator to merge with data already there (if any).
     * Interpret the path as an array.
     *
     * @param {string} path A path to the data to add (example 'foo.bar.test')
     * @param {any} data Data to add
     */
    public pushEnv(path: string, data: any): void {
        let navigator = this.env;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
            navigator = navigator[complete_path[path_bit]];
        }
        if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = [];
        navigator[complete_path[path_bit]] = [
            ...navigator[complete_path[path_bit]],
            data
        ];
    }

    /**
     * Remove the data at the provided path
     *
     * @param {string} path A path to the data to remove (example 'foo.bar.test')
     */
    public removeEnv(path: string): void {
        let navigator = this.env;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) throw new Error('Invalid path');
            navigator = navigator[complete_path[path_bit]];
        }
        delete navigator[complete_path[path_bit]];
    }

    /**
     * Getter for the config.
     */
    public get Config(): any {
        return this.config;
    }

    /**
     * Set data at provider path. Replace data.
     *
     * @param {string} path A path to the data to set (example 'foo.bar.test')
     * @param {any} data Data to set
     */
    public setConfig(path: string, data: any): void {
        let navigator = this.config;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
            navigator = navigator[complete_path[path_bit]];
        }
        navigator[complete_path[path_bit]] = data;
    }

    /**
     * Add data at provided path. Make use of spread operator to merge with data already there (if any).
     *
     * @param {string} path A path to the data to add (example 'foo.bar.test')
     * @param {any} data Data to add
     */
    public addConfig(path: string, data: any): void {
        let navigator = this.config;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
            navigator = navigator[complete_path[path_bit]];
        }
        if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
        navigator[complete_path[path_bit]] = {
            ...data,
            ...navigator[complete_path[path_bit]]
        };
    }

    /**
     * Add data at provided path. Make use of spread operator to merge with data already there (if any).
     * Interpret the path as an array.
     *
     * @param {string} path A path to the data to add (example 'foo.bar.test')
     * @param {any} data Data to add
     */
    public pushConfig(path: string, data: any): void {
        let navigator = this.config;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = {};
            navigator = navigator[complete_path[path_bit]];
        }
        if (!navigator[complete_path[path_bit]]) navigator[complete_path[path_bit]] = [];
        navigator[complete_path[path_bit]] = [
            ...navigator[complete_path[path_bit]],
            data
        ];
    }

    /**
     * Remove the data at the provided path
     *
     * @param {string} path A path to the data to remove (example 'foo.bar.test')
     */
    public removeConfig(path: string): void {
        let navigator = this.config;
        let path_bit = 0;
        const complete_path = Bush._path_to_array(path);
        for (; path_bit < complete_path.length - 1; ++path_bit) {
            if (!navigator[complete_path[path_bit]]) throw new Error('Invalid path');
            navigator = navigator[complete_path[path_bit]];
        }
        delete navigator[complete_path[path_bit]];
    }

    /**
     * Add plugin to plugin list. Inject happens only when start is called.
     *
     * @param {IBushPlugin} plugin Class implementing the IBushPlugin interface.
     */
    public plug(plugin: IBushPlugin): void {
        this.plugins.push(plugin);
        this.pushConfig('loaded.plugins', plugin.name);
    }

    private _add_mdw<DataType = any, EnvType = any, ConfigType = any>(_where: string, _name: string, _mdw_func: MiddlewareFunction<DataType, EnvType>, _options?: MiddlewareOptions<ConfigType>): void {

        _where = _where + '_mdw';

        if (!this[_where]) throw new Error(`Invalid middleware addition. No such MiddlewareChain '${_where}'`);

        (<MiddlewareChain<DataType, EnvType, ConfigType>> this[_where]).addMiddleware(_name, _mdw_func, _options);
        this.pushConfig('loaded.middlewares', _name);
    }

    private static _path_to_array(path: string): string[] {
        const splitted = path.split('.');
        for (const split of splitted) {
            if (!PathNamingRegex.test(split)) throw new Error(`Invalid name in path '${split}'`);
        }
        return splitted;
    }

    private async _bind(_ip: string, _port: number): Promise<void> {
        return new Promise<void>((ok: any, ko: any): void => {
            if (!this.udp) return ko(new Error('UDP Socket not created'));

            this.udp.bind(_port, _ip, (): void => {
                ok();
            });

        });
    }

    private async _send(_ip: string, _port: number, _data: Buffer): Promise<void> {
        return new Promise<void>((ok: any, ko: any): void => {
            if (!this.udp) return ko(new Error('UDP Socket not created'));

            this.udp.send(_data, 0, _data.length, _port, _ip, () => {
                ok();
            });
        });
    }

    private async _configure(): Promise<void> {
        await this.pre_send_mdw.configure(this.config);
        if (!this.pre_send_mdw.resolved) throw new Error(`Missing dependencies in pre_send ${JSON.stringify(this.pre_send_mdw.missing_dependencies)}`);
        await this.post_send_mdw.configure(this.config);
        if (!this.post_send_mdw.resolved) throw new Error(`Missing dependencies in post_send ${JSON.stringify(this.post_send_mdw.missing_dependencies)}`);

        await this.receive_mdw.configure(this.config);
        if (!this.receive_mdw.resolved) throw new Error(`Missing dependencies in receive ${JSON.stringify(this.receive_mdw.missing_dependencies)}`);

        await this.any_mdw.configure(this.config);
        if (!this.any_mdw.resolved) throw new Error(`Missing dependencies in any ${JSON.stringify(this.any_mdw.missing_dependencies)}`);

        await this.listen_mdw.configure(this.config);
        if (!this.listen_mdw.resolved) throw new Error(`Missing dependencies in listen ${JSON.stringify(this.listen_mdw.missing_dependencies)}`);

        await this.pre_bind_mdw.configure(this.config);
        if (!this.pre_bind_mdw.resolved) throw new Error(`Missing dependencies in pre_bind ${JSON.stringify(this.pre_bind_mdw.missing_dependencies)}`);
        await this.post_bind_mdw.configure(this.config);
        if (!this.post_bind_mdw.resolved) throw new Error(`Missing dependencies in post_bind ${JSON.stringify(this.post_bind_mdw.missing_dependencies)}`);

        await this.error_mdw.configure(this.config);
        if (!this.error_mdw.resolved) throw new Error(`Missing dependencies in error ${JSON.stringify(this.error_mdw.missing_dependencies)}`);
    }

    private _plug(): void {
        for (const plugin of this.plugins) {
            try {
                plugin.inject(this);
            } catch (e) {
                throw new Error(`In Plugin ${plugin.name}: ${e.message}`);
            }
        }
    }

}
