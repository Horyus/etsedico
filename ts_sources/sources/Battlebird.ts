import { Bush }            from './Bush';
import { TimestampPlugin } from './core/timestamp';
import { EventEmitter }    from 'events';
import { ECKeyPair }       from './utility/btbd-crypto/ec_gen';
import { CryptoPlugin }    from './core/crypto';

export class Battlebird {

    private readonly bush: Bush;
    private readonly event: EventEmitter = new EventEmitter();
    private readonly env: any = {};

    private readonly eckeypair: ECKeyPair;
    private readonly master_signature: Buffer;

    constructor(eck: ECKeyPair, master_signature: Buffer) {
        this.bush = new Bush({event: this.event, env: this.env});
        this.eckeypair = eck;
        this.master_signature = master_signature;
    }

    public async start(): Promise<void> {
        this.bush.plug(new TimestampPlugin((): number => Date.now()));
        this.bush.plug(new CryptoPlugin(this.eckeypair, this.master_signature));

        await this.bush.start();
    }

    public get Bush(): Bush {
        return this.bush;
    }

}
