const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('src/main/webapp/assets/js/auth.js','utf8');
async function fixture(verification) {
    const redirects=[], requests=[];
    const user={role:'SYSTEM_ADMIN'};
    const original=new Response(JSON.stringify({error:'Meter credential rejected.'}),{status:401});
    const context={Headers,AbortSignal,SmartCityUI:{mount(){}},
        location:{pathname:'/smartcity360/meters.html',replace(path){redirects.push(path);}},
        document:{documentElement:{dataset:{}},querySelectorAll(){return [];},querySelector(){return null;}}};
    context.window=context;
    context.fetch=async path=>{
        requests.push(path);
        if(requests.length===1)return new Response(JSON.stringify({user,csrfToken:'test-token'}));
        if(path==='api/auth/session')return verification();
        return original;
    };
    vm.runInNewContext(source,context);
    await context.SmartCityAuth.ready;
    return {auth:context.SmartCityAuth,redirects,original,requests};
}
test('wrong meter credential returns its error without redirecting a signed-in user',async()=>{
    const f=await fixture(()=>new Response(JSON.stringify({user:{role:'SYSTEM_ADMIN'}})));
    assert.equal(await f.auth.fetch('api/cities/35/meters/1/readings/1/recover',{method:'POST'}),f.original);
    assert.deepEqual(f.redirects,[]);
    assert.equal((await f.original.json()).error,'Meter credential rejected.');
});
test('expired session still redirects to sign-in',async()=>{
    const f=await fixture(()=>new Response(JSON.stringify({user:null})));
    await f.auth.fetch('api/cities');
    assert.deepEqual(f.redirects,['login.html']);
});
test('session check network failure preserves the original rejection',async()=>{
    const f=await fixture(()=>{throw Error('offline');});
    assert.equal(await f.auth.fetch('api/cities'),f.original);
    assert.deepEqual(f.redirects,[]);
});
test('session check server failure does not mistake an outage for logout',async()=>{
    const f=await fixture(()=>new Response('unavailable',{status:503}));
    assert.equal(await f.auth.fetch('api/cities'),f.original);
    assert.deepEqual(f.redirects,[]);
});
