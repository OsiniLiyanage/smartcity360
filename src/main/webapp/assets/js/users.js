(() => {
    'use strict';
    const $ = selector => document.querySelector(selector), auth = window.SmartCityAuth;
    let busy = false, ready = false, page = 0, total = 0, cities = [], selected = null;
    let filters = {q:'',role:'',status:'',city:''};
    const emptyFilters = () => ({q:'',role:'',status:'',city:''});
    function node(tag,text,css='') { const el=document.createElement(tag); el.textContent=text; el.className=css; return el; }
    function cityName(id) { return id ? cities.find(city=>city.id===id)?.name || `City #${id} (archived)` : 'Not assigned'; }
    function cityChoice(prefix) {
        const select=$(`#${prefix}-city`), staff=['LOCAL_STAFF','SUPERVISOR','CITY_MANAGER'].includes($(`#${prefix}-role`).value);
        select.disabled=!staff; select.required=staff; if(!staff)select.value='';
    }
    function paging() {
        $('#previous').disabled=busy||page===0; $('#next').disabled=busy||(page+1)*25>=total;
        $('#add-user').disabled=busy||!ready;
    }
    async function act(work) {
        if(busy)return;
        const feedback=SmartCityFeedback.begin(), controls=Array.from(document.querySelectorAll('main button, main input, main select'));
        const focused=document.activeElement, disabled=controls.map(el=>el.disabled); busy=true; controls.forEach(el=>el.disabled=true);
        let outcome='success'; $('#message').textContent='Working...';
        try { await auth.ready; await work(); }
        catch(error) { outcome='error'; $('#message').textContent=error.name==='TimeoutError'?'The request timed out. Refresh to check the result before retrying.':error.message; }
        finally { busy=false; controls.forEach((el,i)=>el.disabled=disabled[i]); cityChoice('create'); cityChoice('edit'); paging(); if(document.activeElement===document.body&&focused?.isConnected&&!focused.disabled)focused.focus(); feedback.finish(outcome); }
    }
    function openDialog(dialog, opener=document.activeElement) {
        const stack=document.querySelector('.feedback-stack'); if(stack)dialog.append(stack);
        dialog.addEventListener('close',()=>{
            if(stack)document.body.append(stack);
            if(dialog.id==='create-dialog') { $('#temporary-password').textContent=''; $('#issued-email').textContent=''; $('#issued').hidden=true; }
            if(dialog.id==='edit-dialog')selected=null;
            requestAnimationFrame(()=>{if(opener?.isConnected)opener.focus();else $('#add-user').focus();});
        },{once:true});
        dialog.showModal();
        requestAnimationFrame(()=>{
            if(dialog.open) (dialog.querySelector('[autofocus]:not(:disabled)') || dialog.querySelector('[data-close]:not(:disabled)'))?.focus();
        });
    }
    for(const dialog of document.querySelectorAll('.record-dialog')) {
        // Escape belongs to the modal, not the sidebar underneath it.
        dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
        dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
        dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!busy)dialog.close();}));
    }
    function render(rows) {
        $('#users').replaceChildren();
        for(const user of rows) {
            const tr=document.createElement('tr'), identity=node('td','');
            identity.append(node('span',user.displayName,'record-name'),node('span',`#${user.id}${user.id===auth.user.id?' | You':''}`,'record-subtitle'));
            const status=node('td',''); status.append(node('span',user.enabled?'Active':'Disabled',`record-badge${user.enabled?' active':''}`));
            const action=node('td','');
            if(user.id===auth.user.id)action.append(node('span','Your account','record-subtitle'));
            else {
                const edit=node('button','Edit','record-edit'); edit.type='button'; edit.setAttribute('aria-label',`Edit access for ${user.displayName}`);
                edit.addEventListener('click',()=>{
                    selected=user; $('#edit-name').textContent=`${user.displayName} | ${user.email}`;
                    $('#edit-role').value=user.role;
                    $('#edit-city').replaceChildren(new Option('Choose a city',''),...cities.map(city=>new Option(city.name,String(city.id))));
                    if(user.cityId&&!cities.some(city=>city.id===user.cityId))$('#edit-city').add(new Option(cityName(user.cityId),String(user.cityId)));
                    cityChoice('edit'); $('#edit-city').value=user.cityId?String(user.cityId):''; $('#edit-enabled').checked=user.enabled;
                    openDialog($('#edit-dialog'));
                }); action.append(edit);
            }
            tr.append(identity,node('td',user.email),node('td',auth.roleNames[user.role]),node('td',cityName(user.cityId)),status,action); $('#users').append(tr);
        }
        if(!rows.length) {const tr=node('tr',''), td=node('td','No users match these filters. Try a different search or clear the filters.');td.colSpan=6;tr.append(td);$('#users').append(tr);}
        const start=total?page*25+1:0,end=Math.min((page+1)*25,total);
        $('#page-info').textContent=`${start}-${end} of ${total} users | Page ${page+1} of ${Math.max(1,Math.ceil(total/25))}`;
        const labels=[filters.q?`Search: ${filters.q}`:'',auth.roleNames[filters.role]||'',filters.status?filters.status==='active'?'Active':'Disabled':'',filters.city?cityName(Number(filters.city)):''].filter(Boolean);
        $('#filter-summary').textContent=labels.length?labels.join(' | '):'All users';
        $('#filter-toggle').textContent=`Filters${[filters.role,filters.status,filters.city].filter(Boolean).length?' ('+[filters.role,filters.status,filters.city].filter(Boolean).length+')':''}`;
    }
    async function loadAccounts(nextPage=page,nextFilters=filters) {
        const params=new URLSearchParams({page:String(nextPage)});
        for(const [key,value] of Object.entries(nextFilters))if(value)params.set(key,value);
        let result=await auth.json(`admin/accounts?${params}`);
        const last=Math.max(0,Math.ceil(result.total/25)-1);
        if(nextPage>last) {nextPage=last;params.set('page',String(last));result=await auth.json(`admin/accounts?${params}`);}
        page=nextPage;total=result.total;filters={...nextFilters}; render(result.items);
    }
    function syncFilters() {
        $('#user-search').value=filters.q;
        for(const key of ['role','status','city'])$(`#filter-${key}`).value=filters[key];
    }
    $('#filter-toggle').addEventListener('click',()=>{
        const open=$('#user-filters').hidden; $('#user-filters').hidden=!open; $('#filter-toggle').setAttribute('aria-expanded',String(open));
    });
    $('#search-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{await loadAccounts(0,{...filters,q:$('#user-search').value.trim()});$('#message').textContent='Search results updated.';});});
    $('#user-filters').addEventListener('submit',event=>{event.preventDefault();act(async()=>{
        await loadAccounts(0,{q:$('#user-search').value.trim(),role:$('#filter-role').value,status:$('#filter-status').value,city:$('#filter-city').value});
        $('#message').textContent='Filters applied.';
    });});
    $('#reset-filters').addEventListener('click',()=>act(async()=>{await loadAccounts(0,emptyFilters());syncFilters();$('#message').textContent='Filters cleared.';}));
    $('#refresh-users').addEventListener('click',()=>act(async()=>{await loadAccounts();$('#message').textContent='Accounts refreshed.';}));
    for(const [id,delta] of [['previous',-1],['next',1]])$(`#${id}`).addEventListener('click',()=>act(async()=>{await loadAccounts(page+delta);$('#message').textContent='Account page loaded.';}));
    $('#add-user').addEventListener('click',()=>{
        $('#create-form').reset();$('#create-form').hidden=false;$('#issued').hidden=true;$('#temporary-password').textContent='';cityChoice('create');openDialog($('#create-dialog'));
    });
    for(const prefix of ['create','edit'])$(`#${prefix}-role`).addEventListener('change',()=>cityChoice(prefix));
    $('#create-form').addEventListener('submit',event=>{event.preventDefault();
        // Read the role's meaning before act temporarily disables form controls.
        const role=$('#create-role').value, staff=['LOCAL_STAFF','SUPERVISOR','CITY_MANAGER'].includes(role);
        const payload={email:$('#create-email').value,displayName:$('#create-name').value,role,cityId:staff?Number($('#create-city').value):null};
        act(async()=>{
            const result=await auth.json('admin/accounts','POST',payload);
            $('#issued-email').textContent=result.user.email;$('#temporary-password').textContent=result.temporaryPassword;
            $('#create-form').hidden=true;$('#issued').hidden=false;$('#hide-password').disabled=false;$('#hide-password').focus();
            let message='Account created. Share the temporary password privately before closing.';
            try {await loadAccounts(0,{...emptyFilters(),q:result.user.email});syncFilters();}catch {message+=' The table could not refresh. Refresh it after closing.';}
            $('#message').textContent=message;
        });
    });
    $('#edit-form').addEventListener('submit',event=>{event.preventDefault();
        if(!selected)return;
        const user=selected,role=$('#edit-role').value,staff=['LOCAL_STAFF','SUPERVISOR','CITY_MANAGER'].includes(role);
        const payload={role,cityId:staff?Number($('#edit-city').value):null,enabled:$('#edit-enabled').checked,version:user.version};
        act(async()=>{
            await auth.json(`admin/accounts/${user.id}`,'PUT',payload);
            let message='Account access updated. Previous sessions for this user are invalid.';
            try {await loadAccounts();}catch {message+=' The table could not refresh. Refresh to see the saved change.';}
            $('#edit-dialog').close();$('#message').textContent=message;
        });
    });
    $('#load-events').addEventListener('click',()=>act(async()=>{
        const events=await auth.json('admin/accounts/events');$('#events').replaceChildren();
        for(const event of events) {const tr=node('tr','');tr.append(node('td',event.occurredAt),node('td',event.action.replaceAll('_',' ').toLowerCase()),node('td',`#${event.targetId}`),node('td',event.actorId===null?'Local setup':`#${event.actorId}`));$('#events').append(tr);}
        if(!events.length){const tr=node('tr',''),td=node('td','No account activity yet.');td.colSpan=4;tr.append(td);$('#events').append(tr);}
        openDialog($('#activity-dialog'),$('#load-events'));$('#message').textContent='Latest account activity loaded.';
    }));
    act(async()=>{
        if(auth.user?.role!=='SYSTEM_ADMIN')return;
        cities=await auth.json('cities');
        for(const id of ['create-city','edit-city'])$(`#${id}`).replaceChildren(new Option('Choose a city',''),...cities.map(city=>new Option(city.name,String(city.id))));
        $('#filter-city').replaceChildren(new Option('All cities',''),...cities.map(city=>new Option(city.name,String(city.id))));
        await loadAccounts();ready=true;$('#message').textContent='';
    });
})();
