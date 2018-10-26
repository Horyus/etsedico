import { ECKeyPair } from '../btbd-crypto/ec_gen';

declare var describe;
declare var expect;
declare var test;

import { LossPacket, MissRange, MissUniqueElement } from './LossPacket';
import { ec_address, ec_gen, ec_sign }              from '../btbd-crypto';
import { RawPackets }                               from './Packet';

describe('ConfirmationPacket Test Suite', () => {

    test('Build valid LossPacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed: (MissRange | MissUniqueElement)[] = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ];

        const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
        loss_packet.getRaw(keypair).then((raw: RawPackets) => {
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);

            if (lp.RawHeader.compare(loss_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (lp.PacketID.compare(loss_packet.PacketID)) return done(new Error('Invalid PacketID'));
            if (lp.SecuritySignature.compare(loss_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (lp.PublicSessionKey.compare(loss_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (lp.MasterAddress.compare(loss_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (lp.MasterSignature.compare(loss_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (lp.Timestamp.toBuffer().compare(loss_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (lp.DestinationAddress.compare(loss_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (lp.Type !== loss_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build valid LossPacket without unique fields', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed: (MissRange | MissUniqueElement)[] = [
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ];

        const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
        loss_packet.getRaw(keypair).then((raw: RawPackets) => {
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);

            if (lp.RawHeader.compare(loss_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (lp.PacketID.compare(loss_packet.PacketID)) return done(new Error('Invalid PacketID'));
            if (lp.SecuritySignature.compare(loss_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (lp.PublicSessionKey.compare(loss_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (lp.MasterAddress.compare(loss_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (lp.MasterSignature.compare(loss_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (lp.Timestamp.toBuffer().compare(loss_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (lp.DestinationAddress.compare(loss_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (lp.Type !== loss_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build LossPacket with invalid packet id', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            done(new Error('Should throw on invalid packet id'));
        } catch (e) {
            done();
        }
    });
    test('Build LossPacket with invalid miss', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            },
            'hi'
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            done(new Error('Should throw on invalid miss structure'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket from invalid raw with invalid miss field #1', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            Buffer.from('02', 'hex').copy(raw.header, 181);
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);
            done(new Error('Should throw on invalid miss field'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket from invalid raw with invalid miss field #2', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            raw.header = Buffer.concat([raw.header.slice(0, raw.header.length - (65 + 4)), raw.header.slice(raw.header.length - 65)]);
            raw.header.writeUInt16BE(39, 179);
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);
            done(new Error('Should throw on invalid miss field'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket from invalid raw with invalid miss field #3', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            raw.header = Buffer.concat([raw.header.slice(0, raw.header.length - (65 + 4)), raw.header.slice(raw.header.length - 65)]);
            raw.header.writeUInt16BE(14, 179);
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);
            done(new Error('Should throw on invalid miss field'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket with miss field too big', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [] as (MissRange | MissUniqueElement)[];
        for (let idx = 0; idx < 1000; ++idx) {
            missed.push({packet_idx: idx} as MissUniqueElement);
        }

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            done(new Error('Should throw on invalid miss field too large'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket from invalid raw with invalid packet type', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            Buffer.from('ee', 'hex').copy(raw.header, 0);
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);
            done(new Error('Should throw on invalid packet type'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket from invalid raw with invalid master signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);
            done(new Error('Should throw on master signature'));
        } catch (e) {
            done();
        }
    });

    test('Build LossPacket from invalid raw with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const missed = [
            {
                packet_idx: 1
            },
            {
                packet_idx: 10
            },
            {
                packet_idx: 100
            },
            {
                packet_idx: 1000
            },
            {
                packet_idx: 10000
            },
            {
                begin: 2000,
                end: 3000
            },
            {
                begin: 3005,
                end: 3010
            }
        ] as (MissRange | MissUniqueElement)[];

        try {
            const loss_packet: LossPacket = new LossPacket(master_address, destination_address, master_signature, timestamp, packet_id, missed);
            const raw: RawPackets = await loss_packet.getRaw(keypair);
            Buffer.from('ee'.repeat(65), 'hex').copy(raw.header, raw.header.length - 65);
            const lp: LossPacket = LossPacket.fromRaw(raw.header, raw.body, timestamp);
            done(new Error('Should throw on invalid security signature'));
        } catch (e) {
            done();
        }
    });

});
