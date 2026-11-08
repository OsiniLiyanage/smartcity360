import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {AuthClient,administrator} from './auth-client.mjs';

const mode=process.argv[2];
if(!['snapshot','verify'].includes(mode))throw Error('Use snapshot before restart or verify after restart.');
const base=process.env.SMARTCITY_API || 'http://localhost:9080/smartcity360/api';
const demo=JSON.parse(await readFile('.local/account-verification.json','utf8'));
const admin=await administrator(base);
async function get(client,path){const response=await client.call(path);assert.equal(response.status,200,path);return response.value;}
const accounts=await get(admin,'admin/accounts');
for(let page=1;accounts.items.length<accounts.total;page++){
    const next=await get(admin,`admin/accounts?page=${page}`);
    assert.ok(next.items.length,'Account pagination must advance');accounts.items.push(...next.items);
}
const snapshot={accounts,events:await get(admin,'admin/accounts/events'),staff:{}};
for(const role of ['LOCAL_STAFF','SUPERVISOR','CITY_MANAGER']){
    const client=new AuthClient(base),credential=demo.credentials[role];
    await client.login(credential.email,credential.password);
    snapshot.staff[role]={user:client.user,cities:await get(client,'cities')};
    assert.equal((await client.call(`cities/${demo.otherCityId}/complaints`)).status,403);
    await client.call('auth/logout','POST');
}
const resident=new AuthClient(base);
await resident.login(demo.credentials['Resident One'].email,demo.credentials['Resident One'].password);
snapshot.resident={user:resident.user,complaint:await get(resident,`cities/${demo.cityId}/complaints/${demo.complaintId}`)};
await resident.call('auth/logout','POST');
const other=new AuthClient(base);
await other.login(demo.credentials['Resident Two'].email,demo.credentials['Resident Two'].password);
assert.equal((await other.call(`cities/${demo.cityId}/complaints/${demo.complaintId}`)).status,404);
await other.call('auth/logout','POST');
await admin.call('auth/logout','POST');
if(mode==='snapshot'){
    await writeFile('.local/account-restart.json',JSON.stringify(snapshot,null,2));
    console.log(`Saved private snapshot of ${accounts.total} accounts, account activity, staff scope and resident history.`);
}else{
    assert.deepEqual(snapshot,JSON.parse(await readFile('.local/account-restart.json','utf8')));
    console.log(`PASS: ${accounts.total} accounts, account activity, staff city scope and resident complaint history survived restart unchanged; cross-city and other-resident access remain denied.`);
}
