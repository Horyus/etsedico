import { ConfirmationPacket, DataPacket, Packet } from '../btbd-packets';
import { UPackets, UPacketsEncryptionType }       from './UPackets';
import { ec_address, ec_gen, ec_sign }            from '../btbd-crypto';
import { ECKeyPair }                              from '../btbd-crypto/ec_gen';
import * as Crypto                                from 'crypto';

declare var describe;
declare var expect;
declare var test;

type Done = (arg?: any) => void;
const _test = (): void => {};

// thx https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array: any[]): any[] {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

describe('UPackets', () => {

    describe('Utilities', () => {

        test('Estimate number of packets with no encryption', () => {

            const test_data: Buffer = Buffer.from('o'.repeat(2637));

            expect(UPackets.estimatePacketCount(UPacketsEncryptionType.None, test_data, 550)).toBe(5);

        });

        test('Estimate number of packets with EC encryption #1', () => {

            const test_data: Buffer = Buffer.from('o'.repeat(1007));

            expect(UPackets.estimatePacketCount(UPacketsEncryptionType.EC, test_data, 505)).toBe(2);

        });

        test('Estimate number of packets with EC encryption #2', () => {

            const test_data: Buffer = Buffer.from('o'.repeat(1008));

            expect(UPackets.estimatePacketCount(UPacketsEncryptionType.EC, test_data, 512)).toBe(2);

        });

        test('Estimate number of packets with RSA encryption', () => {

            const test_data: Buffer = Buffer.from('o'.repeat(1024));

            expect(UPackets.estimatePacketCount(UPacketsEncryptionType.RSA, test_data, 512)).toBe(2);

        });

        test('Estimate size of packet with EC encryption #1', () => {
            expect(UPackets.estimatePacketSize(UPacketsEncryptionType.EC, 511)).toBe(512);
        });

        test('Estimate size of packet with EC encryption #2', () => {
            expect(UPackets.estimatePacketSize(UPacketsEncryptionType.EC, 512)).toBe(528);
        });

        test('Estimate size of packet with RSA encryption', () => {
            expect(UPackets.estimatePacketSize(UPacketsEncryptionType.RSA, 511)).toBe(511);
        });

        test('Estimate size of packet with no encryption', () => {
            expect(UPackets.estimatePacketSize(UPacketsEncryptionType.None, 511)).toBe(511);
        });

        test('Check default UPacket size value', () => {
            expect(UPackets.UPacketSize).toBe(550);
        });

        test('Edit and Check UPacket size value', () => {
            UPackets.setUpacketSize(1024);
            expect(UPackets.UPacketSize).toBe(1024);
        });

    });

    describe('Fragmentation and Feeding', () => {

        test('Fragment DataPacket and feed in order, with No encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.None, data_packet, keypair, keypair.publicKey, null);
            if (encrypted.length !== 2) return done(new Error('Invalid amount of encrypted fragments'));
            await UPackets.feed(encrypted[0], keypair.privateKey, {});
            const packet: Packet = await UPackets.feed(encrypted[1], keypair.privateKey, {});
            const dp = packet as DataPacket;
            if (!dp) return done(new Error('Returned value should not be null'));
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

        test('Fragment DataPacket and feed in order, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 2) return done(new Error('Invalid amount of encrypted fragments'));
            await UPackets.feed(encrypted[0], keypair.privateKey, {
                [master_address.toString('hex')]: key
            });
            const packet: Packet = await UPackets.feed(encrypted[1], keypair.privateKey, {
                [master_address.toString('hex')]: key
            });
            const dp = packet as DataPacket;
            if (!dp) return done(new Error('Returned value should not be null'));
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

        test('Fragment DataPacket and feed in order, with RSA encryption, invalid RSA key', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(31);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            try {
                const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
                return done(new Error('Should throw with invalid RSA key provided'));
            } catch (e) {
                return done();
            }
        });

        test('Fragment DataPacket and feed in order but with upacketsize too small, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            UPackets.setUpacketSize(1);
            try {
                const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
                return done(new Error('Should throw because of upacket size too small'));
            } catch (e) {
                UPackets.setUpacketSize(1024);
               return done();
            }
        });

        test('Fragment heavy DataPacket and feed in order with tiny fragment, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data'.repeat(1000));
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 13) return done(new Error('Invalid amount of encrypted fragments, expected 13 got ' + encrypted.length));

            let packet;
            encrypted[0] = encrypted[0].slice(2, 12);
            try {
                for (const fragment of encrypted) {
                    packet = await UPackets.feed(fragment, keypair.privateKey, {
                        [master_address.toString('hex')]: key
                    });

                }
                done(new Error('Should not be able to leave loop with invalid header'));
            } catch (e) {
                done();
            }
        });

        test('Fragment heavy DataPacket and feed in order with invalid header, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data'.repeat(1000));
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 13) return done(new Error('Invalid amount of encrypted fragments, expected 13 got ' + encrypted.length));

            let packet;
            encrypted[0] = encrypted[0].slice(0, encrypted[0].length - 2);
            try {
                for (const fragment of encrypted) {
                    packet = await UPackets.feed(fragment, keypair.privateKey, {
                        [master_address.toString('hex')]: key
                    });

                }
                done(new Error('Should not be able to leave loop with invalid header'));
            } catch (e) {
                done();
            }
        });

        test('Fragment heavy DataPacket and feed in order, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data'.repeat(1000));
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 13) return done(new Error('Invalid amount of encrypted fragments, expected 13 got ' + encrypted.length));

            let packet;
            for (const fragment of encrypted) {
                packet = await UPackets.feed(fragment, keypair.privateKey, {
                    [master_address.toString('hex')]: key
                });

            }
            if (packet === null) throw new Error('Should not be null after all feeding');

            const dp = packet as DataPacket;
            if (!dp) return done(new Error('Returned value should not be null'));
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

        test('Fragment heavy DataPacket and feed in reverse order, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data'.repeat(1000));
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 13) return done(new Error('Invalid amount of encrypted fragments, expected 13 got ' + encrypted.length));

            let packet;
            for (let idx = encrypted.length - 1; idx >= 0; --idx) {
                packet = await UPackets.feed(encrypted[idx], keypair.privateKey, {
                    [master_address.toString('hex')]: key
                });

            }
            if (packet === null) throw new Error('Should not be null after all feeding');

            const dp = packet as DataPacket;
            if (!dp) return done(new Error('Returned value should not be null'));
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

        test('Fragment heavy DataPacket and feed randomly, with RSA encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data'.repeat(1000));
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            let encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 13) return done(new Error('Invalid amount of encrypted fragments, expected 13 got ' + encrypted.length));

            encrypted = shuffle(encrypted);
            let packet;
            for (const fragment of encrypted) {
                packet = await UPackets.feed(fragment, keypair.privateKey, {
                    [master_address.toString('hex')]: key
                });

            }
            if (packet === null) throw new Error('Should not be null after all feeding');

            const dp = packet as DataPacket;
            if (!dp) return done(new Error('Returned value should not be null'));
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

        test('Fragment DataPacket and feed in order, with EC encryption, with invalid EC Key', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method, UPacketsEncryptionType.EC);
            try {
                const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.EC, data_packet, keypair, keypair.publicKey, keypair.publicKey.slice(0, 5));
                return done(new Error('Should throw with invalid EC key provided'));
            } catch (e) {
                return done();
            }
        });

        test('Fragment DataPacket and feed in order, with EC encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method, UPacketsEncryptionType.EC);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.EC, data_packet, keypair, keypair.publicKey, keypair.publicKey);
            if (encrypted.length !== 2) return done(new Error('Invalid amount of encrypted fragments'));
            await UPackets.feed(encrypted[0], keypair.privateKey, {});
            const packet: Packet = await UPackets.feed(encrypted[1], keypair.privateKey, {});
            const dp = packet as DataPacket;

            if (!dp) return done(new Error('Returned value should not be null'));
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

        test('Fragment ConfirmationPacket and feed in order, with EC encryption', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));
            const packet_id: Buffer = Buffer.from('00224455668899aabb', 'hex');

            const confirmation_packet: ConfirmationPacket = new ConfirmationPacket(master_address, destination_address, master_signature, timestamp, packet_id);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.EC, confirmation_packet, keypair, keypair.publicKey, keypair.publicKey);
            if (encrypted.length !== 1) return done(new Error('Invalid amount of encrypted fragments'));
            const packet: Packet = await UPackets.feed(encrypted[0], keypair.privateKey, {});
            const cp = packet as ConfirmationPacket;

            if (cp.RawHeader.compare(confirmation_packet.RawHeader)) return done(new Error('Invalid RawHader'));
            if (cp.PacketID.compare(confirmation_packet.PacketID)) return done(new Error('Invalid PacketID'));
            if (cp.SecuritySignature.compare(confirmation_packet.SecuritySignature)) return done(new Error('Invalid SecuritySignature'));
            if (cp.PublicSessionKey.compare(confirmation_packet.PublicSessionKey)) return done(new Error('Invalid PublicSessionKey'));
            if (cp.MasterAddress.compare(confirmation_packet.MasterAddress)) return done(new Error('Invalid MasterAddress'));
            if (cp.MasterSignature.compare(confirmation_packet.MasterSignature)) return done(new Error('Invalid MasterSignature'));
            if (cp.Timestamp.toBuffer().compare(confirmation_packet.Timestamp.toBuffer())) return done(new Error('Invalid Timestamp'));
            if (cp.DestinationAddress.compare(confirmation_packet.DestinationAddress)) return done(new Error('Invalid DestinationAddress'));
            if (cp.Type !== confirmation_packet.Type) return done(new Error('Invalid Type'));

            done();
        });

        test('Fragment DataPacket and feed in order, with RSA encryption, but provide key store without key', async (done: Done): Promise<void> => {
            const master_keypair: ECKeyPair = ec_gen();
            const master_address: Buffer = ec_address(master_keypair.publicKey);

            const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
            const data: Buffer = new Buffer('This is data');
            const method: string = 'salut';
            const timestamp: number = Date.now();
            const keypair: ECKeyPair = ec_gen();
            const key = Crypto.randomBytes(32);

            const master_signature: Buffer = await ec_sign(master_keypair.privateKey, ec_address(keypair.publicKey));

            const data_packet: DataPacket = new DataPacket(master_address, destination_address, master_signature, timestamp, data, method);
            const encrypted: Buffer[] = await UPackets.fragment(UPacketsEncryptionType.RSA, data_packet, keypair, keypair.publicKey, key);
            if (encrypted.length !== 2) return done(new Error('Invalid amount of encrypted fragments'));
            await UPackets.feed(encrypted[0], keypair.privateKey, {
                [master_address.toString('hex')]: key
            });
            try {
                const packet: Packet = await UPackets.feed(encrypted[1], keypair.privateKey, {});
                done(new Error('Should throw as it tries to decrypt without key'));
            } catch (e) {
                done();
            }
        });

    });

});
