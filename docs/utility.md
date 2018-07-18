# Utility packets

## Introduction

This document describe the utility packages that can be sent at any time.
If no handshake has been done, these packages are not encrypted. Otherwise
they are encrypted (except `µHeader`)

## Packets

* [Drop](#drop)
* [Ping](#ping)
* [Pong](#pong)

<a name="drop"></a>
#### `drop`

Action dropping a connection with an error code explaining why the connection is dropped.

---
### `drop`: 14 bytes (µHeader) + 206 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader`| [µHeader](#uheader) | `14` |
| `type` | Packet type (here 252) | `1` |
| `master_address` | Ethereum Real Address of the user | `20` |
| `destination_address` | Ethereum Real Address of destination user | `20` |
| `session_public_key` | EC Temporary public key used for dynamic signatures | `33` |
| `session_signature` | ECDSA Signature of the `session_public_key` emitted from the `master_address` | `65` |
| `error_code` | Error code, reason of connection drop | `2` |
| `security_signature` | Signature of all the previous made from session keypair | `65` |
---

<a name="ping"></a>
#### `ping`

`ping` request.

---
### `ping`: 14 bytes (µHeader) + 204 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader`| [µHeader](#uheader) | `14` |
| `type` | Packet type (here 251) | `1` |
| `master_address` | Ethereum Real Address of the user | `20` |
---

<a name="pong"></a>
#### `pong`

`pong` response.

---
### `pong`: 14 bytes (µHeader) + 204 bytes
| Field Name | Field Description | Field Byte Size |
|------------|-------------------|-----------------|
| `µHeader`| [µHeader](#uheader) | `14` |
| `type` | Packet type (here 250) | `1` |
| `master_address` | Ethereum Real Address of the user | `20` |
---

