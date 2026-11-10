# Streetlight inventory and Flyweight sharing

Part D combines a saved streetlight inventory with shared, immutable lamp specifications. Open `http://localhost:9080/smartcity360/streetlights.html` after starting PostgreSQL and Payara.

## Setup and workflow

Run the database helper's `Setup` action to apply numbered SQL files through `005_streetlights.sql`, then build and deploy as described in the README. Existing records are preserved. Three initial lamp specifications are provided.

1. Create a city, district and street in the City workspace if needed.
2. Open Streetlights and select that city.
3. Choose an existing specification or create one using a model, rated watts and colour.
4. Register a light with a unique label within its city, its street and a location description. New lights start on and healthy.
5. Select a saved light to edit its label, location, specification, commanded power or fault status. Reporting a fault requires a note. Clearing a fault clears its current note.
6. Save and inspect the inventory and city summary. Other lights retain their individual settings even when they share a specification.
7. Run the separate sharing demonstration with 10,000, 50,000 or 100,000 temporary lights. It creates no database records.

The page displays a table of 25 records at a time. Search by pole label,
location or model and the state filter apply only to the current page; the
summary totals always describe the whole city. Use Previous/Next to browse
other pages. Registration, light editing, new lamp specifications and the
sharing demonstration each open in a separate dialog. Street assignment is
fixed after registration. There is currently no deletion, bulk control or
maintenance-history screen. Fault notes describe the current state, not an
audit trail.

Registration is available to supervisors, city managers and system admins.
New specifications and the sharing demonstration are admin-only. Local staff
can view and update lights in their permitted city. Residents cannot use this
workspace. These follow the existing API permissions.

## Manual acceptance for the records layout

This layout revision has not been run through automated or browser tests.

1. Choose a city, search the current page, filter by state and clear the filters.
   Confirm totals stay city-wide and pagination still moves through records.
2. Register a light with an authorized account. The form should be separate
   from the table, and successful registration should open the new light's
   details. Try a duplicate label and an empty required field.
3. Open an existing light, change power or fault status and save. A fault needs
   a note. Reload to confirm persistence; clear the fault and confirm its note
   clears. Restore any values changed only for checking.
4. As admin, open Add specification and Specification sharing. Confirm the
   demonstration reports zero new database records. Local staff should not
   see these actions or Register streetlight.
5. Check both themes and a narrow viewport. Table scrolling should stay inside
   its container. Escape/Close should dismiss dialogs, restore focus and leave
   alerts usable. Cancel should not save an edited value.

## What is shared

`LampSpecification` contains model, rated watts and colour. It has no setters. The application-scoped `LampSpecificationFactory` returns the same Java object for the same configuration using a concurrent map. Model names have surrounding whitespace removed; matching remains case-sensitive. Changing a light's specification selects a different shared object instead of changing the old object for every light.

Each `StreetLight` keeps its own ID, street, location, commanded power and fault status. Its database record also keeps its label, fault note and edit version. The table references one specification row, but database normalization alone is not the Flyweight implementation: the service also resolves those rows through the Java pool when constructing light contexts.

The pool is rebuilt after restart/redeployment as configurations are requested. It has no eviction; its retained size depends on the number of distinct configurations used. The inventory reports actual distinct specification object identities on the current page separately from the number of configurations used across the city.

## API

All paths below start with `/api`. Requests that write data use JSON.

| Method and path | Input or result |
|---|---|
| `GET /lamp-specifications` | Global specification catalogue |
| `POST /lamp-specifications` | `{model, ratedWatts, colour}`; HTTP 200 with existing or newly created configuration |
| `GET /lamp-specifications/demo?count=10000` | Isolated demonstration; count from 10 to 100000 |
| `GET /cities/{cityId}/streetlights?page=0&pageSize=25` | Page of lights, city totals and page object-sharing count |
| `POST /cities/{cityId}/streetlights` | `{streetId, specificationId, label, location}`; HTTP 201 |
| `GET /cities/{cityId}/streetlights/{id}` | Light details and current edit version |
| `PUT /cities/{cityId}/streetlights/{id}` | `{label, location, specificationId, powerOn, faulty, faultNote, version}` |

Models accept 1–100 characters, labels 1–60, locations 1–150 and fault notes up to 500. Rated watts must be an integer from 1 to 1000. Colours are `WARM_WHITE`, `NEUTRAL_WHITE` or `COOL_WHITE`. Pages are zero-based, from 0 to 100000; page sizes range from 1 to 100. Validation errors return 400, missing/cross-city targets 404, duplicate labels and stale edits 409. Refresh a record before retrying a stale edit.

The service validates that the selected zone is a street in the selected city. Mutations lock that city within a transaction. A stored version prevents an older form from overwriting newer changes. The database uniquely constrains each model/watts/colour combination, and concurrent creation of the same configuration reuses its record.

## Interpreting the figures

`on` counts healthy lights whose commanded power is on. Fault status takes precedence in the displayed state. Simulated rated load is the sum of rated watts for healthy, on lights; off or faulty lights contribute zero by this project's simplifying assumption. It is not a physical measurement or kWh consumption. It is not added to building meter totals, and hierarchy power commands do not control this separate inventory.

The demonstration creates actual shared contexts and actual unshared baseline specification objects, then counts identities. With 100,000 lights and three configurations it reports three shared specification objects versus 100,000 baseline specification objects. Each light still needs its own context. The displayed elapsed time covers the combined demonstration, including both allocations; it is not a controlled comparison or a heap-memory measurement. The demonstration is serialized and bounded, uses its own pool and does not change the live inventory.

## Verification and limits

Six Flyweight JUnit tests cover sharing identity, distinct configurations, independent state, concurrent lookup, 100,000 contexts and validation. `node scripts/verify-streetlights.mjs` runs 55 live HTTP checks, retaining two demo cities and three lights per successful run. It also creates test specifications and saves a non-secret verification snapshot in ignored `.local`.

See [verification evidence](VERIFICATION.md) for browser and restart checks, and [D1–D3 report material](report/PART_D_FLYWEIGHT.md) for the assignment explanation and UML source. Application login and role/city boundaries are enforced; see [accounts](ACCOUNTS.md). These are local simulated controls, not hardware commands or proof of production database throughput.
