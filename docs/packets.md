# Packet Protocol

## Introduction

This document explains what are the different types of packets inside `etsedico`. Then each packet type fields are
detailed.

## Beforehand

`etsedico` is a [binary protocol](https://en.wikipedia.org/wiki/Binary_protocol). This means that all packets should be formatted to big endian when traveling on
the network. `etsedico` is built on top of [`UDP`](https://en.wikipedia.org/wiki/User_Datagram_Protocol), and uses common
strategies like `UDP Hole Punching` in order to achieve connection between peers. Because of `UDP` limitations, a `Packet` is divided
into `µPackets`, that have a maximum size of 508 bytes. `etsedico` is able to reconstruct `Packets` on each communicating end, while
ensuring message safety and authenticity. `etsedico` was not built for large packets transmission, and should be used with something
like `IPFS` to store and exchange large data.

### µPackets

As messages will often be bigger than 508 bytes, we need to cut them into `µPackets`. Each `µPacket` has a `µHeader` containing
the `µPacket` packet id, index and size. This information is used for integrity checks and reconstitution. We are using [AES256CTR](https://www.npmjs.com/package/aes-js)
for encryption, and we have no size difference between encrypted and decrypted data.

`µPackets` with idx of 0 will have a `nanosecond_timestamp` as packet id. Those with idx > 0 will have the first 8 bytes of `keccak256(string(nanosecond_timestamp) + checksummed(master_address))` (and `master_address` has no `0x` prefix).

---

<a name="uheader"></a>
#### `µHeader`: 14 bytes

| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `packet_id` | Nanosecond timestamp if idx is `0`. Otherwise, `keccak256(string(nanosecond_timestamp) + checksummed(master_address))`.  | `8` |
| `index` | Index of the current `µPacket`. If `0`, contains `Header` | `4` |
| `size` | Size of current `µPacket` | `2` |

---

## Header and Body

Each `Packet` has a mandatory `Header` that contains informations and security informations. This Header will always fit
inside one `µPacket`. The `Body` can be separated between multiple `µPackets`.

### Packet Types

- [Data Packet](#data_packet)
- [Confirmation Packet](#confirmation_packet)
- [Loss Packet](#loss_packet)

---
---

<a name="data_packet"></a>
### Key Exchange Packet

The first `µPacket` contains the `Header`. There is no body. This packet is not encrypted !

When packet of this type is received, and all security checks have passed, response with the same packet should be made.

This packet is used to exchange public keys if one (or both) of the peer are missing keys.

----

<a name="dkey_exchange_packet"></a>
#### `Key Exchange Packet`: 14 bytes (µHeader) + 204 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader` | [`µHeader`](#uheader) | `14` |
| `type` | Packet type (here 0) | `1` |
| `master_address` | Ethereum Real Address of the user | `20` |
| `destination_address` | Ethereum Real Address of destination user | `20` |
| `session_public_key` | EC Temporary public key used for dynamic signatures | `33` |
| `session_signature` | ECDSA Signature of the `session_public_key` emitted from the `master_address` | `65` |
| `security_signature` | Signature of all the previous made from session keypair | `65` |

----



<a name="data_packet"></a>
### Data Packet

The first `µPacket` contains the `Header`. Then all the following ones the `Body`. This packet is encrypted.

This packet is used for any type of exchange.

----

<a name="data_packet_header"></a>
#### `Data Packet Header`: 14 bytes (µHeader) + 272 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader` | [`µHeader`](#uheader) | `14` |
| `type` | Packet type (here 1) | `1` |
| `method` | Method name, used for usage flexibility | `32` |
| `master_address` | Ethereum Real Address of the user | `20` |
| `destination_address` | Ethereum Real Address of destination user | `20` |
| `session_public_key` | EC Temporary public key used for dynamic signatures | `33` |
| `session_signature` | ECDSA Signature of the `session_public_key` emitted from the `master_address` | `65` |
| `body_checksum` | `keccak256` Checksum of whole body | `32` |
| `body_packets` | Amount of `µPackets` that contain the body | `4` |
| `security_signature` | Signature of all the previous made from session keypair | `65` |

----

<a name="data_packet_body_fragment"></a>
#### `Data Packet Body Fragment`: 14 bytes (µHeader) + 0 to 494 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader` | [`µHeader`](#uheader) | `14` |
| `data` | Packet type | `µHeader`.`size` |

----

#### Encryption Schema

`µHeader` is not encrypted.
`Header` is encrypted without body.
`Body` is encrypted as a whole element then split into `µPackets`.

```
Raw Body
+---------------------------------------------------------------------------+
|Lorem ipsum ..................................................... dolor sit| 494
|amet, consectetur ......................................... adipiscing elit| 494
|sed do ..................................................... eiusmod tempor| 494
|incididunt ut ................................................... labore et| 400
+---------------------------------------------------------------------------+

Encrypted Body
+---------------------------------------------------------------------------+
|*********** ..................................................... *********| 494
|***************** ......................................... ***************| 494
|****** ..................................................... **************| 494
|************* ................................................... *********| 400
+---------------------------------------------------------------------------+

Fragmented Body
+---------------------------------------------------------------------------+
| µPacket => |µHeader: idx=1 size=494|*********** ................ *********| 508
| µPacket => |µHeader: idx=2 size=494|***************** .... ***************| 508
| µPacket => |µHeader: idx=3 size=494|****** ................ **************| 508
| µPacket => |µHeader: idx=4 size=400|************* .............. *********| 414
+---------------------------------------------------------------------------+

Complete Data Packet Sequence
+---------------------------------------------------------------------------+
| µPacket => |µHeader: idx=0 size=272|** . Encrypted Data Packet Header . **| 286
| µPacket => |µHeader: idx=1 size=494|*********** ................ *********| 508
| µPacket => |µHeader: idx=2 size=494|***************** .... ***************| 508
| µPacket => |µHeader: idx=3 size=494|****** ................ **************| 508
| µPacket => |µHeader: idx=4 size=400|************* .............. *********| 414
+---------------------------------------------------------------------------+
```

Header is built after Body encryption, to be able to enter checksum and `µPacket` count.
A `Packet` is considered as received when all the `µPackets` are properly received.

---
---

<a name="confirmation_packet"></a>
### Confirmation Packet

Used to notify the sender that the whole Data Packet has been properly received.

---

<a name="confirmation_packet_header"></a>
#### `Confirmation Packet`: 14 bytes (µHeader) + 212 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader` | [`µHeader`](#uheader) | `14` |
| `type` | Packet type (here 2) | `1` |
| `packet_id` | Package id of previous packet that is getting confirmed | `8` |
| `master_address` | Ethereum Real Address of the user | `20` |
| `destination_address` | Ethereum Real Address of destination user | `20` |
| `session_public_key` | EC Temporary public key used for dynamic signatures | `33` |
| `session_signature` | ECDSA Signature of the `session_public_key` emitted from the `master_address` | `65` |
| `security_signature` | Signature of all the previous made from session keypair | `65` |

---

#### Encryption Schema

Everything except the `µHeader` is encrypted with the handshake key.

---
---

<a name="loss_packet"></a>
### Loss Packet

This packet is used to notify the sender of possible `µPackets` that did not make it in a Data Packet. It fits into
one `µPacket`.

---

<a name="loss_packet_header"></a>
#### `Loss Packet`: 14 bytes (µHeader) + 214 to 494 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader` | [`µHeader`](#uheader) | `14` |
| `type` | Packet type (here 3) | `1` |
| `packet_id` | Package id of previous packet with missing `µPackets` | `8` |
| `master_address` | Ethereum Real Address of the user | `20` |
| `destination_address` | Ethereum Real Address of destination user | `20` |
| `session_public_key` | EC Temporary public key used for dynamic signatures | `33` |
| `session_signature` | ECDSA Signature of the `session_public_key` emitted from the `master_address` | `65` |
| `miss_size` | Size of miss field | `2` |
| `miss` | Data indicating missing `µPackets` indexes, in [Miss Field Format](#miss_field_format). | `0` to `280` |
| `security_signature` | Signature of all the previous made from session keypair | `65` |

---

<a name="miss_field_format"></a>
#### Miss Field Format

The Miss Field Format is used to list `µPacket` indexes that need to be sent again.

Two schemas are available.

`x:y` defines value `y` stored in `x` bytes.

##### Unique list

Used to list unique indexes.
```
|1:1|4:count|4:idx1| ... |4:idx_count|
```
```
|1:1|4:5|4:22|4:33|4:44|4:55|4:66|
----------------------------------
Missing indexes are 22, 33, 44, 55
and 66.
```

##### Range list

Used to capture multiple missing indexes that are a suite.
```
|1:2|4:begin_idx|4:end_idx|
```
```
|1:2|4:5|4:10|
------------------------------------
Missing indexes are 5, 6, 7, 8, 9
and 10.
```

#### Encryption Schema

Everything except the `µHeader` is encrypted with the handshake key.
