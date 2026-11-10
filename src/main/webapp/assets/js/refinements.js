(() => {
    const fonts = {classic:'Arial', system:'Segoe UI', humanist:'Trebuchet'};
    function setFont(value) {
        document.documentElement.dataset.font = value;
        try { localStorage.setItem('smartcity.font.v2', value); } catch {}
    }
    let chosen = 'classic';
    try { chosen = localStorage.getItem('smartcity.font.v2') || chosen; } catch {}
    if (!Object.hasOwn(fonts, chosen)) chosen = 'classic';
    setFont(chosen);
    const favicon = document.createElement('link');
    favicon.rel = 'icon'; favicon.type = 'image/svg+xml'; favicon.href = 'assets/images/app-icon.svg?v=city2';
    document.head.append(favicon);
    async function mount() {
        await window.SmartCityAuth?.ready;
        document.querySelectorAll('input[type=password][minlength]').forEach(input => input.minLength = 8);
        document.querySelectorAll('label').forEach(label => {
            if (label.textContent.includes('12 to 128')) label.textContent = label.textContent.replace('12 to 128','8 to 128');
        });
        const sidebar = document.querySelector('.app-sidebar');
        document.querySelectorAll('.app-brand').forEach(brand => {
            brand.setAttribute('aria-label',document.body.classList.contains('auth-page')?'SmartCity360 sign in':'SmartCity360 dashboard');
            const symbol = brand.querySelector('.brand-symbol');
            const image = document.createElement('img'); image.src='assets/images/app-icon.svg?v=city2'; image.alt='';
            if(symbol) symbol.replaceChildren(image);
        });
        const introduction=document.querySelector('.auth-art-copy h1');
        if(introduction) introduction.textContent='Your city services.';
        if (!sidebar) return;
        sidebar.querySelector('.sidebar-signout').setAttribute('aria-label','Sign out');
        const mobile = matchMedia('(max-width:800px)');
        const close = sidebar.querySelector('.sidebar-close');
        function sync() {
            if (!mobile.matches) sidebar.inert = false;
            const collapsed = document.body.classList.contains('sidebar-hidden');
            close.setAttribute('aria-label', mobile.matches ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse to icons');
            close.textContent = mobile.matches ? '\u00d7' : collapsed ? '>' : '<';
        }
        close.addEventListener('click', event => {
            if (mobile.matches) return;
            event.stopImmediatePropagation();
            document.body.classList.toggle('sidebar-hidden');
            try { localStorage.setItem('smartcity.sidebar', document.body.classList.contains('sidebar-hidden') ? 'hidden' : 'shown'); } catch {}
            sync();
        }, true);
        new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:['class']});
        mobile.addEventListener('change', sync); sync();
        sidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.title = link.textContent; link.setAttribute('aria-label', link.textContent);
        });
        const role = SmartCityAuth.user.role;
        const rolePages = {
            RESIDENT:['home.html','account.html','complaints.html','reports.html'],
            LOCAL_STAFF:['home.html','account.html','complaints.html','meters.html','streetlights.html','policies.html','reports.html'],
            SUPERVISOR:['home.html','account.html','complaints.html','index.html','meters.html','streetlights.html','policies.html','reports.html'],
            CITY_MANAGER:['home.html','account.html','complaints.html','index.html','meters.html','streetlights.html','policies.html','reports.html'],
            SYSTEM_ADMIN:['home.html','account.html','complaints.html','index.html','meters.html','streetlights.html','policies.html','accounts.html','reports.html']
        };
        function trimNavigation() {
            document.querySelectorAll('.sidebar-link,.shortcut').forEach(link => {
                const target = new URL(link.href).pathname.split('/').pop() || 'index.html';
                link.hidden = !rolePages[role].includes(target);
            });
        }
        trimNavigation();
        const shortcuts = document.querySelector('#work-shortcuts');
        if(shortcuts) new MutationObserver(trimNavigation).observe(shortcuts,{childList:true});
        const person = sidebar.querySelector('.sidebar-person');
        sidebar.insertBefore(person, sidebar.querySelector('.sidebar-nav'));
        person.title = `${SmartCityAuth.user.displayName} | ${SmartCityAuth.roleNames[role]}`;
        const savedAvatar = SmartCityAuth.user.avatar;
        if (savedAvatar) {
            const avatar = sidebar.querySelector('.avatar');
            const image = document.createElement('img'); image.src = savedAvatar; image.alt = '';
            image.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%'; avatar.replaceChildren(image);
        } else {
            person.querySelector('.avatar').replaceChildren(SmartCityUI.icon('profile'));
        }
        if (location.pathname.endsWith('account.html')) {
            const font=document.querySelector('#interface-font');
            for(const [key,name] of Object.entries(fonts))font.add(new Option(name,key));
            font.value=chosen; font.addEventListener('change',()=>setFont(font.value));
        }
        if (location.pathname.endsWith('complaints.html')) {
            const heading = document.querySelector('main h1');
            heading.textContent = role === 'RESIDENT' ? 'My complaints' : 'Complaint records';
            if(heading.previousElementSibling)heading.previousElementSibling.textContent = role === 'RESIDENT' ? 'Resident services' : 'City services';
            heading.nextElementSibling.textContent = role === 'RESIDENT' ? 'Report an issue and follow updates from your city team.' : 'Search cases, review progress and manage the work available to your role.';
            if (role !== 'RESIDENT') {
                document.querySelector('#complaint-form').closest('section').hidden = true;
                const message=document.querySelector('#message');
                function correctPrompt() {
                    if(message.textContent==='Choose a complaint or submit a new one.') message.textContent='Choose a complaint to review its details.';
                }
                correctPrompt(); new MutationObserver(correctPrompt).observe(message,{childList:true});
            }
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
