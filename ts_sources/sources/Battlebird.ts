import { Bush }            from './Bush';
import { TimestampPlugin } from './core/timestamp';
import { EventEmitter }    from 'events';
import { ECKeyPair }       from './utility/btbd-crypto/ec_gen';
import { CryptoPlugin }    from './core/crypto';
import { ConnectPlugin }   from './core/connect';
import { UPacketsPlugin }  from './core/upackets';

export class Battlebird {

    private readonly bush: Bush;
    private readonly event: EventEmitter = new EventEmitter();
    private readonly env: any = {};

    private readonly eckeypair: ECKeyPair;
    private readonly master_signature: Buffer;
    private readonly master_address: Buffer;

    constructor(eck: ECKeyPair, master_signature: Buffer, master_address: Buffer) {
        this.bush = new Bush({event: this.event, env: this.env});
        this.eckeypair = eck;
        this.master_signature = master_signature;
        this.master_address = master_address;
    }

    public async start(): Promise<void> {
        this.bush.plug(new TimestampPlugin((): number => Date.now()));
        this.bush.plug(new CryptoPlugin(this.eckeypair, this.master_signature, this.master_address));
        this.bush.plug(new ConnectPlugin());
        this.bush.plug(new UPacketsPlugin());

        await this.bush.start();
    }

    public get Bush(): Bush {
        return this.bush;
    }

}
