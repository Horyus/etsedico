import * as UTP                                                from 'utp-punch';
import * as Socket                                             from 'utp-punch/connection';
import { MiddlewareChain }                                     from './MiddlewareChain';
import { EventEmitter, MiddlewareFunction, MiddlewareOptions } from './Middleware';
import { ConnectionInfos, Signature }                          from './ConnectionInfos';
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
    signature?: Signature;
    data?: Buffer[];
}

/**
 * DataType for the Post-Send {@link MiddlewareChain} instance.
 */
export interface PostSendDT {
    signature?: Signature;
    data?: Buffer[];
}

/**
 * DataType for the Receive {@link MiddlewareChain} instance.
 */
export interface ReceiveDT {
    signature?: Signature;
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
export type PreListenDT = void;

/**
 * DataType for the Post-Listen {@link MiddlewareChain} instance.
 */
export type PostListenDT = void;

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
 * DataType for the New Connection {@link MiddlewareChain} instance.
 */
export interface NewConnectionDT {
    connection?: ConnectionInfos;
}

/**
 * DataType for the New Disconnection {@link MiddlewareChain} instance.
 */
export interface NewDisconnectionDT {
    signature?: Signature;
}

/**
 * DataType for the Post-Connect {@link MiddlewareChain} instance.
 */
export interface PostConnectDT {
    ip?: string;
    port?: number;
}

/**
 * DataType for the Pre-Connect {@link MiddlewareChain} instance.
 */
export interface PreConnectDT {
    ip?: string;
    port?: number;
}

/**
 * DataType for the Post-Disconnect {@link MiddlewareChain} instance.
 */
export interface PostDisconnectDT {
    signature?: Signature;
}

/**
 * DataType for the Pre-Disconnect {@link MiddlewareChain} instance.
 */
export interface PreDisconnectDT {
    signature?: Signature;
}

/**
 * Interface returned when requesting a {@link Bush.getMiddlewareSummary}
 *
 */
export interface MiddlewareSummay {
    [key: string]: string[];
}

/**
 * Type of the callback triggered when a new message has been treated by the receive_mdw {@link MiddlewareChain} correctly.
 */
export type OnMessageFunction<CustomDataType extends ReceiveDT = ReceiveDT> = (data: CustomDataType) => void;

/**
 * Interface used to store all the connections
 */
export interface ConnectionStore {
    [key: string]: ConnectionInfos;
}

/**
 * Bidirectional UTP Socket Handler. Uses the UTP-Punch implementation of the UTP protocol and wrap every method and
 * logic around async methods and {@link MiddlewareChain} instances.
 * Logic is that the UTP Socket is used both as Server and Client and is able to connect or to receive connections.
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
     * UTP Socket. Can be used both as Server and Client. Ability to Punch.
     *
     * TODO: remove when needed as cannot instanciate in constructor.
     */
    private utp: UTP;

    /**
     * Store all the live connections
     */
    public readonly connections: ConnectionStore = {};

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

    private readonly pre_listen_mdw: MiddlewareChain<PreListenDT, Env>;
    private readonly post_listen_mdw: MiddlewareChain<PostListenDT, Env>;

    private readonly pre_bind_mdw: MiddlewareChain<PreBindDT, Env>;
    private readonly post_bind_mdw: MiddlewareChain<PostBindDT, Env>;

    private readonly new_connection_mdw: MiddlewareChain<NewConnectionDT, Env>;
    private readonly new_disconnection_mdw: MiddlewareChain<NewDisconnectionDT, Env>;

    private readonly pre_connect_mdw: MiddlewareChain<PreConnectDT, Env>;
    private readonly post_connect_mdw: MiddlewareChain<PostConnectDT, Env>;

    private readonly pre_disconnect_mdw: MiddlewareChain<PreDisconnectDT, Env>;
    private readonly post_disconnect_mdw: MiddlewareChain<PostDisconnectDT, Env>;

    private readonly message_callbacks: OnMessageFunction[] = [];

    private readonly plugins: IBushPlugin[] = [];

