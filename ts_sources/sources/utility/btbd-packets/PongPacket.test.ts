import { ECKeyPair } from '../btbd-crypto/ec_gen';

declare var describe;
declare var expect;
declare var test;

import { PongPacket }                  from './PongPacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';

describe('PongPacket Test Suite', () => {

    test('Build valid PongPacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const pong_packet: PongPacket = new PongPacket(master_address, destination_address, master_signature, timestamp, packet_id);
        pong_packet.getRaw(keypair).then((raw: RawPackets) => {
            const pp: PongPacket = PongPacket.fromRaw(raw.header, raw.body, timestamp);

            if (pp.RawHeader.compare(pong_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (pp.PacketID.compare(pong_packet.PacketID)) return done(new Error('Invalid PacketID'));
            if (pp.SecuritySignature.compare(pong_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (pp.PublicSessionKey.compare(pong_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (pp.MasterAddress.compare(pong_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (pp.MasterSignature.compare(pong_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (pp.Timestamp.toBuffer().compare(pong_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (pp.DestinationAddress.compare(pong_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (pp.Type !== pong_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build PongPacket and check with invalid type', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const pong_packet: PongPacket = new PongPacket(master_address, destination_address, master_signature, timestamp, packet_id);
        pong_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(1), 'hex');
            invalid_sig.copy(raw.header, 0, 0, 1);
            try {
                const pp: PongPacket = PongPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid packet type'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build PongPacket and check with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const pong_packet: PongPacket = new PongPacket(master_address, destination_address, master_signature, timestamp, packet_id);
        pong_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            invalid_sig.copy(raw.header, 179, 0, 65);
            try {
                const pp: PongPacket = PongPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid security signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build valid PongPacket and check with invalid session signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');
        const packet_id: Buffer = Buffer.from('00224455668899aa', 'hex');

        const pong_packet: PongPacket = new PongPacket(master_address, destination_address, master_signature, timestamp, packet_id);
        pong_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const pp: PongPacket = PongPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detected invalid session signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build PongPacket with invalid ID', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
        const packet_id: Buffer = Buffer.from('00224455668899', 'hex');

        try {
            const pong_packet: PongPacket = new PongPacket(master_address, destination_address, master_signature, timestamp, packet_id);
            done(new Error('Should throw'));
        } catch (e) {
            done();
        }
    });

});
