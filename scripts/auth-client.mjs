import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const nativeFetch=globalThis.fetch.bind(globalThis);
export class AuthClient {
    constructor(base){this.base=base.replace(/\/$/,'');this.cookie='';this.csrf='';this.user=null;}
    async fetch(url,options={}){
        const headers=new Headers(options.headers||{});
        if(this.cookie)headers.set('Cookie',this.cookie);
        if(!['GET','HEAD'].includes((options.method||'GET').toUpperCase()) && !headers.has('X-CSRF-Token'))headers.set('X-CSRF-Token',this.csrf);
        const response=await nativeFetch(url,{...options,headers,signal:options.signal||AbortSignal.timeout(20000)});
        const cookie=response.headers.getSetCookie?.().find(value=>value.startsWith('JSESSIONID='));
        if(cookie)this.cookie=cookie.split(';')[0];
        return response;
    }
    async call(path,method='GET',body){
        const response=await this.fetch(`${this.base}/${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
        const value=await response.json().catch(()=>null);
        if(value?.csrfToken)this.csrf=value.csrfToken;
        if(path.startsWith('auth/') && value && Object.hasOwn(value,'user'))this.user=value.user;
        return {status:response.status,value,headers:response.headers};
    }
    async session(){const result=await this.call('auth/session');if(result.status!==200)throw Error(`Session check failed (${result.status}).`);return result;}
    async login(email,password){await this.session();const result=await this.call('auth/login','POST',{email,password});if(result.status!==200)throw Error(`Sign-in failed (${result.status}).`);return result;}
}
export async function administrator(base){
    const client=new AuthClient(base);
    let credentials,local=false;
    if(process.env.SMARTCITY_EMAIL && process.env.SMARTCITY_PASSWORD)credentials={email:process.env.SMARTCITY_EMAIL,password:process.env.SMARTCITY_PASSWORD};
    else {
        if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw Error('Provide explicit credentials for a non-local test target.');
        credentials=JSON.parse((await readFile('.local/bootstrap-admin.json','utf8')).replace(/^\uFEFF/,''));local=true;
    }
    await client.login(credentials.email,credentials.password);
    if(client.user.passwordChangeRequired){
        if(!local)throw Error('Change the temporary password through My account before running these checks.');
        const newPassword=randomBytes(32).toString('base64url');
        const result=await client.call('auth/password','PUT',{currentPassword:credentials.password,newPassword});
        if(result.status!==200)throw Error(`Initial password change failed (${result.status}).`);
        credentials.password=newPassword;await writeFile('.local/bootstrap-admin.json',JSON.stringify(credentials,null,2));
        await client.login(credentials.email,newPassword);
    }
    if(client.user.role!=='SYSTEM_ADMIN')throw Error('These feature checks require a system-admin test account.');
    return client;
}
export async function authenticatedFetch(base){const client=await administrator(base);return client.fetch.bind(client);}
