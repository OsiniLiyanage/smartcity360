(() => {
    const paths={dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
        city:'M3 21V8l6-3v16 M9 21V3h7v18 M16 21V10h5v11 M1 21h22 M12 7h1 M12 11h1 M12 15h1',
        complaints:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z M8 9h8 M8 13h5',
        meters:'m13 2-9 12h7l-1 8 10-13h-7z',lights:'M9 18h6 M10 22h4 M8 14a6 6 0 1 1 8 0l-1 2H9z',
        policies:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z m-5 10 3 3 6-6',
        profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-3a8 8 0 0 1 16 0v3',
        users:'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 22v-3a8 8 0 0 1 16 0v3 M17 3a4 4 0 0 1 0 8 M20 14a7 7 0 0 1 3 6',
        reports:'M5 3h14v18H5z M8 16v-3 M12 16V9 M16 16V6',
        menu:'M4 6h16 M4 12h16 M4 18h16',close:'m6 6 12 12 M18 6 6 18',out:'M9 3H3v18h6 M13 7l5 5-5 5 M7 12h14',arrow:'M5 12h14 m-6-6 6 6-6 6'};
    function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        for(const [key,value]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
        const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.city);svg.append(path);return svg;}
    function element(tag,css,text){const el=document.createElement(tag);el.className=css;if(text)el.textContent=text;return el;}
    function mount(auth){
        const page=location.pathname.split('/').pop()||'index.html',role=auth.user.role;
        const main=document.querySelector('main');
        const skip=element('a','skip-link','Skip to content');skip.href='#main-content';document.body.prepend(skip);
        const sidebar=element('aside','app-sidebar');sidebar.id='app-sidebar';sidebar.setAttribute('aria-label','Workspace sidebar');
        const brand=element('a','app-brand');brand.href='home.html';brand.append(element('span','brand-symbol','S'),element('span','brand-word','smartcity'),element('span','brand-number','360'));
        const close=element('button','sidebar-close');close.type='button';close.setAttribute('aria-label','Hide sidebar');close.append(icon('close'));
        const brandRow=element('div','sidebar-brand-row');brandRow.append(brand,close);sidebar.append(brandRow,element('p','nav-caption','WORKSPACE'));
        const nav=element('nav','sidebar-nav');nav.setAttribute('aria-label','Main navigation');
        const links=[['home.html','Dashboard','dashboard'],['complaints.html',role==='RESIDENT'?'My complaints':'Complaint queue','complaints']];
        if(role!=='RESIDENT')links.push(['./','City zones','city'],['meters.html','Energy meters','meters'],['streetlights.html','Streetlights','lights'],['policies.html','City policies','policies']);
        if(role==='SYSTEM_ADMIN')links.push(['accounts.html','Manage users','users']);
        links.push(['reports.html',role==='RESIDENT'?'My reports':'Reports','reports'],['account.html','Profile','profile']);
        for(const[href,label,key]of links){const a=element('a','sidebar-link');a.href=href;a.append(icon(key),element('span','',label));if((href==='./'?'index.html':href)===page)a.setAttribute('aria-current','page');nav.append(a);}
        sidebar.append(nav);
        const note=element('div','sidebar-note');note.append(element('span','status-dot'),element('span','','Your city. Connected.'),element('small','','Local demonstration workspace'));sidebar.append(note);
        const person=element('a','sidebar-person');person.href='account.html';person.setAttribute('aria-label',`${auth.user.displayName}, ${auth.roleNames[role]}. Open profile`);const initials=auth.user.displayName.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('');
        const who=element('span','person-text');who.append(element('strong','',auth.user.displayName),element('small','',auth.roleNames[role]));person.append(element('span','avatar',initials),who);sidebar.append(person);
        const out=element('button','sidebar-signout');out.type='button';out.append(icon('out'),element('span','','Sign out'));
        out.addEventListener('click',async()=>{const feedback=SmartCityFeedback.begin();out.disabled=true;try{await auth.json('auth/logout','POST');feedback.finish('success','Signed out.');SmartCityFeedback.flash('signed-out');location.replace('login.html');}catch(error){out.disabled=false;feedback.finish('error',error.message);}});sidebar.append(out);
        const toggle=element('button','sidebar-toggle');toggle.type='button';toggle.setAttribute('aria-label','Show sidebar');toggle.setAttribute('aria-controls',sidebar.id);toggle.append(icon('menu'));
        const overlay=element('button','sidebar-overlay');overlay.type='button';overlay.setAttribute('aria-label','Close navigation');overlay.tabIndex=-1;
        document.body.prepend(sidebar,toggle,overlay);
        SmartCityTheme.mount(sidebar,person);
        const mobile=matchMedia('(max-width: 800px)');let expanded=true;
        function apply(open,focus=false){expanded=open;document.body.classList.toggle('sidebar-hidden',!open);document.body.classList.toggle('mobile-nav-open',mobile.matches&&open);
            sidebar.inert=!open;main.inert=mobile.matches&&open;toggle.setAttribute('aria-expanded',String(open));
            if(focus)(open?close:toggle).focus();
        }
        function desktopPreference(){try{return localStorage.getItem('smartcity.sidebar')!=='hidden';}catch{return true;}}
        function change(open){apply(open,true);if(!mobile.matches)try{localStorage.setItem('smartcity.sidebar',open?'shown':'hidden');}catch{}}
        close.addEventListener('click',()=>change(false));toggle.addEventListener('click',()=>change(true));overlay.addEventListener('click',()=>change(false));
        document.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){change(false);return;}
            if(event.key==='Tab'&&mobile.matches&&expanded){const items=[...sidebar.querySelectorAll('a,button:not(:disabled)')];const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
        });
        mobile.addEventListener('change',()=>apply(!mobile.matches&&desktopPreference()));apply(!mobile.matches&&desktopPreference());
    }
    window.SmartCityUI={mount,icon};
})();
