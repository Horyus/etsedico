import { ECKeyPair }                      from '../btbd-crypto/ec_gen';
import { ec_gen }                         from '../btbd-crypto';
import { Packet, PacketType, RawPackets } from './Packet';

declare var describe;
declare var expect;
declare var test;

class TestPacket extends Packet {
    constructor(type: PacketType, master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number) {
        super(type, master_address, destination_address, master_signature, timestamp);
    }

    public async getRaw(SessionKey: ECKeyPair): Promise<RawPackets> {
        return ({
            header: new Buffer('hola'),
            body: new Buffer('bye')
        });
    }

}

describe('Packet Test Suite', () => {

    test('Testing invalid type', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const timestamp: number = Date.now();

        try {
            const data_packet = new TestPacket(undefined, master_address, destination_address, master_signature, timestamp);
            return done(new Error('Should throw on invalid type'));
        } catch (e) {
            return done();
        }

    });

    test('Testing invalid master address', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const timestamp: number = Date.now();

        try {
            const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);
            return done(new Error('Should throw on invalid type'));
        } catch (e) {
            return done();
        }

    });

    test('Testing invalid destination address #1', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const timestamp: number = Date.now();

        try {
            const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);
            return done(new Error('Should throw on invalid type'));
        } catch (e) {
            return done();
        }

    });

    test('Testing invalid destination address #2', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = undefined;
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const timestamp: number = Date.now();

        try {
            const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);
            return done(new Error('Should throw on invalid type'));
        } catch (e) {
            return done();
        }

    });

    test('Testing invalid master_signature #1', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const timestamp: number = Date.now();

        try {
            const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, undefined, timestamp);
            return done(new Error('Should throw on invalid master_signature'));
        } catch (e) {
            return done();
        }

    });

    test('Testing invalid master_signature #2', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(64), 'hex');
        const timestamp: number = Date.now();

        try {
            const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);
            return done(new Error('Should throw on invalid master_signature'));
        } catch (e) {
            return done();
        }

    });

    test('Testing invalid timestamp', (done: any) => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const timestamp: number = undefined;

        try {
            const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);
            return done(new Error('Should throw on invalid timestamp'));
        } catch (e) {
            return done();
        }

    });

    test('Testing valid packet', () => {

        const master_address: Buffer = Buffer.from('2cbF4D21528bFe33368d553D8fA0E2b227469B9e', 'hex');
        const destination_address: Buffer = Buffer.from('889716f93bcF0ce09Ef4e57498E94fD0B84FDAD4', 'hex');
        const master_signature: Buffer = Buffer.from(('ff' as string).repeat(65), 'hex');
        const timestamp: number = Date.now();

        const data_packet = new TestPacket(PacketType.DataPacket, master_address, destination_address, master_signature, timestamp);

    });

});
