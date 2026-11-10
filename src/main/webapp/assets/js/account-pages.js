(() => {
    const $=selector=>document.querySelector(selector), auth=window.SmartCityAuth;
    const page=location.pathname.split('/').pop();
    let busy=false, cities=[];
    function node(tag,text,css=''){const value=document.createElement(tag);value.textContent=text;value.className=css;return value;}
    async function act(work){if(busy)return;const feedback=SmartCityFeedback.begin();if(page==='login.html')$('#message').dataset.feedbackState='loading';let outcome='success';busy=true;document.querySelectorAll('main button').forEach(b=>b.disabled=true);$('#message').textContent='Working...';delete $('#message').dataset.error;
        try {await auth.ready;await work();}catch(error){outcome='error';$('#message').dataset.error='true';$('#message').textContent=error.name==='TimeoutError'?'The request timed out. Refresh to check the result before retrying.':error.message;}
        finally{busy=false;document.querySelectorAll('main button').forEach(b=>b.disabled=false);feedback.finish(outcome);}}
    if(page==='login.html') {
        for(const type of ['login','register']) $(`#show-${type}`).addEventListener('click',()=>{
            $('#login-panel').hidden=type!=='login';$('#register-panel').hidden=type!=='register';$('#message').textContent='';
            $('#show-login').setAttribute('aria-pressed',String(type==='login'));$('#show-register').setAttribute('aria-pressed',String(type==='register'));
            $('#auth-title').textContent=type==='login'?'Sign in':'Create your account';
            $('#auth-description').textContent=type==='login'?'Access your city workspace.':'Join your neighbourhood as a resident.';
        });
        $('#login-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{
            const result=await auth.json('auth/login','POST',{email:$('#login-email').value,password:$('#login-password').value});
            $('#login-password').value='';SmartCityFeedback.flash('signed-in');location.replace(result.user.passwordChangeRequired?'account.html':'home.html');
        });});
        $('#register-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{
            if($('#register-password').value!==$('#register-confirm').value)throw new Error('The passwords do not match.');
            await auth.json('auth/register','POST',{email:$('#register-email').value,displayName:$('#register-name').value,password:$('#register-password').value});
            $('#register-password').value='';$('#register-confirm').value='';SmartCityFeedback.flash('registered');location.replace('home.html');
        });});
    }
    if(page==='account.html') {
        act(async()=>{if(!auth.user)return;$('#display-name').value=auth.user.displayName;
            $('#message').textContent=auth.user.passwordChangeRequired?'Change your temporary password before opening your workspace.':'Manage your profile and sign-in password.';});
        $('#profile-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{const updated=await auth.json('auth/profile','PUT',{displayName:$('#display-name').value});Object.assign(auth.user,updated);window.dispatchEvent(new Event('smartcity:profile-updated'));$('#message').textContent='Your name has been saved.';});});
        $('#password-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{
            if($('#new-password').value!==$('#confirm-password').value)throw new Error('The new passwords do not match.');
            await auth.json('auth/password','PUT',{currentPassword:$('#current-password').value,newPassword:$('#new-password').value});
            $('#password-form').reset();SmartCityFeedback.flash('password-changed');location.replace('login.html');
        });});
    }
    if(page==='home.html') {
        const statusNames={UNASSIGNED:'Needs assignment',ASSIGNED:'Assigned',IN_PROGRESS:'In progress',RESOLVED:'Resolved'};
        const roleCopy={RESIDENT:['RESIDENT DASHBOARD','Your neighbourhood, your voice.','Report an issue or follow the progress of your own complaints.','My complaints'],LOCAL_STAFF:['LOCAL STAFF DASHBOARD','Your city work, in one place.','Review your local queue and keep everyday services moving.','Open work queue'],SUPERVISOR:['SUPERVISOR DASHBOARD','Keep your team moving.','Review local and supervisor cases across your assigned city.','Review complaints'],CITY_MANAGER:['CITY MANAGER DASHBOARD','A clearer view of your city.','Oversee city cases, service conditions and operational policies.','Review city queue'],SYSTEM_ADMIN:['ADMIN DASHBOARD','A connected city starts here.','Manage access and work across your city workspaces.','Open complaint queue']};
        function workspaces(){
            const items=[['complaints.html',auth.user.role==='RESIDENT'?'My complaints':'Complaint queue','Report, track and review local issues.','complaints'],['account.html','Your profile','Keep your name and sign-in details up to date.','profile']];
            if(auth.user.role!=='RESIDENT')items.splice(1,0,['./','City zones','Explore the areas and buildings in your city.','city'],['meters.html','Energy meters','Record usage and review meter readings.','meters'],['streetlights.html','Streetlights','Keep track of lights and reported faults.','lights'],['policies.html','City policies','Evaluate observations against city rules.','policies']);
            if(auth.user.role==='SYSTEM_ADMIN')items.unshift(['accounts.html','Manage users','Provision accounts and manage city access.','users']);
            items.push(['reports.html',auth.user.role==='RESIDENT'?'My reports':'Complaint reports','Filter cases, compare totals and print a report.','reports']);
            $('#work-shortcuts').replaceChildren(...items.map(([href,title,copy,key])=>{const a=node('a','','shortcut');a.href=href;a.append(SmartCityUI.icon(key),node('strong',title),node('p',copy));return a;}));
        }
        async function summary(){const records=await auth.json(`cities/${$('#home-city').value}/complaints`);
            document.querySelectorAll('a[href^="complaints.html"]').forEach(link=>{link.href=`complaints.html?city=${$('#home-city').value}`;});
            document.querySelectorAll('a[href^="reports.html"]').forEach(link=>{link.href=`reports.html?city=${$('#home-city').value}`;});
            $('#total').textContent=records.length;$('#open').textContent=records.filter(r=>r.status!=='RESOLVED').length;$('#resolved').textContent=records.filter(r=>r.status==='RESOLVED').length;
            const resolved=records.filter(r=>r.status==='RESOLVED').length,rate=records.length?Math.round(resolved/records.length*100):0;
            $('#resolved-rate').textContent=`${rate}%`;$('#status-ring').style.setProperty('--resolved',`${rate}%`);
            $('#status-ring').setAttribute('role','img');$('#status-ring').setAttribute('aria-label',`${resolved} of ${records.length} accessible complaints resolved (${rate} percent).`);
            $('#status-legend').replaceChildren(...Object.entries(statusNames).map(([status,label])=>{const li=node('li','');li.append(node('span',label),node('strong',String(records.filter(r=>r.status===status).length)));return li;}));
            $('#status-note').textContent=records.length?'Current status of accessible complaints.':'No complaints in this city yet. No resolution rate is available.';
            if(!records.length)$('#resolved-rate').textContent='0';
            $('#recent-complaints').replaceChildren(...records.slice(0,5).map(record=>{const a=node('a','','case-row');a.href=`complaints.html?city=${$('#home-city').value}&complaint=${record.id}`;
                const body=node('span','','case-body');body.append(node('span',record.subject,'case-title'),node('span',`${record.severity.toLowerCase()} priority | #${record.id}`,'case-meta'));a.append(node('span',`#${record.id}`,'case-number'),body,node('span',statusNames[record.status]||record.status,'case-status'));return a;}));
            if(!records.length)$('#recent-complaints').append(node('p','Nothing in your queue for this city yet. New complaints will appear here.','empty-queue'));
            $('#message').textContent='Updated from your saved records. Only complaints you can access are included.';}
        act(async()=>{if(!auth.user)return;const copy=roleCopy[auth.user.role];$('#dashboard-role').textContent=copy[0];$('#welcome').textContent=`Hello, ${auth.user.displayName}.`;
            $('#scope').textContent=copy[1];$('#banner-description').textContent=copy[2];$('#primary-work-link').replaceChildren(document.createTextNode(copy[3]+' '),SmartCityUI.icon('arrow'));workspaces();
            cities=await auth.json('cities');$('#home-city').replaceChildren(...cities.map(c=>new Option(c.name,String(c.id))));
            if(cities.length)await summary();else {$('#home-city').disabled=true;$('#message').textContent='No cities are available yet. A system admin can create one in City zones.';$('#recent-complaints').append(node('p','Your workspace is ready. Complaints will appear when a city is available.','empty-queue'));}});
        $('#home-city').addEventListener('change',()=>act(summary));
    }
})();
