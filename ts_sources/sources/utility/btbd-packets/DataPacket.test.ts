import { ECKeyPair }                   from '../btbd-crypto/ec_gen';
import { DataPacket }                  from './DataPacket';
import { ec_address, ec_gen, ec_sign } from '../btbd-crypto';
import { RawPackets }                  from './Packet';
import { UPacketsEncryptionType }      from '../btbd-upackets/UPackets';

declare var describe;
declare var expect;
declare var test;

describe('DataPacket Test Suite', () => {

    test('Build valid DataPacket', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const method: string = 'salut';
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
        data_packet.getRaw(keypair).then((raw: RawPackets) => {
            const dp: DataPacket = DataPacket.fromRaw(raw.header, raw.body, timestamp);

            if (dp.RawHeader.compare(data_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (dp.SecuritySignature.compare(data_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (dp.PublicSessionKey.compare(data_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (dp.PacketCount !== data_packet.PacketCount) return done(new Error('Invalid PacketCount'));
            if (dp.DataChecksum.compare(data_packet.DataChecksum)) return done(new Error('Invalid DataChecksum'));
            if (dp.Data.compare(data_packet.Data)) return done(new Error('Invalid Data'));
            if (dp.Method !== data_packet.Method) return done(new Error('Invalid Method'));
            if (dp.MasterAddress.compare(data_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (dp.MasterSignature.compare(data_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (dp.Timestamp.toBuffer().compare(data_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (dp.DestinationAddress.compare(data_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (dp.Type !== data_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build valid DataPacket with custom encryption scheme estimation', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const method: string = 'salut';
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method, UPacketsEncryptionType.EC);
        data_packet.getRaw(keypair).then((raw: RawPackets) => {
            const dp: DataPacket = DataPacket.fromRaw(raw.header, raw.body, timestamp);

            if (dp.RawHeader.compare(data_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (dp.SecuritySignature.compare(data_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (dp.PublicSessionKey.compare(data_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (dp.PacketCount !== data_packet.PacketCount) return done(new Error('Invalid PacketCount'));
            if (dp.DataChecksum.compare(data_packet.DataChecksum)) return done(new Error('Invalid DataChecksum'));
            if (dp.Data.compare(data_packet.Data)) return done(new Error('Invalid Data'));
            if (dp.Method !== data_packet.Method) return done(new Error('Invalid Method'));
            if (dp.MasterAddress.compare(data_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (dp.MasterSignature.compare(data_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (dp.Timestamp.toBuffer().compare(data_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (dp.DestinationAddress.compare(data_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (dp.Type !== data_packet.Type) return done(new Error('Invalid Type'));

            done();
        });
    });

    test('Build valid DataPacket and recover with invalid security signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const method: string = 'salut';
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
        data_packet.getRaw(keypair).then((raw: RawPackets) => {
            const empty_sig: Buffer = Buffer.from('ee'.repeat(65), 'hex');
            empty_sig.copy(raw.header, 239, 0, 65);
            try {
                const dp: DataPacket = DataPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should throw for invalid security signature'));
            } catch (e) {
                done();
            }

        });
    });

    test('Build valid DataPacket and recover with invalid master signature', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const method: string = 'salut';
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = Buffer.from('ee'.repeat(65), 'hex');

        const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
        data_packet.getRaw(keypair).then((raw: RawPackets) => {
            try {
                const dp: DataPacket = DataPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should throw for invalid master signature'));
            } catch (e) {
                done();
            }

        });
    });

    test('Build valid DataPacket and recover with invalid body checksum', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const method: string = 'salut';
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
        data_packet.getRaw(keypair).then((raw: RawPackets) => {
            const empty_sig: Buffer = Buffer.from('ee'.repeat(32), 'hex');
            empty_sig.copy(raw.header, 203, 0, 32);
            try {
                const dp: DataPacket = DataPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should throw for invalid data checksum'));
            } catch (e) {
                done();
            }

        });
    });

    test('Build valid DataPacket and recover with invalid packet type', async (done: any) => {

        const master_keypair: ECKeyPair = ec_gen();
        const master_address: Buffer = ec_address(master_keypair.publicKey);

        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const method: string = 'salut';
        const timestamp: number = Date.now();
        const keypair: ECKeyPair = ec_gen();

        const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

        const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
        data_packet.getRaw(keypair).then((raw: RawPackets) => {
            const empty_sig: Buffer = Buffer.from('02', 'hex');
            empty_sig.copy(raw.header, 0, 0, 1);
            try {
                const dp: DataPacket = DataPacket.fromRaw(raw.header, raw.body, timestamp);
                done(new Error('Should throw for invalid packet type'));
            } catch (e) {
                done();
            }

        });
    });

    test('Build DataPacket with invalid method', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const data: Buffer = new Buffer('This is data');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const method: string = 's'.repeat(50);
        const timestamp: number = Date.now();

        try {
            const data_packet = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            return done(new Error('Should throw'));
        } catch (e) {
            return done();
        }

    });

});
