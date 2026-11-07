// Requires local Payara/PostgreSQL. Retains two labelled demo cities and four complaints.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const base = process.env.SMARTCITY_URL || 'http://127.0.0.1:9080/smartcity360/api';
let checks = 0;
async function call(path, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}/${path}`, {
        method, headers: {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    const content = await response.text();
    let result;
    try { result = JSON.parse(content); }
    catch { assert.fail(`${method} ${path}: expected JSON; got ${response.status} ${content.slice(0, 160)}`); }
    assert.ok([expected].flat().includes(response.status), `${method} ${path}: ${response.status} ${JSON.stringify(result)}`);
    checks++;
    return {status: response.status, result};
}
const city = (await call('cities', 'POST', {name: `Complaint Demo ${new Date().toISOString()}`}, 201)).result;
const other = (await call('cities', 'POST', {name: `Complaint Isolation ${city.id}`}, 201)).result;
const tree = (await call(`cities/${city.id}/zones`, 'POST', {name: 'Central District', type: 'DISTRICT'}, 201)).result;
const zoneId = tree.children[0].id;
const path = `cities/${city.id}/complaints`;
const body = {residentName: 'Demo Resident', subject: 'Missed waste collection', description: 'Collection was missed near the community centre.', severity: 'LOW', zoneId};
const low = (await call(path, 'POST', body, 201)).result;
const medium = (await call(path, 'POST', {...body, subject: 'Repeated noise disturbance', severity: 'MEDIUM'}, 201)).result;
const high = (await call(path, 'POST', {...body, subject: 'Major road obstruction', severity: 'HIGH', zoneId: null}, 201)).result;
for (const [item, authority, actors] of [
    [low, 'LOCAL_STAFF', ['LOCAL_STAFF']],
    [medium, 'SUPERVISOR', ['LOCAL_STAFF', 'SUPERVISOR']],
    [high, 'CITY_MANAGER', ['LOCAL_STAFF', 'SUPERVISOR', 'CITY_MANAGER']]
]) {
    assert.equal(item.assignedTo, authority);
    assert.equal(item.status, 'ASSIGNED');
    assert.deepEqual(item.history.slice(1).map(event => event.actor), actors);
    assert.equal(item.history.at(-1).type, 'ASSIGNED');
}
assert.equal(low.zoneName, 'Central District');
assert.equal(high.zoneName, 'Whole city');
for (const changes of [
    {residentName: ''}, {subject: '  '}, {description: null}, {severity: 'URGENT'},
    {subject: 'x'.repeat(161)}, {description: 'x'.repeat(2001)}, {residentName: 'x'.repeat(101)},
    {zoneId: 1.5}, {zoneId: -1}, {zoneId: 1e30}, {severity: 1}
]) await call(path, 'POST', {...body, ...changes}, 400);
await call(path, 'POST', null, 400);
await call(path, 'POST', [], 400);
await call(path, 'POST', 'not an object', 400);
await call(`cities/${other.id}/complaints`, 'POST', body, 404);
await call(`cities/${other.id}/complaints/${low.id}`, 'GET', undefined, 404);
await call(`cities/${other.id}/complaints/${low.id}/status`, 'PUT', {status: 'IN_PROGRESS', note: 'Wrong city', version: low.version}, 404);
await call('cities/9223372036854775807/complaints', 'GET', undefined, 404);

const lowPath = `${path}/${low.id}`;
await call(`${lowPath}/status`, 'PUT', {status: 'RESOLVED', note: 'Cannot skip work', version: low.version}, 409);
await call(`${lowPath}/status`, 'PUT', {status: 'IN_PROGRESS', note: ' ', version: low.version}, 400);
await call(`${lowPath}/status`, 'PUT', {status: 'IN_PROGRESS', note: 'No version'}, 400);
let current = (await call(`${lowPath}/status`, 'PUT', {status: 'IN_PROGRESS', note: 'Local crew started investigating.', version: low.version})).result;
assert.equal(current.status, 'IN_PROGRESS');
assert.ok(current.version > low.version);
await call(`${lowPath}/status`, 'PUT', {status: 'RESOLVED', note: 'Stale browser', version: low.version}, 409);
await call(`${lowPath}/escalate`, 'PUT', {severity: 'MEDIUM', note: 'Stale browser', version: low.version}, 409);
await call(`${lowPath}/escalate`, 'PUT', {severity: 'LOW', note: 'Same severity', version: current.version}, 400);
current = (await call(`${lowPath}/escalate`, 'PUT', {severity: 'MEDIUM', note: 'Several streets are now affected.', version: current.version})).result;
assert.equal(current.status, 'ASSIGNED');
assert.equal(current.assignedTo, 'SUPERVISOR');
assert.ok(current.history.some(event => event.type === 'STATUS_CHANGED'));
assert.equal(current.history.filter(event => event.type === 'ESCALATED').length, 1);
current = (await call(`${lowPath}/escalate`, 'PUT', {severity: 'HIGH', note: 'Disruption has spread across the city.', version: current.version})).result;
assert.equal(current.assignedTo, 'CITY_MANAGER');
current = (await call(`${lowPath}/status`, 'PUT', {status: 'IN_PROGRESS', note: 'City response team started work.', version: current.version})).result;
current = (await call(`${lowPath}/status`, 'PUT', {status: 'RESOLVED', note: 'Collection restored and streets checked.', version: current.version})).result;
assert.equal(current.status, 'RESOLVED');
await call(`${lowPath}/escalate`, 'PUT', {severity: 'HIGH', note: 'Cannot escalate resolved work', version: current.version}, 409);
current = (await call(`${lowPath}/status`, 'PUT', {status: 'IN_PROGRESS', note: 'Resident reported an outstanding location.', version: current.version})).result;
assert.equal(current.history.at(-1).type, 'REOPENED');

const concurrent = (await call(path, 'POST', {...body, subject: 'Concurrent edit demonstration'}, 201)).result;
const outcomes = await Promise.all(['Window A', 'Window B'].map(note => call(`${path}/${concurrent.id}/status`, 'PUT', {
    status: 'IN_PROGRESS', note, version: concurrent.version
}, [200, 409])));
assert.deepEqual(outcomes.map(item => item.status).sort(), [200, 409]);
const finalConcurrent = (await call(`${path}/${concurrent.id}`)).result;
assert.equal(finalConcurrent.history.filter(event => event.type === 'STATUS_CHANGED').length, 1);
assert.equal((await call(path)).result.length, 4, 'Rejected submissions must not create records');
const records = [];
for (const id of [low.id, medium.id, high.id, concurrent.id]) records.push((await call(`${path}/${id}`)).result);
await mkdir('.local', {recursive: true});
await writeFile('.local/complaint-verification.json', JSON.stringify({cityId: city.id, records}, null, 2));
console.log(`PASS: ${checks} HTTP checks; all severity routes, history, status transitions, escalation, isolation and concurrent edit protection. Demo city ${city.id}.`);
