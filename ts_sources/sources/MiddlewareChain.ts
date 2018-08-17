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
interface MiddlewareChainNameRegistry {
    [key: string]: boolean;
}

/**
 * Interface for the waitlist.
 */
interface MiddlewareWaitlist<DataType, EnvType, ConfigType> {
    name: string;
    mdw: MiddlewareFunction<DataType, EnvType>;
    options: MiddlewareOptions<ConfigType>;
}

/**
 * Class grouping multiple {@link Middleware} instances for a grouped call.
 *
 * ```typescript
 * const event = new EventEmitter();
 * const env = {letter: 'a'};
 *
 *
 * const increment_letter_in_env = // A Middleware instance that increments the letter inside the env.
 * const append_a_letter = // A Middleware that takes the letter in env and appends it to the payload
 *
 *
 * const config_checker: MiddlewareConfig<string> = async (config: string): Promise<boolean> => {
 *      return (config.properly_configured);
 * };
 *
 *
 * const mdwc = new MiddlewareChain(event, env);
 *
 *
 * // Add middlewares to the chain. A Middleware should be pure so it can be used several times in the same chain.
 * mdwc.addMiddleware('increment1', increment_letter_in_env, {weight: 3});
 * mdwc.addMiddleware('increment2', increment_letter_in_env, {weight: 1});
 * mdwc.addMiddleware('increment3', increment_letter_in_env, {weight: 4});
 * mdwc.addMiddleware('append1', append_a_letter, {weight: 6});
 * mdwc.addMiddleware('append2', append_a_letter, {weight: 5, config: config_checker});
 * mdwc.addMiddleware('append3', append_a_letter, {weight: 2});
 * ```
 * ```typescript
 * // This will throw, and will indicate which middleware is causing the configuration fail.
 * mdwc.configure({properly_configure: false});
 * ```
 * ```typescript
 *
 * // This won't throw
 * mdwc.configure({properly_configure: true});
 *
 * ```
 * ```typescript
 * let data = 'Let's append stuff => ';
 *
 * ```
 * ```typescript
 * data = await mdwc.run(data);
 * // data === 'Let's append stuff => aac'
 *
 * ```
 * ```typescript
 * data = await mdwc.run(data);
 * // data === 'Let's append stuff => aacddf'
 *
 * ```
 * ```typescript
 * // Will return the list of middleware. For debugging purposes.
 * mdwc.getMiddlewareList();
 * // [
 * //  '<append1 6>',
 * //  '<append2 5>',
 * //  '<increment3 4>',
 * //  '<increment1 3>',
 * //  '<append3 2>'
 * //  '<increment2 1>'
 * // ]
 *
 * // You can also get the highest and lowest weight of the middlewares in the chain.
 * mdwc.getHighestMiddleware(); // 6
 * mdwc.getLowestMiddleware(); // 1
 *
 * // You can also use the before, after and requires options
 * mdwc.addMiddleware('increment4', increment_letter_in_env, {weight: 3}, require: ['increment5', 'increment6']);
 * mdwc.addMiddleware('increment5', increment_letter_in_env, {weight: 1}, after: ['append7']);
 * mdwc.addMiddleware('increment6', increment_letter_in_env, {weight: 4});
 * mdwc.addMiddleware('append7', append_a_letter, {weight: 6}, before: ['append9']);
 * mdwc.addMiddleware('append8', append_a_letter, {weight: 5, config: config_checker});
 * mdwc.addMiddleware('append9', append_a_letter, {weight: 2});
 *
 * // requireAdds only if dependencies are met. If not found when calling addMiddleware, the middleware is placed
 * // in a wailist and the MiddlewareChain attempts to resolve the dependencies of the waitlist every time addMiddleware
 * // is called.
 * // before / after: Same as require, but also demand that the middleware is plaaace before / after one of several
 * // middlewares. Will throw if not possible, and will also wait in the waitlist if dependencies are not met
 * //
 * // You can call mdwc.resolved to know if all the dependencies have been resolved.
 * ```
 *
 * @param DataType The data going through the {@link Middleware} instances can be extended from the DataType.
 * @param EnvType Type of the env given to all the {@link Middleware} instances. The Env is a mean of communication between {@link Middleware} instances, caching, data saving ...
 * @param ConfigType Type of the config object given when called the configure method.
 */
