import {authenticatedFetch} from './auth-client.mjs';
// Retains two labelled demo cities, policies and immutable evaluation evidence.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const base = process.env.SMARTCITY_URL || 'http://127.0.0.1:9080/smartcity360/api';
const fetch = await authenticatedFetch(base);
let checks = 0;
async function call(path, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}/${path}`, {method, headers: {'Content-Type':'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)});
    const value = await response.json().catch(() => null);
    assert.ok([expected].flat().includes(response.status), `${method} ${path}: ${response.status} ${value?.error || 'unexpected response'}`);
    assert.ok(value !== null); checks++; return {status: response.status, value};
}
const stamp = new Date().toISOString();
const city = (await call('cities','POST',{name:`Policy Demo ${stamp}`},201)).value;
const other = (await call('cities','POST',{name:`Policy Isolation ${city.id}`},201)).value;
let tree = (await call(`cities/${city.id}/zones`,'POST',{name:'Civic District',type:'DISTRICT'},201)).value;
const districtId = tree.children[0].id;
tree = (await call(`cities/${city.id}/zones`,'POST',{name:'Library Street',type:'STREET',parentId:districtId},201)).value;
const zoneId = tree.children[0].children[0].id;
const otherTree = (await call(`cities/${other.id}/zones`,'POST',{name:'Other District',type:'DISTRICT'},201)).value;
const path = `cities/${city.id}/policies`;
const noiseBody = {name:'Overnight noise limit',category:'NOISE',expression:'noise > 65 AND (hour >= 22 OR hour < 6)',trueMeaning:'VIOLATION',active:true};
const valid = (await call('policy-language/validate','POST',{expression:noiseBody.expression})).value;
assert.equal(valid.grouping,'(noise > 65 AND (hour >= 22 OR hour < 6))'); assert.deepEqual(valid.requiredFields,['hour','noise']);
let noise = (await call(path,'POST',noiseBody,201)).value;
assert.ok(Number.isInteger(noise.version) && noise.version >= 0);
const parking = (await call(path,'POST',{name:'Daytime parking permission',category:'PARKING',expression:'hour >= 8 AND hour < 18 AND parkingMinutes <= 120',trueMeaning:'PERMITTED',active:true},201)).value;
const shortCircuit = (await call(path,'POST',{...noiseBody,name:'Missing observation guard',category:'CUSTOM',expression:'hour == 0 OR noise > 65'},201)).value;
assert.equal((await call(path)).value.total,3);
assert.deepEqual((await call(`${path}?page=1&pageSize=1`)).value.items.map(p => p.id),[parking.id]);
assert.equal((await call(`${path}?page=99`)).value.items.length,0);
const evaluation = (policy, observations, extras = {}) => ({zoneId,version:policy.version,observations,note:'Scripted demonstration observation',...extras});
const results = [];
for (const [observations, outcome] of [[{noise:70,hour:23},'VIOLATION'],[{noise:65,hour:23},'NO_VIOLATION'],[{noise:70,hour:0},'VIOLATION'],[{noise:70,hour:6},'NO_VIOLATION']]) {
    const row = (await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,observations),201)).value;
    assert.equal(row.outcome,outcome); results.push(row);
}
for (const [observations, outcome] of [[{hour:8,parkingMinutes:120},'PERMITTED'],[{hour:18,parkingMinutes:120},'NOT_PERMITTED'],[{hour:17,parkingMinutes:121},'NOT_PERMITTED']]) {
    const row = (await call(`${path}/${parking.id}/evaluations`,'POST',evaluation(parking,observations),201)).value;
    assert.equal(row.outcome,outcome); results.push(row);
}
const history = (await call(`${path}/${noise.id}/evaluations?pageSize=2`)).value;
assert.equal(history.total,4); assert.equal(history.items.length,2);
assert.deepEqual((await call(`${path}/${noise.id}/evaluations?page=1&pageSize=2`)).value.items.map(row => row.id),[results[1].id,results[0].id]);
const update = (row, changes = {}) => ({name:row.name,category:row.category,expression:row.expression,trueMeaning:row.trueMeaning,active:row.active,version:row.version,...changes});
const originalNoise = noise;
noise = (await call(`${path}/${noise.id}`,'PUT',update(noise,{expression:'noise > 75 AND (hour >= 22 OR hour < 6)'}))).value;
assert.ok(noise.version > originalNoise.version);
const changed = (await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23}),201)).value;
assert.equal(changed.outcome,'NO_VIOLATION'); results.push(changed);
const retained = (await call(`${path}/${noise.id}/evaluations`)).value.items.find(row => row.id === results[0].id);
assert.deepEqual(retained,results[0], 'Editing a rule must not rewrite an earlier result');
await call(`${path}/${noise.id}`,'PUT',update(originalNoise),409);
await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(originalNoise,{noise:70,hour:23}),409);
await call(`${path}/${noise.id}`,'PUT',update(noise,{expression:'noise >'}),400);
assert.equal((await call(`${path}/${noise.id}`)).value.version,noise.version);
noise = (await call(`${path}/${noise.id}`,'PUT',update(noise,{active:false}))).value;
await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23}),409);
assert.equal((await call(`${path}/${noise.id}/evaluations`)).value.total,5);
noise = (await call(`${path}/${noise.id}`,'PUT',update(noise,{active:true}))).value;
const races = await Promise.all(['Concurrent A','Concurrent B'].map(name => call(`${path}/${noise.id}`,'PUT',update(noise,{name}),[200,409])));
assert.deepEqual(races.map(row => row.status).sort(),[200,409]);
noise = (await call(`${path}/${noise.id}`)).value;
await call(`cities/${other.id}/policies/${noise.id}`,'GET',undefined,404);
await call(`cities/${other.id}/policies/${noise.id}`,'PUT',update(noise),404);
await call(`cities/${other.id}/policies/${noise.id}/evaluations`,'GET',undefined,404);
await call(`cities/${other.id}/policies/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23}),404);
await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23},{zoneId:otherTree.children[0].id}),404);
await call(path,'POST',{...noiseBody,name:noise.name},409);
await call(`${path}/${noise.id}`,'PUT',update(noise,{name:parking.name}),409);
for (const invalid of [null,[],{}, {...noiseBody,active:'true'},{...noiseBody,category:'OTHER'},{...noiseBody,trueMeaning:'YES'},{...noiseBody,name:' '},{...noiseBody,expression:'x'.repeat(1001)}])
    await call(path,'POST',invalid,400);
