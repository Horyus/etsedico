import * as Socket from 'utp-punch/connection';

/**
 * Type of the connection Signature.
 */
export type Signature = string;

/**
 * Class used to extract IP and Port from Connection and produce the unique signature.
 */
export class ConnectionInfos {

    private readonly socket: Socket;

    /**
     * Public IPV4 IP of current connection endpoint.
     */
    public readonly ip: string;

    /**
     * Port of current connection endpoint.
     */
    public readonly port: number;

    /**
     * Type can be `INCOMING` or `OUTGOING`, depending on how the connection has been established.
     */
    public readonly type: string;

    /**
     * Creates a new instance of {@link ConnectionInfos}.
     *
     * @param {Socket} socket Instance of socket from the connection.
     * @param {boolean} incoming True if incoming, false if outgoing.
     */
    constructor(socket: Socket, incoming: boolean) {
        this.socket = socket;
        this.ip = socket.host;
        this.port = socket.port;
        this.type = incoming ? 'INCOMING' : 'OUTGING';
    }

    /**
     * Returns a unique signature used as reference.
     *
     * @returns {Signature} Signature of the connection.
     */
    public getUniqueSignature(): Signature {
        return ('<' + (this.type === 'INCOMING' ? 'I' : 'O') + ' ' + this.ip + ' ' + this.port + '>');
    }

    /**
     * Destroys the current connection.
     */
    public drop(): void {
        this.socket.destroy();
    }

    /**
     * Getter on the UTP socket.
     *
     * @returns {Socket} Stored socket.
     */
    public get Socket(): Socket {
        return this.socket;
    }

}
