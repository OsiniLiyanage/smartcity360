import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {AuthClient} from './auth-client.mjs';
const {build,areas}=createRequire(import.meta.url)('../src/main/webapp/assets/js/report-model.js');
const base=process.env.SMARTCITY_URL || 'http://localhost:9080/smartcity360/api';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw Error('This verifier uses retained local demo accounts only.');
const demo=JSON.parse(await readFile('.local/account-verification.json','utf8'));
const admin=JSON.parse((await readFile('.local/bootstrap-admin.json','utf8')).replace(/^\uFEFF/,''));
let checks=0;
const ids={};
async function expect(client,path,status=200){const result=await client.call(path);assert.equal(result.status,status,`${path}: expected ${status}, got ${result.status}`);checks++;return result.value;}
await expect(new AuthClient(base),`cities/${demo.cityId}/complaints`,401);
for(const [name,credential] of Object.entries({...demo.credentials,SYSTEM_ADMIN:admin})){
    if(!['Resident One','Resident Two','LOCAL_STAFF','SUPERVISOR','CITY_MANAGER','SYSTEM_ADMIN'].includes(name))continue;
    const client=new AuthClient(base);
    await client.login(credential.email,credential.password);
    try{
        const records=await expect(client,`cities/${demo.cityId}/complaints`);
        const tree=await expect(client,`cities/${demo.cityId}/areas`);
        const locations=areas(tree),all=build(records,{},locations);
        assert.equal(all.total,records.length);checks++;
        assert.equal(all.months.reduce((n,[,count])=>n+count,0),all.total);checks++;
        for(const status of ['UNASSIGNED','ASSIGNED','IN_PROGRESS','RESOLVED']){
            const report=build(records,{status},locations);
            assert.equal(report.total,records.filter(r=>r.status===status).length);checks++;
        }
        const text=JSON.stringify(all);
        for(const field of ['residentName','assignedUserId','history','description','password','credential'])assert.ok(!text.includes(`"${field}":`));
        checks++;
        ids[name]=new Set(records.map(r=>r.id));
        if(name==='LOCAL_STAFF'){assert.ok(records.every(r=>r.assignedTo==='LOCAL_STAFF'));checks++;}
        if(name==='SUPERVISOR'){assert.ok(records.every(r=>['LOCAL_STAFF','SUPERVISOR'].includes(r.assignedTo)));checks++;}
        if(['LOCAL_STAFF','SUPERVISOR','CITY_MANAGER'].includes(name))await expect(client,`cities/${demo.otherCityId}/complaints`,403);
    }finally{await client.call('auth/logout','POST');}
}
assert.ok([...ids['Resident One']].every(id=>!ids['Resident Two'].has(id)));checks++;
const other=new AuthClient(base),credential=demo.credentials['Resident Two'];
await other.login(credential.email,credential.password);
try { const id=[...ids['Resident One']][0];assert.ok(id,'Retained demo must have a Resident One complaint.');await expect(other,`cities/${demo.cityId}/complaints/${id}`,404); }
finally {await other.call('auth/logout','POST');}
console.log(`PASS: ${checks} read-only live report checks across all five roles, using existing authorization boundaries. No account or complaint data changed.`);
