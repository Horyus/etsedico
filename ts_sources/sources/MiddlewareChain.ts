import {
    EventEmitter,
    Middleware,
    MiddlewareActionContinue, MiddlewareActionEnd, MiddlewareActionError,
    MiddlewareActionTypes,
    MiddlewareFunction,
    MiddlewareOptions
} from './Middleware';

/**
 * Interface used for the static name registry.
 */
export interface MiddlewareChainNameRegistry {
    [key: string]: boolean;
}

export class MiddlewareChain<DataType = any, EnvType = any, ConfigType = any> {

    /**
     * Name registry used to prevent multiple middlewares with same name.
     */
    private static readonly name_registry: MiddlewareChainNameRegistry = {};

    /**
     * Event emitter used by all middlewares.
     */
    private readonly event: EventEmitter;

    /**
     * Env used by all middlewares.
     */
    private readonly env: EnvType;

    /**
     * Array containing middleware chain.
     */
    private readonly mdws: Middleware<DataType, EnvType, ConfigType>[] = [];

    /**
     * Create a new MiddlewareChain instance
     *
     * @param _event {EventEmitter} Event Emitter used by all middlewares.
     * @param _env {EnvType} Env used by all middlewares.
     */
    constructor(_event: EventEmitter, _env: EnvType) {
        this.event = _event;
        this.env = _env;
    }

    /**
     * Create a new middleware is name is available, adds it into the list and sort it.
     *
     * @param _name {string} Name of middleware.
     * @param _mdw {MiddlewareFunction} Middleware function.
     * @param _options {MiddlewareOptions} Middleware options.
     */
    public addMiddleware(_name: string, _mdw: MiddlewareFunction<DataType, EnvType>, _options?: MiddlewareOptions<ConfigType>): void {
        if (MiddlewareChain.name_registry[_name]) throw new Error('Middleware name already in use');
        const mdw = new Middleware<DataType, EnvType, ConfigType>(_name, _mdw, this.event, _options);

        this.mdws.push(mdw);
        this.mdws.sort((mdw_one: Middleware<DataType, EnvType, ConfigType>, mdw_two: Middleware<DataType, EnvType, ConfigType>): number => (mdw_one.weight - mdw_two.weight));
        MiddlewareChain.name_registry[_name] = true;
    }

    /**
     * Debugging function to list middlewares and their current order.
     */
    public getMiddlewareList(): string[] {
        const ret: string[] = [];
        for (const mdw_idx in this.mdws) {
            const mdw = this.mdws[mdw_idx];
            ret.push('<' + mdw.name + ' ' + mdw.weight + '>');
        }
        return ret;
    }

    /**
     * Run full middleware chain
     *
     * @param _data {DataType} Data given at chain begin
     */
    public async run(_data: DataType): Promise<DataType> {

        let payload = _data;
        end:
            for (const mdw_idx in this.mdws) {
                const mdw = this.mdws[mdw_idx];
                const result = await mdw.run(payload, this.env);
                switch (result.type) {
                    case MiddlewareActionTypes.Continue:
                        payload = (<MiddlewareActionContinue<DataType> > result).payload;
                        break;
                    case MiddlewareActionTypes.End:
                        payload = (<MiddlewareActionEnd<DataType> > result).payload;
                        break end;
                    case MiddlewareActionTypes.Error:
                        throw new Error('<' + mdw.name + ' ' + mdw.weight + '> ' + (<MiddlewareActionError<DataType> > result).error.message);
                }
            }

        return payload;
    }

    /**
     * Run configuration on every middleware. Throw if any returns false.
     *
     * @param _config {ConfigType} Configuration for the middlewares
     */
    public async configure(_config: ConfigType): Promise<void> {

        for (const mdw_idx in this.mdws) {
            const mdw = this.mdws[mdw_idx];
            if (!await mdw.configure(_config)) throw new Error('<' + mdw.name + ' ' + mdw.weight + '> Invalid configuration');
        }

    }
}
