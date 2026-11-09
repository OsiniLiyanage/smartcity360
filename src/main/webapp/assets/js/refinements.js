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
    favicon.rel = 'icon'; favicon.type = 'image/svg+xml'; favicon.href = 'assets/images/app-icon.svg';
    document.head.append(favicon);
    async function mount() {
        await window.SmartCityAuth?.ready;
        document.querySelectorAll('input[type=password][minlength]').forEach(input => input.minLength = 8);
        document.querySelectorAll('label').forEach(label => {
            if (label.textContent.includes('12 to 128')) label.textContent = label.textContent.replace('12 to 128','8 to 128');
        });
        const sidebar = document.querySelector('.app-sidebar');
        document.querySelectorAll('.app-brand').forEach(brand => {
            brand.setAttribute('aria-label','SmartCity360 dashboard');
            const symbol = brand.querySelector('.brand-symbol');
            const image = document.createElement('img'); image.src='assets/images/app-icon.svg'; image.alt='';
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
            LOCAL_STAFF:['home.html','account.html','complaints.html','meters.html','streetlights.html','reports.html'],
            SUPERVISOR:['home.html','account.html','complaints.html','index.html','meters.html','streetlights.html','reports.html'],
            CITY_MANAGER:['home.html','account.html','complaints.html','index.html','meters.html','streetlights.html','policies.html','reports.html'],
            SYSTEM_ADMIN:['home.html','account.html','complaints.html','index.html','streetlights.html','accounts.html','reports.html']
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
        const savedAvatar = SmartCityAuth.user.avatar;
        if (savedAvatar) {
            const avatar = sidebar.querySelector('.avatar');
            const image = document.createElement('img'); image.src = savedAvatar; image.alt = '';
            image.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%'; avatar.replaceChildren(image);
        }
        if (location.pathname.endsWith('account.html')) {
            const appearance = document.createElement('section'); appearance.className = 'panel profile-appearance';
            const heading = document.createElement('h2'); heading.textContent = 'Appearance';
            const label = document.createElement('label'); label.htmlFor = 'interface-font'; label.textContent = 'Interface font';
            const font = document.createElement('select'); font.id = 'interface-font'; font.className = 'appearance-choice';
            for (const [key, name] of Object.entries(fonts)) font.add(new Option(name, key));
            font.value = chosen; font.addEventListener('change', () => setFont(font.value));
            appearance.append(heading, label, document.createElement('br'), font);
            document.querySelector('main').append(appearance);

            let photo = savedAvatar || '';
            const section = document.createElement('section'); section.className = 'panel profile-contact';
            section.innerHTML = `<h2>Contact and photo</h2><form id="contact-profile" style="display:grid;gap:16px;margin-top:20px">
                <img id="profile-preview" alt="Your profile photo" width="96" height="96" style="border-radius:50%;object-fit:cover" hidden>
                <label>Profile photo<input class="field" id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
                <p class="small-note">Choose a JPEG, PNG or WebP up to 5 MB. It will be resized for your profile.</p>
                <button type="button" id="remove-photo" class="secondary">Remove photo</button>
                <label>Username<input id="profile-username" class="field" minlength="3" maxlength="30" pattern="[a-zA-Z][a-zA-Z0-9_]{2,29}" autocomplete="username"></label>
                <p class="small-note">3-30 letters, digits or underscores. Sign in using your email address.</p>
                <label>Phone<input id="profile-phone" class="field" type="tel" maxlength="16" pattern="\\+?[0-9]{7,15}" placeholder="+94771234567" autocomplete="tel"></label>
                <button class="button" type="submit">Save contact details</button><p id="profile-feedback" role="status"></p></form>`;
            document.querySelector('.profile-layout').append(section);
            const preview = section.querySelector('#profile-preview');
            function showPhoto() { preview.hidden = !photo; if(photo) preview.src = photo; else preview.removeAttribute('src'); }
            showPhoto();
            section.querySelector('#profile-username').value = SmartCityAuth.user.username || '';
            section.querySelector('#profile-phone').value = SmartCityAuth.user.phone || '';
            const feedback = section.querySelector('#profile-feedback');
            let reading = false;
            section.querySelector('#remove-photo').onclick = () => {
                photo = ''; showPhoto(); feedback.textContent='Photo removed from the preview. Save your contact details to keep this change.';
                window.SmartCityFeedback?.show('info',feedback.textContent);
            };
            section.querySelector('#profile-photo').onchange = async event => {
                const file = event.target.files[0]; if (!file) return;
                reading = true;
                try {
                    if (file.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Choose a JPEG, PNG or WebP under 5 MB.');
                    const bitmap = await createImageBitmap(file);
                    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 192;
                    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,192,192);
                    const size = Math.min(bitmap.width,bitmap.height);
                    ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,192,192); bitmap.close();
                    photo = canvas.toDataURL('image/jpeg', .85); showPhoto(); feedback.textContent = 'Photo ready. Save your contact details to keep it.';
                    window.SmartCityFeedback?.show('info',feedback.textContent);
                } catch(error) { feedback.textContent = error.message; event.target.value = ''; window.SmartCityFeedback?.show('error',error.message); }
                finally { reading = false; }
            };
            section.querySelector('form').onsubmit = async event => {
                event.preventDefault(); if(reading) { feedback.textContent = 'Wait for the photo to finish loading.'; return; }
                const button = event.target.querySelector('button[type=submit]'); button.disabled = true;
                try {
                    const result = await SmartCityAuth.json('auth/profile-details','PUT',{
                        username:section.querySelector('#profile-username').value, phone:section.querySelector('#profile-phone').value, avatar:photo
                    });
                    Object.assign(SmartCityAuth.user,result); feedback.textContent = 'Contact details and photo saved.';
                    const avatar=sidebar.querySelector('.avatar');
                    if(photo) { const image=document.createElement('img'); image.src=photo; image.alt=''; image.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%'; avatar.replaceChildren(image); }
                    else avatar.textContent=SmartCityAuth.user.displayName.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('');
                } catch(error) { feedback.textContent = error.message; }
                finally { button.disabled = false; }
            };
        }
        if (location.pathname.endsWith('complaints.html')) {
            const heading = document.querySelector('main h1');
            heading.textContent = role === 'RESIDENT' ? 'My complaints' : 'Complaint records';
            heading.previousElementSibling.textContent = role === 'RESIDENT' ? 'Resident services' : 'City services';
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
