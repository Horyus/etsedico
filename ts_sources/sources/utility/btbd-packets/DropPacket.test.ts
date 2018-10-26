import { ECKeyPair }                   from '../btbd-crypto/ec_gen';
import { DropPacket }                  from './DropPacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';
import { DropStatus }                  from './DropStatus';

declare var describe;
declare var expect;
declare var test;

describe('DropPacket Test Suite', () => {

    test('Build valid DropPacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const error_code: DropStatus = DropStatus.Unknown;

        const drop_packet: DropPacket = new DropPacket(master_address, destination_address, master_signature, timestamp, error_code);
        drop_packet.getRaw(keypair).then((raw: RawPackets) => {
            const dp: DropPacket = DropPacket.fromRaw(raw.header, raw.body, timestamp);

            if (dp.RawHeader.compare(drop_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (dp.ErrorCode !== drop_packet.ErrorCode) return done(new Error('Invalid ErrorCode'));
            if (dp.SecuritySignature.compare(drop_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (dp.PublicSessionKey.compare(drop_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (dp.MasterAddress.compare(drop_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (dp.MasterSignature.compare(drop_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (dp.Timestamp.toBuffer().compare(drop_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (dp.DestinationAddress.compare(drop_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (dp.Type !== drop_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build DropPacket and check with invalid type', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const error_code: DropStatus = DropStatus.Unknown;

        const confirmation_packet: DropPacket = new DropPacket(master_address, destination_address, master_signature, timestamp, error_code);
        confirmation_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(1), 'hex');
            invalid_sig.copy(raw.header, 0, 0, 1);
            try {
                const dp: DropPacket = DropPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid packet type'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build DropPacket and check with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const error_code: DropStatus = DropStatus.Unknown;

        const confirmation_packet: DropPacket = new DropPacket(master_address, destination_address, master_signature, timestamp, error_code);
        confirmation_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            invalid_sig.copy(raw.header, 173, 0, 65);
            try {
                const dp: DropPacket = DropPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid security signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build valid DropPacket and check with invalid session signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');
        const error_code: DropStatus = DropStatus.Unknown;

        const confirmation_packet: DropPacket = new DropPacket(master_address, destination_address, master_signature, timestamp, error_code);
        confirmation_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const dp: DropPacket = DropPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detected invalid session signature'));
            } catch (e) {
                done();
            }
        });
    });

});
