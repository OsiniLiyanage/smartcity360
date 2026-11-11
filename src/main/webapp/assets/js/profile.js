(() => {
    const $=selector=>document.querySelector(selector), auth=window.SmartCityAuth;
    function showSection(name) {
        for(const button of document.querySelectorAll('[data-profile-section]')) {
            const active=button.dataset.profileSection===name;
            button.setAttribute('aria-pressed',String(active));
            document.getElementById(button.getAttribute('aria-controls')).hidden=!active;
        }
    }
    document.querySelectorAll('[data-profile-section]').forEach(button=>button.addEventListener('click',()=>showSection(button.dataset.profileSection)));
    $('#save-photo').addEventListener('click',()=>showSection('details'));
    auth.ready.then(()=>{
        if(!auth.user)return;
        let photo=auth.user.avatar||'', reading=false, saving=false;
        const preview=$('#profile-preview'), input=$('#profile-photo'), feedback=$('#profile-feedback');
        function summary() {
            $('#profile-name').textContent=auth.user.displayName;
            $('#profile-role').textContent=auth.roleNames[auth.user.role];
            $('#profile-email').textContent=auth.user.email;
            $('#saved-username').textContent=auth.user.username||'Not added';
            $('#saved-phone').textContent=auth.user.phone||'Not added';
            const person=document.querySelector('.sidebar-person');
            if(person) {
                person.querySelector('strong').textContent=auth.user.displayName;
                person.setAttribute('aria-label',`${auth.user.displayName}, ${auth.roleNames[auth.user.role]}. Open profile`);
                const avatar=person.querySelector('.avatar');
                if(auth.user.avatar) {const img=document.createElement('img');img.src=auth.user.avatar;img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';avatar.replaceChildren(img);}
                else {const icon=$('#photo-placeholder').cloneNode(true);icon.removeAttribute('id');icon.removeAttribute('hidden');icon.style.cssText='width:26px;height:26px';avatar.replaceChildren(icon);}
            }
        }
        function showPhoto() {
            preview.hidden=!photo; $('#photo-placeholder').toggleAttribute('hidden',!!photo);
            if(photo)preview.src=photo;else preview.removeAttribute('src');
            $('#choose-photo').setAttribute('aria-label',photo?'Change profile photo':'Upload profile photo');
            $('#remove-photo').hidden=!photo;
            const dirty=photo!==(auth.user.avatar||'');
            $('#save-photo').hidden=!dirty;
            $('#photo-state').textContent=dirty?'Preview only. Save your photo to keep this change.':'';
        }
        function lock(value) {
            for(const selector of ['#choose-photo','#remove-photo','#profile-photo','#save-photo','#contact-profile button','#contact-profile input','#profile-form button'])document.querySelectorAll(selector).forEach(el=>el.disabled=value);
        }
        summary();showPhoto();
        $('#profile-username').value=auth.user.username||'';
        $('#profile-phone').value=auth.user.phone||'';
        $('#password-required').hidden=!auth.user.passwordChangeRequired;
        if(auth.user.passwordChangeRequired)showSection('security');
        window.addEventListener('smartcity:profile-updated',summary);
        $('#choose-photo').addEventListener('click',()=>input.click());
        $('#remove-photo').addEventListener('click',()=>{if(reading||saving)return;photo='';input.value='';showPhoto();});
        input.addEventListener('change',async()=>{
            const file=input.files[0];if(!file||reading||saving)return;
            reading=true;lock(true);
            try {
                if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPEG, PNG or WebP under 5 MB.');
                const bitmap=await createImageBitmap(file);
                try {
                    const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
                    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,192,192);
                    const size=Math.min(bitmap.width,bitmap.height);
                    ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,192,192);
                    photo=canvas.toDataURL('image/jpeg',.85);
                } finally {bitmap.close();}
                showPhoto();
            } catch(error) {SmartCityFeedback.show('error',error.message);}
            finally {reading=false;input.value='';lock(false);}
        });
        $('#contact-profile').addEventListener('submit',async event=>{
            event.preventDefault();if(reading||saving)return;
            saving=true;lock(true);
            try {
                const result=await auth.json('auth/profile-details','PUT',{username:$('#profile-username').value,phone:$('#profile-phone').value,avatar:photo});
                Object.assign(auth.user,result);photo=auth.user.avatar||'';
                $('#profile-username').value=auth.user.username||'';$('#profile-phone').value=auth.user.phone||'';
                summary();showPhoto();feedback.textContent='Contact details and photo saved.';
            } catch(error) {feedback.textContent=error.message;}
            finally {saving=false;lock(false);}
        });
    }).catch(()=>{}); // Session failure is already reported by auth.js.
})();
