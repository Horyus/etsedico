import { Uint64BE }    from 'int64-buffer';
import { ECKeyPair }   from '../btbd-crypto/ec_gen';
import * as EthAddress from 'ethereum-address';

/**
 * Defines all the different types of packets
 */
export enum PacketType {
    DataPacket = 1,
    ConfirmationPacket = 2,
    LossPacket = 3,
    DropPacket = 4,
    PingPacket = 5,
    PongPacket = 6,
    EngagePacket = 7,
    RememberPacket = 8,
    RespondPacket = 9,
    AgreePacket = 10
}

/**
 * Utility interface for the raw format of the packets
 */
export interface RawPackets {
    body: Buffer;
    header: Buffer;
}

/**
 * Abstract class from which all packets derive
 */
export abstract class Packet {

    public Type: PacketType;
    public MasterAddress: Buffer;
    public DestinationAddress: Buffer;
    public Timestamp: Uint64BE;
    public MasterSignature: Buffer;

    /**
     * Constructor simply assigning values to instance variables and making format checks
     *
     * @param type
     * @param master_address
     * @param destination_address
     * @param master_signature
     * @param timestamp
     */
    protected constructor(type: PacketType, master_address: Buffer, destination_address: Buffer, master_signature: Buffer, timestamp: number) {
        if (!master_address || !master_address.length || !EthAddress.isAddress(master_address.toString('hex'))) throw new Error('Invalid Master Address: Should be an Ethereum Address');
        if (!destination_address || !destination_address.length || !EthAddress.isAddress(destination_address.toString('hex'))) throw new Error('Invalid Destination Address: Should be an Ethereum Address');
        if (type === undefined) throw new Error('Invalid argument for type: should not be undefined');
        if (master_signature === undefined || master_signature.length !== 65) throw new Error('Invalid argument for master_signature: should not be undefined or have a length different than 65');
        if (timestamp === undefined) throw new Error('Invalid argument for timestamp: should not be undefined');

        this.Type = type;
        this.MasterAddress = master_address;
        this.DestinationAddress = destination_address;
        this.MasterSignature = master_signature;
        this.Timestamp = new Uint64BE(timestamp);
    }

    /**
     * getRaw method should compute and sign everything needed and return the packet in its raw format
     * @param SessionKey
     */
    abstract async getRaw(SessionKey: ECKeyPair): Promise<RawPackets>;
}
