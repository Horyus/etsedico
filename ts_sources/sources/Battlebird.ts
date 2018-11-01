import { Bush }            from './Bush';
import { TimestampPlugin } from './core/timestamp';
import { EventEmitter }    from 'events';

export class Battlebird {

    private readonly bush: Bush;
    private readonly event: EventEmitter = new EventEmitter();
    private readonly env: any = {};

    constructor() {
        this.bush = new Bush({event: this.event, env: this.env});
    }

    public async start(): Promise<void> {
        this.bush.plug(new TimestampPlugin((): number => Date.now()));

        await this.bush.start();
    }

    public get Bush(): Bush {
        return this.bush;
    }

}
