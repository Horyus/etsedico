import { IBushPlugin } from '../../IBushPlugin';
import { ECKeyPair }   from '../../utility/btbd-crypto/ec_gen';
import { Bush }        from '../../Bush';

export class CryptoPlugin implements IBushPlugin {

   public readonly name: string = 'crypto';
   private readonly eckeypair: ECKeyPair;
   private readonly master_signature: Buffer;
   private readonly master_address: Buffer;

    constructor(eck: ECKeyPair, sig: Buffer, master_address: Buffer) {
        this.eckeypair = eck;
        this.master_signature = sig;
        this.master_address = master_address;
    }

    public inject(bush: Bush): void {
        bush.setEnv(`${this.name}.ec_keypair`, this.eckeypair);
        bush.setEnv(`${this.name}.master_signature`, this.master_signature);
        bush.setEnv(`${this.name}.master_address`, this.master_address);
    }

}