    /**
     * Create an instance of Bush - Bidirectional UTP Socket Handler
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

        this.pre_listen_mdw = new MiddlewareChain<PreListenDT, Env>(this.event, this.env);
        this.post_listen_mdw = new MiddlewareChain<PostListenDT, Env>(this.event, this.env);

        this.pre_bind_mdw = new MiddlewareChain<PreBindDT, Env>(this.event, this.env);
        this.post_bind_mdw = new MiddlewareChain<PostBindDT, Env>(this.event, this.env);

        this.new_connection_mdw = new MiddlewareChain<NewConnectionDT, Env>(this.event, this.env);
        this.new_disconnection_mdw = new MiddlewareChain<NewDisconnectionDT, Env>(this.event, this.env);

        this.post_connect_mdw = new MiddlewareChain<PostConnectDT, Env>(this.event, this.env);
        this.pre_connect_mdw = new MiddlewareChain<PreConnectDT, Env>(this.event, this.env);

        this.post_disconnect_mdw = new MiddlewareChain<PostDisconnectDT, Env>(this.event, this.env);
        this.pre_disconnect_mdw = new MiddlewareChain<PreDisconnectDT, Env>(this.event, this.env);
    }

    /**
     * Start the socket. Binds it. Listen.
     */
    public async start(): Promise<void> {
        this._plug();
        await this._configure();
        this.utp = new UTP(async (socket: any): Promise<void> => {
            const infos = new ConnectionInfos(socket, true);
            const signature = infos.getUniqueSignature();
            socket.on('data', async (data: Buffer): Promise<void> => {
                const result = await this.receive_mdw.run({signature: signature, data: data});
                if (result.__interrupt_signal) return ;
                this.event.emit('core:receive', result);
                for (const callback of this.message_callbacks) {
                    callback(result);
                }
            });

            socket.on('end', async (): Promise<void> => {
                await this.new_disconnection_mdw.run({signature});
                await this.any_mdw.run({action: 'new_disconnection', payload: {signature}});
                if (this.connections[signature]) this._disconnect(signature);
            });

            this.connections[signature] = infos;
            this.event.emit('core:connect', infos);
            await this.new_connection_mdw.run({connection: infos});
            await this.any_mdw.run({action: 'new_connection', payload: infos});
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

        ret['pre_listen_mdw'] = this.pre_listen_mdw.getMiddlewareList();
        ret['post_listen_mdw'] = this.post_listen_mdw.getMiddlewareList();

        ret['pre_bind_mdw'] = this.pre_bind_mdw.getMiddlewareList();
        ret['post_bind_mdw'] = this.post_bind_mdw.getMiddlewareList();

        ret['new_connection_mdw'] = this.new_connection_mdw.getMiddlewareList();
        ret['new_disconnection_mdw'] = this.new_disconnection_mdw.getMiddlewareList();

        ret['pre_connect_mdw'] = this.pre_connect_mdw.getMiddlewareList();
        ret['post_connect_mdw'] = this.post_connect_mdw.getMiddlewareList();

        ret['pre_disconnect_mdw'] = this.pre_disconnect_mdw.getMiddlewareList();
        ret['post_disconnect_mdw'] = this.post_disconnect_mdw.getMiddlewareList();

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
     * Add {@link Middleware} to `pre_listen_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before listen method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPreListenMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PreListenDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PreListenDT, Env, ConfigType>('pre_listen', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `post_listen_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after listen method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPostListenMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PostListenDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PostListenDT, Env, ConfigType>('post_listen', _name, _mdw_func, _options);
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
     * Add {@link Middleware} to `new_connection_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after a new connection is established.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addNewConnectionMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<NewConnectionDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<NewConnectionDT, Env, ConfigType>('new_connection', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `new_disconnection_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called after a new disconnection occurs.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addNewDisconnectionMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<NewDisconnectionDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<NewDisconnectionDT, Env, ConfigType>('new_disconnection', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `pre_connect_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before the connect method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPreConnectMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PreConnectDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PreConnectDT, Env, ConfigType>('pre_connect', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `post_connect_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before the connect method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPostConnectMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PostConnectDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PostConnectDT, Env, ConfigType>('post_connect', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `pre_disconnect_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before the disconnect method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPreDisconnectMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PreDisconnectDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PreDisconnectDT, Env, ConfigType>('pre_disconnect', _name, _mdw_func, _options);
    }

    /**
     * Add {@link Middleware} to `post_disconnect_mdw` {@link MiddlewareChain}. These arguments are forwarded to
     * the addMiddleware method of the {@link MiddlewareChain}.
     * These {@link Middleware} instances are called before the disconnect method is called.
     *
     * @param {string} _name
     * @param {MiddlewareFunction} _mdw_func
     * @param {MiddlewareOptions} _options
     */
    public addPostDisconnectMiddleware<ConfigType = any>(_name: string, _mdw_func: MiddlewareFunction<PostDisconnectDT, Env>, _options?: MiddlewareOptions<ConfigType>): void {
        this._add_mdw<PostDisconnectDT, Env, ConfigType>('post_disconnect', _name, _mdw_func, _options);
    }

    private _add_mdw<DataType = any, EnvType = any, ConfigType = any>(_where: string, _name: string, _mdw_func: MiddlewareFunction<DataType, EnvType>, _options?: MiddlewareOptions<ConfigType>): void {

        _where = _where + '_mdw';

        if (!this[_where]) throw new Error(`Invalid middleware addition. No such MiddlewareChain '${_where}'`);

        (<MiddlewareChain<DataType, EnvType, ConfigType>> this[_where]).addMiddleware(_name, _mdw_func, _options);
    }

    /**
     * Send method. You can give any argument as long as it extends the {@link PreSendDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: send -> pre_send_mdw -> _send -> post_send_mdw
     * @param payload
     */
    public async send<CustomDataType extends PreSendDT = PreSendDT>(payload: CustomDataType): Promise<PostSendDT> {
        await this.any_mdw.run({action: 'pre_send', payload});
        const result = await this.pre_send_mdw.run(payload);
        if (!result || !result.data || !result.signature) throw new Error(`Invalid Payload after pre_send Middleware Chain`);
        for (const buffer of result.data) {
            this._send(result.signature, buffer);
        }
        this.event.emit('core:send', result);
        await this.any_mdw.run({action: 'post_send', payload: result});
        return await this.post_send_mdw.run(result);
    }

    /**
     * Connect method. You can give any argument as long as it extends the {@link PreConnectDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: connect -> pre_connect_mdw -> _connect -> post_connect_mdw
     * @param payload
     */
    public async connect<CustomDataType extends PreConnectDT = PreConnectDT>(payload: CustomDataType): Promise<PostConnectDT> {
        await this.any_mdw.run({action: 'pre_connect', payload});
        const result = await this.pre_connect_mdw.run(payload);
        if (!result || !result.ip || !result.port) throw new Error('Invalid Payload after pre_connect MiddlewareChain');
        await this._connect(result.ip, result.port);
        await this.any_mdw.run({action: 'post_connect', payload: result});
        return await this.post_connect_mdw.run(result);
    }

    /**
     * Disconnect method. You can give any argument as long as it extends the {@link PreDisconnectDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: disconnect -> pre_disconnect_mdw -> _disconnect -> post_disconnect_mdw
     * @param payload
     */
    public async disconnect<CustomDataType extends PreDisconnectDT = PreDisconnectDT>(payload: CustomDataType): Promise<PostDisconnectDT> {
        await this.any_mdw.run({action: 'pre_disconnect', payload});
        const result = await this.pre_disconnect_mdw.run(payload);
        if (!result || !result.signature) throw new Error('Invalid Payload after pre_disconnect Middleware Chain');
        this._disconnect(result.signature);
        await this.any_mdw.run({action: 'post_disconnect', payload: result});
        return await this.post_disconnect_mdw.run(result);
    }

    /**
     * Bind method. You can give any argument as long as it extends the {@link PreBindDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: bind -> pre_bind_mdw -> _bind -> post_bind_mdw
     * @param payload
     */
    public async bind<CustomDataType extends PreBindDT = PreBindDT>(payload: CustomDataType): Promise <PostBindDT> {
        await this.any_mdw.run({action: 'pre_bind', payload});
        const result = await this.pre_bind_mdw.run(payload);
        if (!result || !result.ip || !result.port) throw new Error('Invalid Payload after pre_bind Middleware Chain');
        this._bind(result.ip, result.port);
        this.event.emit('core:bind', result);
        await this.any_mdw.run({action: 'post_bind', payload: result});
        return await this.post_bind_mdw.run(result);
    }

    /**
     * Listen method. You can give any argument as long as it extends the {@link PreListenDT} interface.
     * This allows you to add information and data you want to transmit to your {@link Middleware} instances.
     * Pipeline: listen -> pre_listen_mdw -> _listen -> post_listen_mdw
     * @param payload
     */
    public async listen<CustomDataType extends PreListenDT = PreListenDT>(payload: CustomDataType): Promise<PostListenDT> {
        await this.any_mdw.run({action: 'pre_listen', payload: undefined});
        await this.pre_listen_mdw.run(undefined);
        await this._listen();
        await this.any_mdw.run({action: 'post_listen', payload: undefined});
        await this.post_listen_mdw.run(undefined);
    }

    /**
     * onMessage callback. The argument must be a callback triggered a the end of the receive_mdw chain.
     * Pipeline: *receive data* -> receive_mdw -> _cb
     * @param _cb
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
        navigator[complete_path[path_bit]] = {
            ...data,
            ...navigator[complete_path[path_bit]]
        };
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
     * Returns the connection linked to the provided signature
     *
     * @param {Signature} signature
     * @returns {ConnectionInfos}
     */
    public getConnection(signature: Signature): ConnectionInfos {
        return this.connections[signature];
    }

    /**
     * Add plugin to plugin list. Inject happens only when start is called.
     *
     * @param {IBushPlugin} plugin Class implementing the IBushPlugin interface.
     */
    public plug(plugin: IBushPlugin): void {
        this.plugins.push(plugin);
    }

    private static _path_to_array(path: string): string[] {
        const splitted = path.split('.');
        for (const split of splitted) {
            if (!PathNamingRegex.test(split)) throw new Error(`Invalid name in path '${split}'`);
        }
        return splitted;
    }

    private _bind(_ip: string, _port: number): void {
        if (!this.utp) throw new Error('UTP Socket not created');

        this.utp.bind(_port, _ip);
    }

    private async _listen(): Promise<void> {
        if (!this.utp) throw new Error('UTP Socket not created');

        return new Promise<void>((ok: any, ko: any): void => {
            this.utp.listen((): void => {
                this.event.emit('core:listen');
                ok();
            });

        });
    }

    private async _connect(_ip: string, _port: number): Promise<void> {
        if (!this.utp) throw new Error('UTP Socket not created');

        return new Promise<void>((ok: any, ko: any): void => {
            this.utp.connect(_port, _ip, async (socket: Socket): Promise<void> => {
                const infos = new ConnectionInfos(socket, false);
                const signature = infos.getUniqueSignature();
                this.connections[signature] = infos;
                socket.on('data', async (data: Buffer): Promise<void> => {
                    const result = await this.receive_mdw.run({signature: signature, data: data});
                    if (result.__interrupt_signal) return ;
                    this.event.emit('core:receive', result);
                    for (const callback of this.message_callbacks) {
                        callback(result);
                    }
                });

                socket.on('end', async (): Promise<void> => {
                    await this.new_disconnection_mdw.run({signature});
                    await this.any_mdw.run({action: 'new_disconnection', payload: {signature}});
                    if (this.connections[signature]) this._disconnect(signature);
                });

                this.event.emit('core:connect', signature);
                await this.new_connection_mdw.run({connection: infos});
                await this.any_mdw.run({action: 'new_connection', payload: infos});
                ok();
            });
        });
    }

    private _disconnect(_signature: string): void {
        if (!this.utp) throw new Error('UTP Socket not created');
        if (!this.connections[_signature]) throw new Error('No user for signature ' + _signature);

        this.connections[_signature].drop();
        delete this.connections[_signature];
        this.event.emit('core:disconnect', _signature);
    }

    private _send(_signature: string, _data: Buffer): void {
        if (!this.utp) throw new Error('UTP Socket not created');
        if (!this.connections[_signature]) throw new Error('No user for signature ' + _signature);

        this.connections[_signature].Socket.write(_data);
    }

    private async _configure(): Promise<void> {
        await this.pre_send_mdw.configure(this.config);
        await this.post_send_mdw.configure(this.config);

        await this.receive_mdw.configure(this.config);

        await this.any_mdw.configure(this.config);

        await this.pre_listen_mdw.configure(this.config);
        await this.post_listen_mdw.configure(this.config);

        await this.pre_bind_mdw.configure(this.config);
        await this.post_bind_mdw.configure(this.config);

        await this.new_connection_mdw.configure(this.config);
        await this.new_disconnection_mdw.configure(this.config);

        await this.post_connect_mdw.configure(this.config);
        await this.pre_connect_mdw.configure(this.config);

        await this.post_disconnect_mdw.configure(this.config);
        await this.pre_disconnect_mdw.configure(this.config);
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
