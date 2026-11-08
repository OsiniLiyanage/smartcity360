import {authenticatedFetch} from './auth-client.mjs';
// Live Part A regression. Retains labelled demo data; credentials stay in ignored .local only.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const base = process.env.SMARTCITY_URL || 'http://127.0.0.1:9080/smartcity360/api';
const fetch = await authenticatedFetch(base);
let checks = 0;
async function call(path, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}/${path}`, {
        method, headers: {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    const value = await response.json().catch(() => null);
    // Never include a returned credential in error output.
    assert.equal(response.status, expected, `${method} ${path}: ${value?.error || 'unexpected status'}`);
    assert.ok(value !== null, 'Expected JSON'); checks++;
    return value;
}
function flat(node) { return [node, ...node.children.flatMap(flat)]; }
const city = await call('cities', 'POST', {name: `Meter Demo ${new Date().toISOString()}`}, 201);
const other = await call('cities', 'POST', {name: `Meter Isolation ${city.id}`}, 201);
const zonePath = `cities/${city.id}/zones`;
async function zone(name, type, parentId = null) {
    const tree = await call(zonePath, 'POST', {name, type, parentId}, 201);
    return flat(tree).find(node => node.name === name).id;
}
const district = await zone('Meter Demo District', 'DISTRICT');
const street = await zone('Meter Demo Street', 'STREET', district);
const building = await zone('Demo Library', 'BUILDING', street);
const neighbour = await zone('Demo Clinic', 'BUILDING', street);
await call(`${zonePath}/${neighbour}/usage`, 'PUT', {usageKwh: 5});
const path = `cities/${city.id}/meters`;
const issued = await call(path, 'POST', {buildingId: building, name: 'Library meter'}, 201);
const meterId = issued.meter.id;
let credential = issued.credential;
assert.ok(typeof credential === 'string' && credential.length >= 40, 'Credential must be generated');
const listed = await call(path);
assert.deepEqual(Object.keys(listed[0]).sort(), ['buildingId', 'id', 'name']);
await call(path, 'POST', {buildingId: building, name: 'Duplicate'}, 409);
await call(path, 'POST', {buildingId: street, name: 'Not a building'}, 400);
await call(`cities/${other.id}/meters`, 'POST', {buildingId: building, name: 'Cross-city'}, 404);
await call(path, 'POST', {buildingId: neighbour, name: ' '}, 400);
await call(path, 'POST', {buildingId: 1.5, name: 'Fraction'}, 400);
await call(path, 'POST', null, 400);
await call(path, 'POST', [], 400);
const readPath = `${path}/${meterId}/readings`;
const expectedReadings = [];
for (let mask = 0; mask < 8; mask++) {
    const options = {usageKwh: 10 + mask + 0.125, credential,
        compression: !!(mask & 1), encryption: !!(mask & 2), authentication: !!(mask & 4)};
    const reading = await call(readPath, 'POST', options, 201);
    expectedReadings.push(reading);
    assert.ok(reading.originalBytes > 0 && reading.encodedBytes > 0);
    assert.equal(Buffer.from(reading.payloadBase64, 'base64').length, reading.encodedBytes);
    const recovered = await call(`${readPath}/${reading.id}/recover`, 'POST', {credential});
    assert.equal(recovered.verified, true);
    const message = JSON.parse(recovered.recovered);
    assert.equal(message.meterId, meterId);
    assert.equal(message.buildingId, building);
    assert.equal(message.usageKwh, options.usageKwh);
    const tree = await call(zonePath);
    assert.equal(tree.usageKwh, options.usageKwh + 5, 'Latest reading replaces building total');
}
const last = expectedReadings.at(-1);
const invalid = {usageKwh: 99, credential: 'invalid-demo-credential', authentication: true, compression: true, encryption: true};
await call(readPath, 'POST', invalid, 401);
await call(`${readPath}/${last.id}/recover`, 'POST', {credential: 'invalid-demo-credential'}, 401);
await call(`${readPath}/${last.id}/recover`, 'POST', {credential, simulateTampering: true}, 400);
await call(`${readPath}/${last.id}/recover`, 'POST', {credential});
for (const usageKwh of [-1, 0.0001, 1000000000, '20', null]) {
    await call(readPath, 'POST', {...invalid, credential, usageKwh}, 400);
}
await call(readPath, 'POST', {...invalid, credential, authentication: 'true'}, 400);
await call(readPath, 'POST', {usageKwh: 10, credential}, 400);
await call(readPath, 'POST', null, 400);
await call(readPath, 'POST', [], 400);
await call(`cities/${other.id}/meters/${meterId}/readings`, 'GET', undefined, 404);
await call(`cities/${other.id}/meters/${meterId}/credential`, 'POST', undefined, 404);
assert.equal((await call(readPath)).length, 8, 'Rejected readings must not be stored');
assert.equal((await call(zonePath)).usageKwh, 22.125, 'Rejected readings must not update totals');
const oldCredential = credential;
const replacement = await call(`${path}/${meterId}/credential`, 'POST');
credential = replacement.credential;
assert.ok(credential !== oldCredential, 'Replacement must issue a new credential');
await call(`${readPath}/${last.id}/recover`, 'POST', {credential: oldCredential}, 401);
await call(`${readPath}/${last.id}/recover`, 'POST', {credential});
// Authentication is deliberately optional for this pattern demonstration.
const unprotected = await call(readPath, 'POST', {...invalid, usageKwh: 18.125, authentication: false}, 201);
await call(`${readPath}/${unprotected.id}/recover`, 'POST', {});
const records = await call(readPath);
await mkdir('.local', {recursive: true});
await writeFile('.local/meter-verification.json', JSON.stringify({cityId: city.id, meterId, credential, records}, null, 2));
console.log(`PASS: ${checks} HTTP checks; eight layer combinations, recovery, credentials, corrupted copies, isolation and unchanged totals on rejection. Demo city ${city.id}.`);
