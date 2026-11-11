import {readFile,writeFile} from 'node:fs/promises';
import {AuthClient} from './auth-client.mjs';
const apply=process.argv.includes('--apply'),client=new AuthClient('http://127.0.0.1:9080/smartcity360/api');
const accounts=JSON.parse(await readFile('.local/simple-demo-accounts.json','utf8'));
await client.login(accounts.emails.find(e=>e.startsWith('admin@')),accounts.password);
if(client.user.role!=='SYSTEM_ADMIN')throw Error('Administrator required.');
const keyFile='.local/sample-meter-credentials.json';
const keys=JSON.parse(await readFile(keyFile,'utf8'));
async function call(path,method='GET',body,status=200){const r=await client.call(path,method,body);if(r.status!==status)throw Error(`${method} ${path}: ${r.status}`);return r.value;}
const flat=n=>[n,...(n.children||[]).flatMap(flat)];
const cities=await call('cities');
for(const city of cities){
 if(!['Colombo','Kandy','Galle','Jaffna','Kurunegala'].includes(city.name))continue;
 const prefix=`cities/${city.id}`;
 let tree=await call(`${prefix}/zones`);
 const before=flat(tree).filter(n=>n.type==='BUILDING').length;
 if(!apply){console.log(`${city.name}: ${before} buildings, ${(await call(`${prefix}/meters`)).length} meters; add eight named buildings and their meters.`);continue;}
 async function zone(name,type,parentId=null){
  let found=flat(tree).find(n=>n.name===name&&n.type===type);
  if(found)return found;
  tree=await call(`${prefix}/zones`,'POST',{name,type,parentId},201);
  found=flat(tree).find(n=>n.name===name&&n.type===type);if(!found)throw Error('Saved zone missing');return found;
 }
 for(const [districtName,streets] of [['Riverside district',[['River Road',['Community health centre','Riverside primary school']],['Station Road',['Passenger terminal','Public service office']]]],['Garden district',[['Park Avenue',['Sports centre','Community hall']],['Market Lane',['Market hall','Recycling centre']]]]]){
  const district=await zone(districtName,'DISTRICT');
  for(const [streetName,names] of streets){const street=await zone(streetName,'STREET',district.id);for(const name of names)await zone(name,'BUILDING',street.id);}
 }
 const buildings=flat(tree).filter(n=>n.type==='BUILDING'),meters=await call(`${prefix}/meters`);
 for(const [index,building] of buildings.entries()){
  let meter=meters.find(m=>m.buildingId===building.id);
  if(!meter){const issued=await call(`${prefix}/meters`,'POST',{buildingId:building.id,name:`${building.name} energy meter`},201);meter=issued.meter;keys[meter.id]={cityId:city.id,buildingId:building.id,credential:issued.credential};await writeFile(keyFile,JSON.stringify(keys,null,2));}
  const readingsPath=`${prefix}/meters/${meter.id}/readings`,readings=await call(readingsPath),saved=keys[meter.id];
  if(readings.length||!saved)continue;
  const amount=18+index*7.25;
  for(const factor of [0.85,0.93,1])await call(readingsPath,'POST',{usageKwh:Math.round(amount*factor*1000)/1000,credential:saved.credential,authentication:true,compression:true,encryption:true},201);
 }
 console.log(`${city.name}: ${buildings.length} buildings, ${(await call(`${prefix}/meters`)).length} meters. New meters have three readings.`);
}
await client.call('auth/logout','POST');
