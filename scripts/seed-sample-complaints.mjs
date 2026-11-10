// Local sample cases, created through normal permissions. Existing cases are never changed.
import {readFile} from 'node:fs/promises';
import {AuthClient} from './auth-client.mjs';
const base=process.env.SMARTCITY_URL||'http://127.0.0.1:9080/smartcity360/api';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw Error('Local sample setup only.');
const apply=process.argv.includes('--apply');
const accounts=JSON.parse(await readFile('.local/simple-demo-accounts.json','utf8'));
async function login(prefix,role){
    const email=accounts.emails.find(value=>value.startsWith(prefix));
    if(!email)throw Error(`Missing local ${role} account.`);
    const client=new AuthClient(base);await client.login(email,accounts.password);
    if(client.user.role!==role||client.user.passwordChangeRequired)throw Error('Account role or password setup does not match.');
    return client;
}
const admin=await login('admin@','SYSTEM_ADMIN'),resident=await login('resident@','RESIDENT');
async function call(client,path,method='GET',body,expected=200){
    const result=await client.call(path,method,body);
    if(result.status!==expected)throw Error(`${method} ${path}: ${result.status}. Inspect saved data before retrying.`);
    return result.value;
}
const examples=[
    ['Uneven paving outside the library','A raised paving slab near the library entrance makes the walkway difficult to use.','LOW','ASSIGNED'],
    ['Blocked drain near the shopping street','Rainwater collects around the drain beside the shops and covers the pedestrian crossing.','MEDIUM','IN_PROGRESS'],
    ['Water supply interruption at the clinic','The clinic has reported repeated interruptions to its water supply during opening hours.','HIGH','ASSIGNED'],
    ['Overflowing bins at the public library','The public bins beside the library entrance need collection and cleaning.','LOW','RESOLVED']
];
const cities=await call(admin,'cities');
let created=0,kept=0;
for(const name of ['Colombo','Kandy','Galle','Jaffna','Kurunegala']){
    const matches=cities.filter(c=>c.name.replace(/\s*\(demo\)\s*$/i,'')===name);
    if(matches.length!==1)throw Error(`Expected one city: ${name}`);
    const prefix=`cities/${matches[0].id}/complaints`,existing=await call(resident,prefix);
    for(const [subject,description,severity,status] of examples){
        if(existing.some(c=>c.subject===subject)){kept++;continue;}
        if(!apply){console.log(`${name}: add ${severity} / ${status}: ${subject}`);continue;}
        let row=await call(resident,prefix,'POST',{subject,description,severity,zoneId:null},201);
        const path=`${prefix}/${row.id}`;
        // Do not retry writes automatically. A partial case is retained for review.
        if(status!=='ASSIGNED')row=await call(admin,`${path}/status`,'PUT',{status:'IN_PROGRESS',note:'Inspection scheduled with the municipal service team.',version:row.version});
        if(status==='RESOLVED')row=await call(admin,`${path}/status`,'PUT',{status:'RESOLVED',note:'Collection completed and the surrounding pavement cleaned.',version:row.version});
        const message=status==='RESOLVED'?'The bins have been emptied and the area cleaned. Please let us know if the problem returns.':status==='IN_PROGRESS'?'The drainage team is inspecting the blockage. We will post an update after clearing the drain.':'Your report has reached the responsible city team and is awaiting inspection.';
        await call(admin,`${path}/messages`,'POST',{message,version:row.version});
        const saved=await call(resident,path);
        if(saved.status!==status||!saved.history.some(event=>event.message===message))throw Error('Saved case verification failed.');
        created++;console.log(`${name}: saved ${subject} (${status}).`);
    }
}
console.log(`${apply?'Applied':'Preview'}: ${created} created, ${kept} existing examples preserved.`);
