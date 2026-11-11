import {readFile} from 'node:fs/promises';
import {AuthClient} from './auth-client.mjs';
const base='http://127.0.0.1:9080/smartcity360/api',apply=process.argv.includes('--apply');
const accounts=JSON.parse(await readFile('.local/simple-demo-accounts.json','utf8'));
const client=new AuthClient(base);
await client.login(accounts.emails.find(e=>e.startsWith('admin@')),accounts.password);
if(client.user.role!=='SYSTEM_ADMIN'||client.user.passwordChangeRequired)throw Error('An initialized administrator is required.');
async function call(path,method='GET',body,status=200){const r=await client.call(path,method,body);if(r.status!==status)throw Error(`${method} ${path}: ${r.status}`);return r.value;}
async function pages(path){let rows=[];for(let p=0;;p++){const r=await call(`${path}?page=${p}&pageSize=100`);rows.push(...r.items);if(rows.length>=r.total)return rows;}}
const flatten=n=>[n,...(n.children||[]).flatMap(flatten)];
const cities=await call('cities');
let credentials={};try{credentials=JSON.parse(await readFile('.local/sample-meter-credentials.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const name of ['Colombo','Kandy','Galle','Jaffna','Kurunegala']){
 const matches=cities.filter(c=>c.name.replace(/\s*\(demo\)\s*$/i,'')===name);if(matches.length!==1)throw Error(`City not unique: ${name}`);
 const city=matches[0],prefix=`cities/${city.id}`,zones=flatten(await call(`${prefix}/zones`));
 const streets=zones.filter(z=>z.type==='STREET'),buildings=zones.filter(z=>z.type==='BUILDING');
 if(!streets.length||!buildings.length)throw Error(`Missing existing zones: ${name}`);
 const lights=await pages(`${prefix}/streetlights`),policies=await pages(`${prefix}/policies`);
 if(!apply){console.log(`${name}: ${zones.length} areas, ${lights.length} lights, ${policies.length} policies; inspect and fill missing operational examples.`);continue;}
 const spec=await call('lamp-specifications','POST',{model:'Civic LED 40',ratedWatts:40,colour:'WARM_WHITE'});
 for(const [index,location] of ['Library entrance','Pedestrian crossing','Clinic approach','Market junction','School entrance','River bridge','Station forecourt','Sports centre gate','Park footpath','Market loading bay','Community hall entrance','Recycling centre approach'].entries()){
  const label=`${name.slice(0,3).toUpperCase()}-SL-${String(index+1).padStart(3,'0')}`;
  if(lights.some(l=>l.label===label))continue;
  let light=await call(`${prefix}/streetlights`,'POST',{label,location,streetId:streets[index%streets.length].id,specificationId:spec.id},201);
  if(index>1)light=await call(`${prefix}/streetlights/${light.id}`,'PUT',{label,location,specificationId:spec.id,powerOn:index%4!==3,faulty:index%4===2,faultNote:index%4===2?'Lamp flickers intermittently; electrical inspection required.':'',version:light.version});
  console.log(`${name}: ${label} saved (${light.state}).`);
 }
 const rules=[{name:'Residential quiet hours',category:'NOISE',expression:'noise > 65 AND (hour >= 22 OR hour < 6)',trueMeaning:'VIOLATION',values:[{noise:72,hour:23},{noise:48,hour:23}]},{name:'Library short-stay parking',category:'PARKING',expression:'hour >= 8 AND hour < 18 AND parkingMinutes <= 120',trueMeaning:'PERMITTED',values:[{hour:10,parkingMinutes:45},{hour:10,parkingMinutes:150}]}];
 rules.push(
  {name:'School arrival noise limit',category:'NOISE',expression:'noise > 60 AND hour >= 7 AND hour < 9',trueMeaning:'VIOLATION',values:[{noise:68,hour:8},{noise:52,hour:8}]},
  {name:'Clinic short-stay parking',category:'PARKING',expression:'parkingMinutes <= 60',trueMeaning:'PERMITTED',values:[{parkingMinutes:30},{parkingMinutes:90}]},
  {name:'Market evening noise limit',category:'NOISE',expression:'noise > 70 AND hour >= 18',trueMeaning:'VIOLATION',values:[{noise:75,hour:20},{noise:55,hour:20}]},
  {name:'Station pickup parking',category:'PARKING',expression:'parkingMinutes <= 20',trueMeaning:'PERMITTED',values:[{parkingMinutes:10},{parkingMinutes:35}]}
 );
 for(const rule of rules){
  if(policies.some(p=>p.name===rule.name))continue;
  const {values,...body}=rule,policy=await call(`${prefix}/policies`,'POST',{...body,active:true},201);
  for(const observations of values)await call(`${prefix}/policies/${policy.id}/evaluations`,'POST',{zoneId:buildings[0].id,version:policy.version,observations,note:'Recorded during the municipal service inspection.'},201);
  console.log(`${name}: ${rule.name} and two observation results saved.`);
 }
 for(const meter of await call(`${prefix}/meters`)){
  const path=`${prefix}/meters/${meter.id}/readings`,readings=await call(path),saved=credentials[meter.id];
  if(readings.length>=3||!saved||saved.cityId!==city.id)continue;
  const building=buildings.find(b=>b.id===meter.buildingId);if(!building)continue;
  for(let i=readings.length;i<3;i++)await call(path,'POST',{usageKwh:building.usageKwh,credential:saved.credential,authentication:true,compression:true,encryption:true},201);
  console.log(`${name}: three saved library meter readings available; building usage preserved.`);
 }
 const finalLights=await pages(`${prefix}/streetlights`),finalPolicies=await pages(`${prefix}/policies`);
 console.log(`${name}: verified ${finalLights.length} lights, ${finalPolicies.length} policies, ${buildings.length} buildings.`);
}
console.log(apply?'Saved. Existing matching records were preserved.':'Preview only; add --apply to save.');