export class MiddlewareChain<DataType = any, EnvType = any, ConfigType = any> {

    /**
     * Name registry used to prevent multiple {@link Middleware} instances with same name.
     */
    private static readonly name_registry: MiddlewareChainNameRegistry = {};

    /**
     * Event emitter used by all {@link Middleware} instances.
     */
    private readonly event: EventEmitter;

    /**
     * Env used by all {@link Middleware} instances.
     */
    private readonly env: EnvType;

    /**
     * Array containing {@link Middleware} chain.
     */
    private readonly mdws: Middleware<DataType, EnvType, ConfigType>[] = [];

    /**
     * Array containing {@link Middleware} chain.
     */
    private waitlist_mdws: MiddlewareWaitlist<DataType, EnvType, ConfigType>[] = [];

    /**
     * Creates a new {@link MiddlewareChain} instance
     *
     * @param _event {EventEmitter} Event Emitter used by all {@link Middleware} instances.
     * @param _env {EnvType} Env used by all {@link Middleware} instances.
     */
    constructor(_event: EventEmitter, _env: EnvType) {
        this.event = _event;
        this.env = _env;
    }

    /**
     * Returns true if all middlewares are resolved.
     */
    public get resolved(): boolean {
        return !this.waitlist_mdws.length;
    }

    /**
     * Return array with unmet dependecies from the middlewares.
     */
    public get missing_dependencies(): string[] {
        let ret = [];
        const missing = this.waitlist_mdws
            .map((elem: MiddlewareWaitlist<DataType, EnvType, ConfigType>) => {
                let out: string[] = [];
                if (elem.options.require) out = out.concat(elem.options.require);
                if (elem.options.before) out = out.concat(elem.options.before);
                if (elem.options.after) out = out.concat(elem.options.after);
                out.filter((elem: string) => {
                    let found = false;
                    for (const mdw of this.mdws) {
                        if (mdw.name === elem) found = true;
                    }
                    return !found;
                });
                return out;
            });
        for (const miss_array of missing) {
            ret = ret.concat(miss_array);
        }
        return ret;
    }

    /**
     * Used to resolve all dependencies of middlewares into the waitlist
     */
    public resolveWaitlist(): void {
        while (this.waitlist_mdws.length) {
            const initial_length = this.waitlist_mdws.length;
            let unresolved = 0;
            for (const mdw_info of this.waitlist_mdws) {

                let skip = false;

                if (mdw_info.options.require) {
                    for (const require of mdw_info.options.require) {
                        let found = false;
                        for (const mdw of this.mdws) {
                            if (mdw.name === require) found = true;
                        }
                        if (!found) skip = true;
                    }
                }

                if (mdw_info.options.before) {
                    for (const before of mdw_info.options.before) {
                        let found = false;
                        for (const mdw of this.mdws) {
                            if (mdw.name === before) found = true;
                        }
                        if (!found) skip = true;
                    }
                }

                if (mdw_info.options.after) {
                    for (const after of mdw_info.options.after) {
                        let found = false;
                        for (const mdw of this.mdws) {
                            if (mdw.name === after) found = true;
                        }
                        if (!found) skip = true;
                    }
                }

                if (!skip) {
                    this.addMiddleware(mdw_info.name, mdw_info.mdw, {...mdw_info.options, require: undefined});
                    this.waitlist_mdws = this.waitlist_mdws.filter((elem: MiddlewareWaitlist<DataType, EnvType, ConfigType>) => elem.name !== mdw_info.name);
                } else {
                    ++unresolved;
                }
            }
            if (unresolved === initial_length) throw new Error('Unable to resolve middleware dependencies');
        }
    }

    private _manage_requires(_name: string, _mdw: MiddlewareFunction<DataType, EnvType>, _options: MiddlewareOptions<ConfigType>): void {
        this.waitlist_mdws.push({name: _name, mdw: _mdw, options: _options});
        try {
            this.resolveWaitlist();
        } catch (e) {}
    }

