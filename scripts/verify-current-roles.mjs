import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AuthClient} from './auth-client.mjs';
import {createRequire} from 'node:module';
const {build,areas}=createRequire(import.meta.url)('../src/main/webapp/assets/js/report-model.js');
const base='http://127.0.0.1:9080/smartcity360/api';
const accounts=JSON.parse(await readFile('.local/simple-demo-accounts.json','utf8'));
let checks=0;
const roles=new Set();
async function expect(client,path,status=200){const r=await client.call(path);assert.equal(r.status,status,`${path}: ${r.status}`);checks++;return r.value;}
const admin=new AuthClient(base);
await admin.login(accounts.emails.find(e=>e.startsWith('admin@')),accounts.password);
const cities=await expect(admin,'cities');assert.equal(cities.length,5);checks++;
await expect(new AuthClient(base),`cities/${cities[0].id}/complaints`,401);
for(const email of accounts.emails){
 const client=new AuthClient(base);await client.login(email,accounts.password);
 try{
  const role=client.user.role;roles.add(role);
  const available=await expect(client,'cities');
  const scoped=!['RESIDENT','SYSTEM_ADMIN'].includes(role);
  assert.equal(available.length,scoped?1:5);checks++;
  if(scoped){assert.equal(available[0].id,client.user.cityId);checks++;}
  const city=available[0],prefix=`cities/${city.id}`;
  const records=await expect(client,`${prefix}/complaints`);
  assert.ok(records.length>0);checks++;
  const locations=areas(await expect(client,`${prefix}/areas`));
  const report=build(records,{},locations);
  assert.equal(report.total,records.length);checks++;
  assert.equal(report.months.reduce((n,[,count])=>n+count,0),records.length);checks++;
  for(const status of ['ASSIGNED','IN_PROGRESS','RESOLVED']){
   assert.equal(build(records,{status},locations).total,records.filter(r=>r.status===status).length);checks++;
  }
  for(const module of ['meters','streetlights','policies'])await expect(client,`${prefix}/${module}`,role==='RESIDENT'?403:200);
  if(scoped){
   const outside=cities.find(c=>c.id!==city.id);
   for(const module of ['complaints','meters','streetlights','policies'])await expect(client,`cities/${outside.id}/${module}`,403);
  }
  if(role==='LOCAL_STAFF'){assert.ok(records.every(r=>r.assignedTo==='LOCAL_STAFF'));checks++;}
  if(role==='SUPERVISOR'){assert.ok(records.every(r=>['LOCAL_STAFF','SUPERVISOR'].includes(r.assignedTo)));checks++;}
  if(role==='RESIDENT'){
   const detail=await expect(client,`${prefix}/complaints/${records[0].id}`);
   assert.equal(Object.hasOwn(detail,'assignedUserId'),false);assert.equal(Object.hasOwn(detail,'assignee'),false);checks+=2;
   const all=await expect(admin,`${prefix}/complaints`),owned=new Set(records.map(r=>r.id));
   const other=all.find(r=>!owned.has(r.id));
   if(other)await expect(client,`${prefix}/complaints/${other.id}`,404);
   else console.log('SKIP: second-resident ownership isolation needs a separate retained owner in this city.');
  }
  const session=await expect(client,'auth/session');assert.equal(session.user.role,role);checks++;
  console.log(`${role}: city scope, module access and complaint/report checks passed.`);
 }finally{await client.call('auth/logout','POST');}
 await expect(client,'cities',401);
}
await admin.call('auth/logout','POST');
assert.equal(roles.size,5);checks++;
console.log(`PASS: ${checks} checks across five roles. No business records modified.`);
