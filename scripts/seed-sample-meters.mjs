// Add one meter per existing sample city without resetting data or replacing credentials.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {administrator} from './auth-client.mjs';
const base = process.env.SMARTCITY_URL || 'http://127.0.0.1:9080/smartcity360/api';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw Error('Sample setup is local only.');
const apply = process.argv.includes('--apply');
const client = await administrator(base);
const stateFile = '.local/sample-meter-credentials.json';
let state;
try { state = JSON.parse(await readFile(stateFile, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; state = {}; }
async function saveState() {
    await mkdir('.local', {recursive: true});
    await writeFile(stateFile, JSON.stringify(state, null, 2));
}
async function call(path, method = 'GET', body, status = 200) {
    const result = await client.call(path, method, body);
    if (result.status !== status) throw Error(`${method} ${path} failed (${result.status}). Stop and inspect before retrying.`);
    return result.value;
}
function flat(node) { return [node, ...node.children.flatMap(flat)]; }
const cities = await call('cities');
for (const name of ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Kurunegala']) {
    const matches = cities.filter(city => city.name.replace(/\s*\(demo\)\s*$/i, '') === name);
    if (matches.length !== 1) throw Error(`Expected exactly one existing city named ${name}.`);
    const city = matches[0], path = `cities/${city.id}/meters`;
    const tree = await call(`cities/${city.id}/zones`);
    const buildings = flat(tree).filter(node => node.type === 'BUILDING');
    const building = buildings.find(node => /library/i.test(node.name)) || buildings[0];
    if (!building) throw Error(`${name} has no building. No city or building will be created automatically.`);
    const meters = await call(path);
    let meter = meters.find(value => value.buildingId === building.id);
    if (!apply) { console.log(`${name}: ${meter ? 'keep existing' : 'register'} meter for ${building.name}.`); continue; }
    if (!meter) {
        const issued = await call(path, 'POST', {buildingId: building.id, name: `${building.name} energy meter`}, 201);
        meter = issued.meter;
        state[meter.id] = {cityId: city.id, buildingId: building.id, credential: issued.credential};
        // Persist issuance immediately, before any further request. Never print credentials.
        await saveState();
    }
    const readingsPath = `${path}/${meter.id}/readings`;
    const readings = await call(readingsPath);
    if (!readings.length && state[meter.id]?.cityId === city.id) {
        await call(readingsPath, 'POST', {usageKwh: building.usageKwh,
            credential: state[meter.id].credential, authentication: true, compression: true, encryption: true}, 201);
        console.log(`${name}: meter ready with a saved reading; existing building total preserved.`);
    } else {
        console.log(`${name}: existing meter/readings preserved${readings.length ? '' : '; no locally saved credential, reading skipped'}.`);
    }
}
console.log(apply ? 'Sample meters ready. Private credentials are only in ignored .local.' : 'Preview only. Run with --apply to save.');