    private _manage_before(_options: MiddlewareOptions<ConfigType>): number[] {
        return this.mdws
            .map((mdw: Middleware) => {
                if (_options.before.indexOf(mdw.name) !== -1) {
                    _options.before = _options.before.filter((elem: string) => elem !== mdw.name);
                    return mdw.weight;
                } else {
                    return NaN;
                }
            })
            .filter((val: number) =>
                (!!val))
            .sort((a: number, b: number) => b - a);
    }

    private _manage_after(_options: MiddlewareOptions<ConfigType>): number[] {
        return this.mdws
            .map((mdw: Middleware) => {
                if (_options.after.indexOf(mdw.name) !== -1) {
                    _options.after = _options.after.filter((elem: string) => elem !== mdw.name);
                    return mdw.weight;
                } else {
                    return NaN;
                }
            })
            .filter((val: number) =>
                (!!val))
            .sort((a: number, b: number) => b - a);
    }

    /**
     * Creates a new {@link Middleware} if name is available, adds it into the list and sort it.
     *
     * @param _name {string} Name of {@link Middleware}.
     * @param _mdw {MiddlewareFunction} {@link Middleware} function.
     * @param _options {MiddlewareOptions} {@link Middleware} options.
     */
    public addMiddleware(_name: string, _mdw: MiddlewareFunction<DataType, EnvType>, _options?: MiddlewareOptions<ConfigType>): void {
        if (MiddlewareChain.name_registry[_name]) throw new Error('Middleware name already in use ' + _name);

        if (_options) {
            let before_values;
            let after_values;

            if (_options.require) return this._manage_requires(_name, _mdw, _options);

            if (_options.before) {
                before_values = this._manage_before(_options);
                if (_options.before.length !== 0) {
                    this.waitlist_mdws.push({name: _name, mdw: _mdw, options: _options});
                    return ;
                }
            }

            if (_options.after) {
                after_values = this._manage_after(_options);
                if (_options.after.length !== 0) {
                    this.waitlist_mdws.push({name: _name, mdw: _mdw, options: _options});
                    return ;
                }
            }

            if ((before_values && after_values)
                && (before_values[0] > after_values[0] || after_values[0] - 1 === before_values[0])) throw new Error(`Invalid before/after configuration => before ${before_values[0]} and after ${after_values[0]}`);

            if (before_values && after_values) _options.weight = Math.floor(after_values[0] + (before_values[0] - after_values[0]) / 2);
            else if (before_values) _options.weight = before_values[0] + 1;
            else if (after_values) _options.weight = after_values[0] - 1;

        }

        const mdw = new Middleware<DataType, EnvType, ConfigType>(_name, _mdw, this.event, _options);

        this.mdws.push(mdw);
        this.mdws.sort((mdw_one: Middleware<DataType, EnvType, ConfigType>, mdw_two: Middleware<DataType, EnvType, ConfigType>): number => (-(mdw_one.weight - mdw_two.weight)));
        MiddlewareChain.name_registry[_name] = true;
        try {
            this.resolveWaitlist();
        } catch (e) {}
    }

    /**
     * Debugging function to list {@link Middleware} instances and their current order.
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
     * Run full {@link Middleware} chain
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
     * Run configuration on every {@link Middleware}. Throw if any returns false.
     *
     * @param _config {ConfigType} Configuration for the {@link Middleware} instances
     */
    public async configure(_config: ConfigType): Promise<void> {

        for (const mdw_idx in this.mdws) {
            const mdw = this.mdws[mdw_idx];
            if (!await mdw.configure(_config)) throw new Error('<' + mdw.name + ' ' + mdw.weight + '> Invalid configuration');
        }

    }

    /**
     * Get highest {@link Middleware} weigth. Useful if plugin needs to be first.
     */
    public getHighestMiddleware(): number {
        if (!this.mdws.length) return 0;
        return this.mdws[0].weight;
    }

    /**
     * Get lowest {@link Middleware} weigth. Usefil if plugin needs to be last.
     */
    public getLowestMiddleware(): number {
        if (!this.mdws.length) return 0;
        return this.mdws[this.mdws.length - 1].weight;
    }
}
