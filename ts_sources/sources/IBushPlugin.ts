import { Bush } from './Bush';

/**
 * Interface that needs to be implemented for the Bush Plugins
 */
export interface IBushPlugin {

    /**
     * Name of the plugin. Mainly used to notify in case of plug errors.
     */
    name: string;

    /**
     * Method where all the middleware addition should be done. Should throw on error.
     *
     * @param {Bush} bush Bush instance on which we plug.
     */
    inject(bush: Bush): void;

}
