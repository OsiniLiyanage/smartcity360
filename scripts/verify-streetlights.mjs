import {authenticatedFetch} from './auth-client.mjs';
// Requires local Payara/PostgreSQL. Retains labelled demo cities, specifications and three lights.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const base = process.env.SMARTCITY_URL || 'http://127.0.0.1:9080/smartcity360/api';
const fetch = await authenticatedFetch(base);
let checks = 0;
async function call(path, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}/${path}`, {method, headers: {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)});
    const value = await response.json().catch(() => null);
    assert.ok([expected].flat().includes(response.status), `${method} ${path}: ${response.status} ${value?.error || 'unexpected response'}`);
    assert.ok(value !== null); checks++;
    return {status: response.status, value};
}
const stamp = new Date().toISOString();
const city = (await call('cities', 'POST', {name: `Streetlight Demo ${stamp}`}, 201)).value;
const other = (await call('cities', 'POST', {name: `Streetlight Isolation ${city.id}`}, 201)).value;
let tree = (await call(`cities/${city.id}/zones`, 'POST', {name: 'Lighting District', type: 'DISTRICT'}, 201)).value;
const districtId = tree.children[0].id;
tree = (await call(`cities/${city.id}/zones`, 'POST', {name: 'Lantern Street', type: 'STREET', parentId: districtId}, 201)).value;
const streetId = tree.children[0].children[0].id;
const specBody = {model: `Demo shared lamp ${stamp}`, ratedWatts: 40, colour: 'WARM_WHITE'};
const concurrentSpecs = await Promise.all([1, 2].map(() => call('lamp-specifications', 'POST', specBody)));
const spec = concurrentSpecs[0].value;
assert.equal(concurrentSpecs[1].value.id, spec.id, 'Concurrent identical specs must deduplicate');
const alternate = (await call('lamp-specifications', 'POST', {...specBody, ratedWatts: 60})).value;
assert.notEqual(alternate.id, spec.id);
const specs = (await call('lamp-specifications')).value;
assert.equal(specs.filter(value => value.model === specBody.model && value.ratedWatts === 40).length, 1);
const path = `cities/${city.id}/streetlights`;
const first = (await call(path, 'POST', {streetId, specificationId: spec.id, label: 'SL-A', location: 'Library entrance'}, 201)).value;
const second = (await call(path, 'POST', {streetId, specificationId: spec.id, label: 'SL-B', location: 'Clinic entrance'}, 201)).value;
const third = (await call(path, 'POST', {streetId, specificationId: alternate.id, label: 'SL-C', location: 'Park gate'}, 201)).value;
let inventory = (await call(`${path}?page=0&pageSize=2`)).value;
assert.equal(inventory.total, 3); assert.equal(inventory.on, 3); assert.equal(inventory.ratedLoadWatts, 140);
assert.equal(inventory.pageSpecificationObjects, 1); assert.equal(inventory.distinctSpecifications, 2);
const next = (await call(`${path}?page=1&pageSize=2`)).value;
assert.deepEqual(next.items.map(item => item.id), [third.id]);
assert.equal((await call(`${path}?page=99&pageSize=2`)).value.items.length, 0);
const update = (item, fields = {}) => ({label: item.label, location: item.location, specificationId: item.specificationId,
    powerOn: item.powerOn, faulty: item.faulty, faultNote: item.faultNote, version: item.version, ...fields});
let current = (await call(`${path}/${first.id}`, 'PUT', update(first, {powerOn: false}))).value;
assert.equal(current.state, 'OFF'); assert.equal(current.ratedLoadWatts, 0);
assert.equal((await call(`${path}/${second.id}`)).value.state, 'ON');
assert.equal((await call(path)).value.ratedLoadWatts, 100);
current = (await call(`${path}/${first.id}`, 'PUT', update(current, {powerOn: true, faulty: true, faultNote: 'Lamp flickering'}))).value;
assert.equal(current.state, 'FAULT'); assert.equal(current.ratedLoadWatts, 0);
inventory = (await call(path)).value;
assert.equal(inventory.faulty, 1); assert.equal(inventory.on, 2);
assert.equal((await call(`${path}/${second.id}`)).value.faulty, false);
current = (await call(`${path}/${first.id}`, 'PUT', update(current, {faulty: false, faultNote: '', specificationId: alternate.id, location: 'Library east entrance'}))).value;
assert.equal(current.ratedWatts, 60); assert.equal(current.faultNote, '');
assert.equal((await call(`${path}/${second.id}`)).value.ratedWatts, 40);
assert.equal((await call(path)).value.ratedLoadWatts, 160);
await call(`${path}/${first.id}`, 'PUT', update(first, {powerOn: false}), 409);
await call(`${path}/${first.id}`, 'PUT', update(current, {label: 'SL-B'}), 409);
await call(`${path}/${first.id}`, 'PUT', update(current, {faulty: true, faultNote: ''}), 400);
await call(`${path}/${first.id}`, 'PUT', update(current, {faulty: 'true'}), 400);
await call(`${path}/${first.id}`, 'PUT', update(current, {specificationId: 9223372036854775000}), 404);
await call(`cities/${other.id}/streetlights/${first.id}`, 'GET', undefined, 404);
await call(`cities/${other.id}/streetlights/${first.id}`, 'PUT', update(current), 404);
await call(`cities/${other.id}/streetlights`, 'POST', {streetId, specificationId: spec.id, label: 'Other', location: 'Other'}, 404);
await call(path, 'POST', {streetId: districtId, specificationId: spec.id, label: 'Wrong level', location: 'Somewhere'}, 400);
await call(path, 'POST', {streetId, specificationId: spec.id, label: 'SL-B', location: 'Duplicate'}, 409);
for (const invalid of [null, [], {streetId: 1.5, specificationId: spec.id, label: 'Invalid', location: 'Somewhere'},
    {streetId, specificationId: spec.id, label: ' ', location: 'Somewhere'},
    {streetId, specificationId: spec.id, label: 'x'.repeat(61), location: 'Somewhere'}]) await call(path, 'POST', invalid, 400);
for (const changes of [{ratedWatts: 0}, {ratedWatts: 1001}, {ratedWatts: 40.5}, {model: ' '}, {colour: 'PURPLE'}])
    await call('lamp-specifications', 'POST', {...specBody, ...changes}, 400);
await call(`${path}?page=-1`, 'GET', undefined, 400);
await call(`${path}?pageSize=101`, 'GET', undefined, 400);
const outcomes = await Promise.all(['Position A', 'Position B'].map(location => call(`${path}/${first.id}`, 'PUT', update(current, {location}), [200, 409])));
assert.deepEqual(outcomes.map(result => result.status).sort(), [200, 409]);
const before = (await call(path)).value;
const demo = (await call('lamp-specifications/demo?count=100000')).value;
assert.equal(demo.lights, 100000); assert.equal(demo.sharedSpecifications, 3); assert.equal(demo.unsharedSpecifications, 100000);
assert.equal(demo.avoidedSpecificationObjects, 99997); assert.equal(demo.independentState, true); assert.equal(demo.databaseRecordsCreated, 0);
assert.deepEqual((await call(path)).value, before, 'In-memory demo must not change city records');
await call('lamp-specifications/demo?count=9', 'GET', undefined, 400);
await call('lamp-specifications/demo?count=100001', 'GET', undefined, 400);
const records = [];
for (const id of [first.id, second.id, third.id]) records.push((await call(`${path}/${id}`)).value);
await mkdir('.local', {recursive: true});
await writeFile('.local/streetlight-verification.json', JSON.stringify({cityId: city.id, records, inventory: before, demo}, null, 2));
console.log(`PASS: ${checks} HTTP checks; sharing, independent state, faults, pagination, concurrent edits and 100000-light demonstration. Demo city ${city.id}.`);
console.log(`Measured one combined demonstration run: ${demo.elapsedMilliseconds.toFixed(2)} ms; no heap-memory claim.`);
