declare var describe;
declare var expect;
declare var test;

import { UPackets, UPacketsEncryptionType } from './UPackets';

type Done = (arg?: any) => void;

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

});
