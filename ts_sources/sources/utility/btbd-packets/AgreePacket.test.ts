import { ECKeyPair } from '../btbd-crypto/ec_gen';

declare var describe;
declare var expect;
declare var test;

import { AgreePacket }                 from './AgreePacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';

describe('AgreePacket Test Suite', () => {

    test('Build valid AgreePacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const agree_packet: AgreePacket = new AgreePacket(master_address, destination_address, master_signature, timestamp, encrypted_second_challenge);
        agree_packet.getRaw(keypair).then((raw: RawPackets) => {
            const cp: AgreePacket = AgreePacket.fromRaw(raw.header, raw.body, timestamp);

            if (cp.RawHeader.compare(agree_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (cp.SecuritySignature.compare(agree_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (cp.PublicSessionKey.compare(agree_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (cp.MasterAddress.compare(agree_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (cp.MasterSignature.compare(agree_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (cp.Timestamp.toBuffer().compare(agree_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (cp.DestinationAddress.compare(agree_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (cp.EncryptedSecondChallenge.compare(agree_packet.EncryptedSecondChallenge)) return done(new Error('Invalid SecondChallenge'));
            if (cp.Type !== agree_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build AgreePacket with invalid EncryptedSecondChallenge', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_second_challenge: Buffer = Buffer.from('ff'.repeat(15), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const agree_packet: AgreePacket = new AgreePacket(master_address, destination_address, master_signature, timestamp, encrypted_second_challenge);
            done(new Error('Should throw for invalid SecondChallenge'));
        } catch (e) {
            done();
        }
    });

    test('Build AgreePacket and check with invalid type', async (done: any) => {
        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const agree_packet: AgreePacket = new AgreePacket(master_address, destination_address, master_signature, timestamp, encrypted_second_challenge);
        agree_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(1), 'hex');
            invalid_sig.copy(raw.header, 0, 0, 1);
            try {
                const cp: AgreePacket = AgreePacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid packet type'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build AgreePacket and check with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const agree_packet: AgreePacket = new AgreePacket(master_address, destination_address, master_signature, timestamp, encrypted_second_challenge);
        agree_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            invalid_sig.copy(raw.header, 187, 0, 65);
            try {
                const cp: AgreePacket = AgreePacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid security signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build valid AgreePacket and check with invalid session signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');

        const agree_packet: AgreePacket = new AgreePacket(master_address, destination_address, master_signature, timestamp, encrypted_second_challenge);
        agree_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const cp: AgreePacket = AgreePacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detected invalid session signature'));
            } catch (e) {
                done();
            }
        });
    });

});
