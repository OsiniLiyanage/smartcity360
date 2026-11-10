# Energy meters - Part A

Open `http://localhost:9080/smartcity360/meters.html`, or choose **Energy meters** from the application navigation.

## Setup and demonstration

1. Run the database helper's Setup action to apply `004_meters.sql`, then build/deploy normally.
2. Create a city/district/street/building in City zones if needed. Register one meter for the building.
3. Registration opens the credential dialog with a random meter credential issued once. Save it privately if you need it after leaving the page. The server stores only its hash; the browser keeps credentials only in page memory.
4. Open a meter, choose Add reading, enter a usage total and choose authentication, compression and encryption options. All three start selected. Set credential opens the credential dialog without losing the reading form.
5. Process the reading. It is saved only after the transformed data recovers exactly; the building total is replaced and Composite city totals update.
6. Select a saved reading and choose Recover and verify. Recovery rebuilds the reading's saved layer choices.
7. Test corrupted copy flips one byte in an in-memory copy. It never changes the database payload. The original should still recover afterwards.

The page displays raw byte sizes before Base64 encoding. Small messages may grow after compression/encryption; this is shown as an increase, not hidden. Use the same reporting period for all buildings' totals. Saved history is not added repeatedly into usage totals.

## Records and separate dialogs

The city inventory searches all loaded meters by name and building location,
with 25 rows per page. Open shows a dedicated meter view with its building
usage and saved-reading table. Back to meters returns to the inventory.
Saved readings also display 25 rows at a time, newest first. Both lists still
load fully from the existing API; this is display pagination, not server pagination.

Registration, credentials, Add reading and payload inspection open in separate
dialogs. Inspect supports recovery and corruption checks using the saved layer
choices. Opening Set credential from another dialog returns to that dialog
when closed. Closing the credential dialog masks its value again; credentials
remain only in this tab's memory and are never written to browser storage.

Registration and credential replacement remain restricted to supervisors,
city managers and system admins. Local staff can process and recover readings
within their permitted city. Residents have no access to this workspace.

## Manual layout checklist

The 10 November records revision has basic JavaScript syntax, HTML control
reference and packaging checks. Browser interaction and write workflows have
not been rechecked for this layout.

1. Search meters by name/building, open one and use Back to meters. Check
   pagination where there are more than 25 meters or readings.
2. As an authorized account, open Register meter. Required fields and buildings
   without meters should behave as before. A successful registration should
   show its one-time credential; save that privately.
3. Open Add reading. Use Set credential, then Done to return without losing
   entered usage or layer choices. Missing authentication credentials should
   show an actionable alert. Cancel should not create a reading.
4. Save one valid reading. Its saved payload should open, and building/city
   totals should update. Check Recover and verify and Test corrupted copy.
   A corrupted copy must not alter the stored reading.
5. Check Close/Escape, alerts, both themes and mobile table scrolling. Local
   staff should not see registration or credential replacement. Avoid replacing
   a credential solely for a visual check: it invalidates the previous value.

## API

Routes are relative to `/api/cities/{cityId}/meters`.

| Method and route | Operation |
|---|---|
| GET `/` | List meters without credentials or hashes |
| POST `/` | `{buildingId, name}`; returns 201 with `{meter, credential}` once |
| POST `/{meterId}/credential` | Replace credential; previous value immediately stops working |
| GET `/{meterId}/readings` | Saved readings and processed Base64 payloads, newest first |
| POST `/{meterId}/readings` | `{usageKwh, authentication, compression, encryption, credential}`; flags are required booleans |
| POST `/{meterId}/readings/{readingId}/recover` | `{credential, simulateTampering?}`; returns `{verified, recovered}` or an error |

One meter is allowed per building. Usage permits 0–999999999.999 kWh with up to three decimals. Incorrect selected-layer credentials return 401; invalid inputs/corrupted copies return 400; cross-city or wrong-meter targets return 404; duplicate registration returns 409. Credential issuance and recovery responses use `Cache-Control: no-store`.

## Processing and storage

`MeterStream` is the common interface; `PlainMeterStream` is the base. `MeterStreamDecorator` holds another stream. Compression and encryption call their wrapped component during encoding, then add their transformation. Decoding removes the outer transformation before delegating inward. Authentication is outermost and checks credentials before either operation proceeds.

The service uses one city-level transaction for processing, the building usage change and the reading insert. Failed processing never updates the building. Recovery is read-only. Meter and reading entities bypass JPA shared caching, and stored times are UTC instants with millisecond precision.

`meter` stores registration and a SHA-256 hash of a generated 256-bit random credential. `meter_reading` stores flags, usage metadata, payload sizes, the original digest, processed Base64 payload and time. Usage metadata is plaintext even when the message payload is encrypted. The original digest is an application consistency check, not a replacement for cryptographic authentication; AES-GCM verifies its own tag when encryption is selected.

## Private encryption key

The server creates a 32-byte AES key at:

`<Payara domain>/config/smartcity360-meter.key`

On this setup the domain is `D:\OODP2\tools\payara7\glassfish\domains\smartcity360`. The key is outside the repository and never returned through an API. The file uses the domain's inherited operating-system permissions. Treat it as a private development secret and back it up privately with the database. Never include it, `.local` credentials or database files in the submission ZIP/GitHub repository.

The key survives WAR deployment/restarts. On startup/use, a malformed key file fails closed. If encrypted rows exist and the file is missing, the service refuses to create a new key; restore the original private backup. Multiple-key rotation and distributed key storage are not implemented.

Meter credential replacement does not replace the encryption key. It changes the credential used by the authentication wrapper; the new credential is required to recover earlier authenticated readings too.

## Verification and limits

- `mvn test`: seven Decorator tests plus the 11 earlier tests.
- `node scripts/verify-meters.mjs`: live integration checks, retaining two labelled demo cities, a meter and nine accepted readings per successful run. A private restart snapshot with a generated demo credential is written only under ignored `.local`.
- Tests cover all eight combinations, exact recovery, invalid credentials, credential replacement, corruption, scoped records and unchanged totals on rejection.
- The browser is a local simulation client, not a physical meter or independent transport service. Individual messages are bounded to 64 KiB; continuous streaming/backpressure is not implemented.
- Optional authentication is for showing the pattern. It does not protect unrelated API endpoints. Separate application accounts and role/city permissions now protect every meter endpoint; see [accounts](ACCOUNTS.md). Public production deployment remains outside this local checkpoint.
- Readings and meter lists currently load in full; no throughput, retention or large-history benchmark is claimed.

See the separate [A1–A3 report draft](report/PART_A_DECORATOR.md) for the pattern explanation, UML source and references.
