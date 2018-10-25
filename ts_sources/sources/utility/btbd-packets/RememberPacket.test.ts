import { ECKeyPair } from '../btbd-crypto/ec_gen';

declare var describe;
declare var expect;
declare var test;

import { RememberPacket }              from './RememberPacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';

describe('RememberPacket Test Suite', () => {

    test('Build valid RememberPacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const remember_packet: RememberPacket = new RememberPacket(master_address, destination_address, master_signature, timestamp, encrypted_first_challenge);
        remember_packet.getRaw(keypair).then((raw: RawPackets) => {
            const rp: RememberPacket = RememberPacket.fromRaw(raw.header, raw.body, timestamp);

            if (rp.RawHeader.compare(remember_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (rp.SecuritySignature.compare(remember_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (rp.PublicSessionKey.compare(remember_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (rp.MasterAddress.compare(remember_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (rp.MasterSignature.compare(remember_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (rp.Timestamp.toBuffer().compare(remember_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (rp.DestinationAddress.compare(remember_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (rp.EncryptedFirstChallenge.compare(remember_packet.EncryptedFirstChallenge)) return done(new Error('Invalid FirstChallenge'));
            if (rp.Type !== remember_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build RememberPacket with invalid EncryptedFirstChallenge', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(15), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const remember_packet: RememberPacket = new RememberPacket(master_address, destination_address, master_signature, timestamp, encrypted_first_challenge);
            done(new Error('Should throw for invalid FirstChallenge'));
        } catch (e) {
            done();
        }
    });

    test('Build RememberPacket and check with invalid type', async (done: any) => {
        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const remember_packet: RememberPacket = new RememberPacket(master_address, destination_address, master_signature, timestamp, encrypted_first_challenge);
        remember_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(1), 'hex');
            invalid_sig.copy(raw.header, 0, 0, 1);
            try {
                const rp: RememberPacket = RememberPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid packet type'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build RememberPacket and check with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const remember_packet: RememberPacket = new RememberPacket(master_address, destination_address, master_signature, timestamp, encrypted_first_challenge);
        remember_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            invalid_sig.copy(raw.header, 187, 0, 65);
            try {
                const rp: RememberPacket = RememberPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid security signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build valid RememberPacket and check with invalid session signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');

        const remember_packet: RememberPacket = new RememberPacket(master_address, destination_address, master_signature, timestamp, encrypted_first_challenge);
        remember_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const rp: RememberPacket = RememberPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detected invalid session signature'));
            } catch (e) {
                done();
            }
        });
    });

});
