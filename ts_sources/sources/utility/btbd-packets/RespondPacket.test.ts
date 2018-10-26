import { ECKeyPair } from '../btbd-crypto/ec_gen';

declare var describe;
declare var expect;
declare var test;

import { RespondPacket }               from './RespondPacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';

describe('RespondPacket Test Suite', () => {

    test('Build valid RespondPacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
        respond_packet.getRaw(keypair).then((raw: RawPackets) => {
            const rp: RespondPacket = RespondPacket.fromRaw(raw.header, raw.body, timestamp);

            if (rp.RawHeader.compare(respond_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (rp.SecuritySignature.compare(respond_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (rp.PublicSessionKey.compare(respond_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (rp.MasterAddress.compare(respond_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (rp.MasterSignature.compare(respond_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (rp.Timestamp.toBuffer().compare(respond_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (rp.DestinationAddress.compare(respond_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (rp.SecondHalfKey.compare(respond_packet.SecondHalfKey)) return done(new Error('Invalid SecondHalfKey'));
            if (rp.SecondChallenge.compare(respond_packet.SecondChallenge)) return done(new Error('Invalid SecondChallenge'));
            if (rp.EncryptedFirstChallenge.compare(respond_packet.EncryptedFirstChallenge)) return done(new Error('Invalid FirstChallenge'));
            if (rp.Type !== respond_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build RespondPacket with invalid SecondKeyHalf', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(15), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
            done(new Error('Should throw for invalid SecondKeyHalf'));
        } catch (e) {
            done();
        }
    });

    test('Build RespondPacket with invalid SecondChallenge', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(15), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
            done(new Error('Should throw for invalid SecondChallenge'));
        } catch (e) {
            done();
        }
    });

    test('Build RespondPacket with invalid EncryptedFirstChallenge', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(15), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        try {
            const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
            done(new Error('Should throw for invalid EncryptedFirstChallenge'));
        } catch (e) {
            done();
        }
    });

    test('Build RespondPacket and check with invalid type', async (done: any) => {
        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
        respond_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(1), 'hex');
            invalid_sig.copy(raw.header, 0, 0, 1);
            try {
                const rp: RespondPacket = RespondPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid packet type'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build RespondPacket and check with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
        respond_packet.getRaw(keypair).then((raw: RawPackets) => {
            const invalid_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            invalid_sig.copy(raw.header, 219, 0, 65);
            try {
                const rp: RespondPacket = RespondPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detect invalid security signature'));
            } catch (e) {
                done();
            }
        });
    });

    test('Build valid RespondPacket and check with invalid session signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();
        const second_key_half: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const second_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');
        const encrypted_first_challenge: Buffer = Buffer.from('ff'.repeat(16), 'hex');

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');

        const respond_packet: RespondPacket = new RespondPacket(master_address, destination_address, master_signature, timestamp, second_key_half, second_challenge, encrypted_first_challenge);
        respond_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const rp: RespondPacket = RespondPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should detected invalid session signature'));
            } catch (e) {
                done();
            }
        });
    });

});
