(() => {
    const nativeFetch = window.fetch.bind(window);
    const roleNames = {RESIDENT:'Resident',LOCAL_STAFF:'Local staff',SUPERVISOR:'Supervisor',CITY_MANAGER:'City manager',SYSTEM_ADMIN:'System admin'};
    const page = location.pathname.split('/').pop() || 'index.html';
    const state = {user:null,csrfToken:null,roleNames};
    const staffPages = ['index.html','meters.html','streetlights.html','policies.html'];
    document.documentElement.dataset.authLoading = 'true';
    function deny(selector) { document.querySelectorAll(selector).forEach(node => { node.dataset.permissionDenied = 'true'; }); }
    function denyPanel(selector) { document.querySelectorAll(selector).forEach(node => { (node.closest('section,details') || node).dataset.permissionDenied = 'true'; }); }
    function permissions() {
        const role=state.user.role;
        document.querySelectorAll('[data-roles]').forEach(node => { if(!node.dataset.roles.split(' ').includes(role)) node.dataset.permissionDenied='true'; });
        if(role==='RESIDENT') {
            deny('nav a[href="./"],nav a[href="meters.html"],nav a[href="streetlights.html"],nav a[href="policies.html"],#work-panel,#escalation-panel');
            const heading=document.querySelector('#queue-heading');if(heading)heading.textContent='My complaints';
        }
        if(role!=='SYSTEM_ADMIN') denyPanel('#city-form,#spec-form,#demo-form');
        if(!['SUPERVISOR','CITY_MANAGER','SYSTEM_ADMIN'].includes(role)) {denyPanel('#zone-form,#meter-form,#light-form');deny('#replace-credential');}
        if(!['CITY_MANAGER','SYSTEM_ADMIN'].includes(role)) {
            if(page==='index.html') denyPanel('#power-on');
            if(page==='policies.html') deny('#policy-form,#new-policy,#noise-example,#parking-example');
        }
    }
    state.ready=(async()=>{
        try {
            const response=await nativeFetch('api/auth/session',{cache:'no-store',signal:AbortSignal.timeout(15000)});
            if(!response.ok)throw new Error('Could not check your session. Refresh to try again.');
            Object.assign(state,await response.json());
            if(!state.user && page!=='login.html') {location.replace('login.html');return null;}
            if(state.user) {
                if(state.user.passwordChangeRequired && page!=='account.html') {location.replace('account.html');return state.user;}
                if(page==='login.html') {location.replace('home.html');return state.user;}
                if(state.user.role==='RESIDENT' && staffPages.includes(page) || page==='accounts.html' && state.user.role!=='SYSTEM_ADMIN') {location.replace('home.html');return state.user;}
                SmartCityUI.mount(state);permissions();
            }
            return state.user;
        } catch(error) {
            const target=document.querySelector('#message');if(target)target.textContent=error.message;throw error;
        } finally {delete document.documentElement.dataset.authLoading;}
    })();
    state.fetch=async(input,options={})=>{
        await state.ready;
        const headers=new Headers(options.headers || {});
        if(!['GET','HEAD'].includes((options.method||'GET').toUpperCase()))headers.set('X-CSRF-Token',state.csrfToken);
        const response=await nativeFetch(input,{...options,headers,cache:'no-store'});
        if(response.status===401 && page!=='login.html')location.replace('login.html');
        return response;
    };
    state.json=async(path,method='GET',body)=>{
        const response=await state.fetch(`api/${path}`,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},
            body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
        const value=await response.json().catch(()=>null);
        if(response.status===401 && path==='auth/login')throw new Error('Email or password is incorrect. Check your details and try again.');
        if(!response.ok)throw new Error(value?.error || `Request failed (${response.status}).`);
        return value;
    };
    window.SmartCityAuth=state;
})();