for (const expression of ['noise = 65','noise > 65 trailing','noise > 1e2','noise > 65 AND','noise > 65; alert(1)','NOT '.repeat(22)+'noise > 65']) {
    const error = (await call('policy-language/validate','POST',{expression},400)).value;
    assert.ok(error.error.includes('character'));
}
for (const observations of [{noise:70},{noise:70,hour:24},{noise:'70',hour:23},{noise:70,hour:1.5},{noise:200.001,hour:23},{noise:70.0001,hour:23},{noise:70,hour:23,unexpected:1},{noise:null,hour:23},null,[]])
    await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,observations),400);
await call(`${path}/${shortCircuit.id}/evaluations`,'POST',evaluation(shortCircuit,{hour:0}),400);
await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23},{note:'x'.repeat(501)}),400);
await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23},{version:1.5}),400);
await call(`${path}/${noise.id}/evaluations`,'POST',evaluation(noise,{noise:70,hour:23},{zoneId:0}),400);
for (const query of ['page=-1','pageSize=101','pageSize=0','page=100001']) {
    await call(`${path}?${query}`,'GET',undefined,400);
    await call(`${path}/${noise.id}/evaluations?${query}`,'GET',undefined,400);
}
assert.equal((await call(`${path}/${noise.id}/evaluations`)).value.total,5,'Rejected requests must not add history');
// Keep a readable final demo policy name after the competing-edit check.
noise = (await call(`${path}/${noise.id}`,'PUT',update(noise,{name:'Overnight noise limit'}))).value;
const policies = (await call(path)).value;
const histories = {};
for (const policy of policies.items) histories[policy.id] = (await call(`${path}/${policy.id}/evaluations`)).value;
await mkdir('.local',{recursive:true});
await writeFile('.local/policy-verification.json',JSON.stringify({cityId:city.id,zoneId,policies,histories,checks},null,2));
console.log(`PASS: ${checks} policy HTTP checks; city ${city.id}; ${policies.total} policies, ${Object.values(histories).reduce((sum,h) => sum+h.total,0)} retained evaluations.`);
