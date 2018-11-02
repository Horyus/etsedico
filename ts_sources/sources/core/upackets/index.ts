import { IBushPlugin }       from '../../IBushPlugin';
import { Bush }              from '../../Bush';
import upacket_fragmenter    from './upacket_fragmenter';
import { PreSendPriorities } from '../settings';

const PRESEND_UPACKET_FRAGMENTER: string = 'presend_upacket_fragmenter';

export class UPacketsPlugin implements IBushPlugin {
    public readonly name: string = 'upackets';

    public inject(bush: Bush): void {
        if (!bush.requires('crypto')) throw new Error('[upackets] missing crypto plugin dependency');

        bush.addPreSendMiddleware(PRESEND_UPACKET_FRAGMENTER, upacket_fragmenter, {weight: PreSendPriorities[PRESEND_UPACKET_FRAGMENTER]});
    }
}
