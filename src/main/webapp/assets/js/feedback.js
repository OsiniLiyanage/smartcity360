(() => {
    'use strict';
    const titles = {success:'Completed', error:'Attention needed', warning:'Check your details', info:'Update', loading:'Working...'};
    const flashMessages = {'signed-in':'Signed in. Your workspace is ready.', 'signed-out':'You have signed out.', registered:'Your resident account is ready.', 'password-changed':'Password changed. Sign in with your new password.'};
    let region, interaction = null, invalidQueued = false;
    const notices = new Set();
    function make(tag, css, text) { const el = document.createElement(tag); el.className = css; if (text) el.textContent = text; return el; }
    function mount() {
        if (region) return;
        region = make('section','feedback-stack'); region.setAttribute('aria-label','Action notifications');
        document.body.append(region);
    }
    function show(kind, message) {
        if (!message) return {close() {}};
        mount();
        if (!Object.hasOwn(titles,kind)) kind = 'info';
        for (const notice of notices) if (notice.kind === kind && notice.message === message) { notice.restart(); return notice; }
        // Keep errors and validation warnings until the user dismisses them.
        const temporary = [...notices].filter(notice => ['success','info'].includes(notice.kind));
        if (temporary.length >= 3) temporary[0].close();
        const card = make('div',`feedback-toast feedback-${kind}`);
        const icon = make('span','feedback-icon', {success:'\u2713',error:'!',warning:'!',info:'i',loading:''}[kind]); icon.setAttribute('aria-hidden','true');
        const content = make('div','feedback-content'); content.setAttribute('role',kind === 'error' ? 'alert' : 'status'); content.setAttribute('aria-atomic','true');
        const title = make('strong','feedback-title',titles[kind]), body = make('p','feedback-text',message);
        content.append(title,body);
        const close = make('button','feedback-dismiss','\u00d7'); close.type = 'button'; close.setAttribute('aria-label','Dismiss notification');
        card.append(icon,content,close); region.append(card);
        let timer = null, hovered = false;
        const notice = {kind,message,close() { clearTimeout(timer); notices.delete(notice); card.remove(); },
            restart() { clearTimeout(timer); if (!['error','warning','loading'].includes(kind) && !hovered && !card.contains(document.activeElement)) timer = setTimeout(notice.close,8000); }};
        notices.add(notice); close.addEventListener('click',notice.close);
        card.addEventListener('pointerenter',() => { hovered = true; clearTimeout(timer); });
        card.addEventListener('pointerleave',() => { hovered = false; notice.restart(); });
        card.addEventListener('focusin',() => clearTimeout(timer));
        card.addEventListener('focusout',() => queueMicrotask(notice.restart));
        notice.restart(); return notice;
    }
    function inline(target,kind) {
        if (!target) return;
        target.dataset.feedbackState = kind;
        // The toast announces user actions; inline text remains available after a toast is dismissed.
        target.setAttribute('aria-live','off');
        if (kind === 'error') target.dataset.error = 'true'; else delete target.dataset.error;
    }
    function begin(target = document.querySelector('#message')) {
        const action = interaction; interaction = null;
        const trigger = action?.button, form = action?.form;
        inline(target,'loading');
        trigger?.setAttribute('aria-busy','true'); form?.setAttribute('aria-busy','true');
        let loading, finished = false;
        const timer = null;
        return {finish(kind = 'success',message = target?.textContent) {
            if (finished) return; finished = true; clearTimeout(timer); loading?.close();
            trigger?.removeAttribute('aria-busy'); form?.removeAttribute('aria-busy');
            inline(target,action ? kind : (kind === 'error' ? 'error' : 'info'));
            if (target) target.dataset.feedbackMessage = message || '';
            const saved = action?.type === 'submit' && /\b(saved|created|updated|registered|submitted|resolved|assigned|changed|sent|completed)\b/i.test(message || '');
            if ((kind === 'error' || kind === 'warning' || saved) && message) show(kind,message);
        }};
    }
    function flash(key) { if (Object.hasOwn(flashMessages,key)) try { sessionStorage.setItem('smartcity.feedback',key); } catch {} }
    for (const type of ['click','submit','change']) document.addEventListener(type,event => {
        const element = event.target;
        if (!(element instanceof Element) || element.closest('.feedback-stack')) return;
        const button = event.submitter || element.closest('button');
        if (type === 'click' && !button) return;
        interaction = {type,button,form:element.closest('form')};
        // Native event listeners can have a microtask checkpoint between capture and bubble.
        // Retain the triggering action until the next task, or until begin consumes it.
        const active = interaction; setTimeout(() => { if (interaction === active) interaction = null; },0);
    },true);
    document.addEventListener('invalid',event => {
        if (invalidQueued) return;
        invalidQueued = true; queueMicrotask(() => { invalidQueued = false; });
        const input = event.target;
        const label = input.labels?.[0]?.textContent.trim() || input.getAttribute('aria-label') || 'This field';
        show('warning',`${label}: ${input.validationMessage || 'Please check this value.'}`);
    },true);
    function ready() {
        mount();
        let key; try { key = sessionStorage.getItem('smartcity.feedback'); sessionStorage.removeItem('smartcity.feedback'); } catch {}
        if (Object.hasOwn(flashMessages,key) && !['signed-in','signed-out'].includes(key)) show('success',flashMessages[key]);
    }
    window.SmartCityFeedback = {show,begin,flash};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready); else ready();
})();
