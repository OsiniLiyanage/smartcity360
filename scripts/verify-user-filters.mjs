import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AuthClient} from './auth-client.mjs';
const base=process.env.SMARTCITY_URL || 'http://localhost:9080/smartcity360/api';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw Error('Use retained local verification accounts only.');
const admin=JSON.parse((await readFile('.local/bootstrap-admin.json','utf8')).replace(/^\uFEFF/,''));
const demo=JSON.parse((await readFile('.local/account-verification.json','utf8')).replace(/^\uFEFF/,''));
let checks=0;
async function expect(client,path,status=200) {
    const result=await client.call(path);assert.equal(result.status,status,`Unexpected response from ${path}`);checks++;return result.value;
}
const client=new AuthClient(base);
await expect(client,'admin/accounts?q=test',401);
await client.login(admin.email,admin.password);
try {
    const first=await expect(client,'admin/accounts');let baseline=[...first.items];
    for(let page=1;page*25<first.total;page++)baseline.push(...(await expect(client,`admin/accounts?page=${page}`)).items);
    assert.equal(baseline.length,first.total);assert.equal(new Set(baseline.map(u=>u.id)).size,first.total);checks+=2;
    async function verify(filter,predicate) {
        const expected=baseline.filter(predicate),parameters=new URLSearchParams(filter),ids=[];
        for(let page=0;page===0||page*25<expected.length;page++) {
            parameters.set('page',page);const result=await expect(client,`admin/accounts?${parameters}`);
            assert.equal(result.total,expected.length);assert.equal(result.pageSize,25);
            assert.deepEqual(result.items.map(u=>u.id),expected.slice(page*25,page*25+25).map(u=>u.id));checks+=3;ids.push(...result.items.map(u=>u.id));
        }
        assert.equal(ids.length,expected.length);checks++;
    }
    for(const role of ['SYSTEM_ADMIN','RESIDENT','LOCAL_STAFF','SUPERVISOR','CITY_MANAGER'])await verify({role},u=>u.role===role);
    for(const status of ['active','disabled'])await verify({status},u=>u.enabled===(status==='active'));
    for(const q of [baseline.at(-1).email.toUpperCase(),' '+baseline[0].displayName+' ','%','_',"' OR 1=1 --",'no-such-user-918272']) {
        const search=q.trim().toLowerCase();await verify({q},u=>u.displayName.toLowerCase().includes(search)||u.email.toLowerCase().includes(search));
    }
    const staff=baseline.find(u=>u.cityId);
    if(staff) {
        await verify({city:String(staff.cityId)},u=>u.cityId===staff.cityId);
        await verify({city:String(staff.cityId),role:staff.role,status:'active'},u=>u.cityId===staff.cityId&&u.role===staff.role&&u.enabled);
    }
    await verify({q:'example',role:'RESIDENT',status:'active'},u=>u.role==='RESIDENT'&&u.enabled&&(u.displayName.toLowerCase().includes('example')||u.email.toLowerCase().includes('example')));
    for(const query of ['page=-1','page=100001','role=OWNER','status=maybe','city=0','city=-1','city=abc','q='+('x'.repeat(255))])await expect(client,`admin/accounts?${query}`,400);
    const outside=await expect(client,'admin/accounts?page=100000');assert.equal(outside.items.length,0);assert.equal(outside.total,baseline.length);checks+=2;
    const after=await expect(client,'admin/accounts');assert.equal(after.total,baseline.length);checks++;
} finally {await client.call('auth/logout','POST');}
for(const name of ['Resident One','LOCAL_STAFF','SUPERVISOR','CITY_MANAGER']) {
    const credential=demo.credentials[name],other=new AuthClient(base);await other.login(credential.email,credential.password);
    try {await expect(other,'admin/accounts?q=test&role=SYSTEM_ADMIN',403);}finally{await other.call('auth/logout','POST');}
}
console.log(`PASS: ${checks} read-only user-list checks, including search, intersecting filters, pagination, literal wildcard handling, validation and role restrictions. No user data changed.`);
