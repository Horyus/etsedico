import { ECKeyPair } from '../btbd-crypto/ec_gen';

declare var describe;
declare var expect;
declare var test;

import { EngagePacket }                from './EngagePacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';

describe('EngagePacket Test Suite', () => {

    test('Build valid EngagePacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge);
        engage_packet.getRaw(keypair).then((raw: RawPackets) => {
            const ep: EngagePacket = EngagePacket.fromRaw(raw.header, raw.body, timestamp);

            if (ep.RawHeader.compare(engage_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (ep.SecuritySignature.compare(engage_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (ep.PublicSessionKey.compare(engage_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (ep.MasterAddress.compare(engage_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (ep.MasterSignature.compare(engage_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (ep.Timestamp.toBuffer().compare(engage_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (ep.DestinationAddress.compare(engage_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (ep.FirstKeyHalf.compare(engage_packet.FirstKeyHalf)) return done(new Error('Invalid FirstKeyHalf'));
            if (ep.FirstChallenge.compare(engage_packet.FirstChallenge)) return done(new Error('Invalid FirstChallenge'));
            if (ep.RememberHash !== engage_packet.RememberHash) return done(new Error('Invalid RememberHash'));
            if (ep.Type !== engage_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build valid EngagePacket with RememberHash', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(32), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
        engage_packet.getRaw(keypair).then((raw: RawPackets) => {
            const ep: EngagePacket = EngagePacket.fromRaw(raw.header, raw.body, timestamp);

            if (ep.RawHeader.compare(engage_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (ep.SecuritySignature.compare(engage_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (ep.PublicSessionKey.compare(engage_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (ep.MasterAddress.compare(engage_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (ep.MasterSignature.compare(engage_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (ep.Timestamp.toBuffer().compare(engage_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (ep.DestinationAddress.compare(engage_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (ep.FirstKeyHalf.compare(engage_packet.FirstKeyHalf)) return done(new Error('Invalid FirstKeyHalf'));
            if (ep.FirstChallenge.compare(engage_packet.FirstChallenge)) return done(new Error('Invalid FirstChallenge'));
            if (ep.RememberHash.compare(engage_packet.RememberHash)) return done(new Error('Invalid RememberHash'));
            if (ep.Type !== engage_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build EngagePacket with invalid FirstKeyHalf', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(15), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(32), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
            done(new Error('Should throw for invalid FirstHalfKey'));
        } catch (e) {
            done();
        }
    });

    test('Build EngagePacket with invalid FirstChallenge', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(15), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(32), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
            done(new Error('Should throw for invalid FirstChallenge'));
        } catch (e) {
            done();
        }
    });

    test('Build EngagePacket with invalid RememberHash', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(31), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
            done(new Error('Should throw for invalid RememberHash'));
        } catch (e) {
            done();
        }
    });

    test('Build EngagePacket with invalid header size', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(32), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
        engage_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const ep: EngagePacket = EngagePacket.fromRaw(raw.header.slice(1), raw.body, timestamp);
                done(new Error('Should throw on invalid header size'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build EngagePacket and check with invalid type', async (done: any) => {
        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(32), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
        engage_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(1), 'hex');
            invalid_sig.copy(raw.header, 0, 0, 1);
            try {
                const ep: EngagePacket = EngagePacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid packet type'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build EngagePacket and check with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge);
        engage_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            invalid_sig.copy(raw.header, 203, 0, 65);
            try {
                const ep: EngagePacket = EngagePacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid security signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build valid EngagePacket and check with invalid session signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const first_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const remember_hash: Buffer = Buffer.from('ff'.repeat(32), 'hex');

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');

        const engage_packet: EngagePacket = new EngagePacket(master_address, destination_address, master_signature, timestamp, first_key_half, first_challenge, remember_hash);
        engage_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const ep: EngagePacket = EngagePacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detected invalid session signature'));
            } catch (e) {
                done();
            }
        });
    });

});
