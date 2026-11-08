import {authenticatedFetch} from './auth-client.mjs';
// Live integration check. Requires running Payara/PostgreSQL and retains labelled demo data.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

const base = process.env.SMARTCITY_URL || 'http://127.0.0.1:9080/smartcity360/api';
const fetch = await authenticatedFetch(base);
let checks = 0;
async function call(path, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}/${path}`, {
        method, headers: {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    checks++;
    return result;
}
function flatten(node) { return [node, ...node.children.flatMap(flatten)]; }
const city = await call('cities', 'POST', {name: `Composite Demo ${new Date().toISOString()}`}, 201);
const path = `cities/${city.id}/zones`;
let tree = await call(path);
assert.equal(tree.powerState, 'EMPTY');
assert.equal(tree.usageKwh, 0);
const otherCity = await call('cities', 'POST', {name: `Isolation Demo ${city.id}`}, 201);
async function add(name, type, parentId = null) {
    tree = await call(path, 'POST', {name, type, parentId}, 201);
    return flatten(tree).find(node => node.name === name).id;
}
const east = await add('East District', 'DISTRICT');
const west = await add('West District', 'DISTRICT');
const first = await add('Lake Road', 'STREET', east);
const second = await add('Park Road', 'STREET', west);
const a = await add('Library', 'BUILDING', first);
const b = await add('Clinic', 'BUILDING', first);
const c = await add('Community Hall', 'BUILDING', second);
for (const [id, usageKwh] of [[a, 12.125], [b, 7.875], [c, 5]]) {
    tree = await call(`${path}/${id}/usage`, 'PUT', {usageKwh});
}
assert.equal(tree.usageKwh, 25);
assert.equal(tree.buildingCount, 3);
tree = await call(`${path}/power`, 'PUT', {zoneId: east, powerOn: false});
assert.equal(tree.powerState, 'MIXED');
assert.equal(tree.poweredCount, 1);
assert.equal(flatten(tree).find(node => node.id === c && node.type === 'BUILDING').powerState, 'ON');
assert.equal(tree.usageKwh, 25);
tree = await call(`${path}/power`, 'PUT', {zoneId: a, powerOn: true});
assert.equal(tree.poweredCount, 2);
tree = await call(`${path}/power`, 'PUT', {powerOn: false});
assert.equal(tree.powerState, 'OFF');
tree = await call(`${path}/power`, 'PUT', {powerOn: true});
assert.equal(tree.poweredCount, 3);
// Concurrent commands on different districts must both survive the city row lock.
await Promise.all([east, west].map(zoneId => call(`${path}/power`, 'PUT', {zoneId, powerOn: false})));
tree = await call(path);
assert.equal(tree.poweredCount, 0);
await call(`${path}/power`, 'PUT', {powerOn: true});

for (const body of [
    {name: 'Skip a level', type: 'BUILDING'},
    {name: 'Wrong parent', type: 'STREET', parentId: a},
    {name: '   ', type: 'DISTRICT'},
    {name: 'x'.repeat(101), type: 'DISTRICT'},
    {name: 'Unknown type', type: 'PARK'},
    {name: 'Invalid ID', type: 'STREET', parentId: 1.5},
    {name: 'Oversized ID', type: 'STREET', parentId: 1e30},
    {name: 'Root type', type: 'CITY'}
]) await call(path, 'POST', body, 400);
for (const usageKwh of [-1, 0.0001, 1000000000, '5', null]) {
    await call(`${path}/${a}/usage`, 'PUT', {usageKwh}, 400);
}
await call(`${path}/${east}/usage`, 'PUT', {usageKwh: 5}, 400);
await call(`${path}/power`, 'PUT', {powerOn: 'false'}, 400);
await call(`cities/${otherCity.id}/zones`, 'POST', {name: 'Cross city', type: 'STREET', parentId: east}, 404);
await call(`cities/${otherCity.id}/zones/${a}/usage`, 'PUT', {usageKwh: 1}, 404);
await call(`cities/${otherCity.id}/zones/power`, 'PUT', {zoneId: a, powerOn: false}, 404);
await call('cities/9223372036854775807/zones', 'GET', undefined, 404);
tree = await call(path);
assert.equal(flatten(tree).length, 8, 'Rejected requests must not create any nodes');
assert.equal(tree.usageKwh, 25, 'Rejected requests must not change readings');
assert.equal(tree.poweredCount, 3);
await mkdir('.local', {recursive: true});
await writeFile('.local/zone-verification.json', JSON.stringify({cityId: city.id, tree}, null, 2));
console.log(`PASS: ${checks} HTTP checks, totals, subtree isolation, concurrent commands and validation. Retained demo city ${city.id}.`);
