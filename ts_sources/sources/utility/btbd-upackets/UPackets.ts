export enum UPacketsEncryptionType {
    RSA = 0,
    EC,
    None
}

export class UPackets {

    public static UPacketSize: number = 550;

    public static estimatePacketCount(enc: UPacketsEncryptionType, data: Buffer, size: number): number {
        switch (enc) {
            case UPacketsEncryptionType.EC:
                const estimation: number = data.length + (data.length % 16 === 0 ? 16 : (16 - data.length % 16));
                return Math.floor(estimation / size) + ((estimation % size) ? 1 : 0);
            case UPacketsEncryptionType.RSA:
            case UPacketsEncryptionType.None:
                return Math.floor(data.length / size) + ((data.length % size) ? 1 : 0);
        }
    }

    public static estimatePacketSize(enc: UPacketsEncryptionType, data_size: number): number {
        switch (enc) {
            case UPacketsEncryptionType.EC:
                return data_size + (data_size % 16 === 0 ? 16 : (16 - data_size % 16));
            case UPacketsEncryptionType.RSA:
            case UPacketsEncryptionType.None:
                return data_size;
        }
    }

    public static setUpacketSize(size: number): void {
        UPackets.UPacketSize = size;
    }
}
