(() => {
    const controls = document.querySelectorAll('[data-password]');
    function hide(button) {
        document.getElementById(button.dataset.password).type = 'password';
        button.setAttribute('aria-label', button.dataset.showLabel);
        button.setAttribute('aria-pressed', 'false');
    }
    for (const button of controls) {
        const input = document.getElementById(button.dataset.password);
        button.dataset.showLabel = button.getAttribute('aria-label');
        button.setAttribute('aria-controls', input.id);
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="eye-slash" d="M3 3l18 18"/></svg>';
        button.hidden = false;
        button.addEventListener('click', () => {
            if (input.type === 'text') hide(button);
            else {
                input.type = 'text';
                button.setAttribute('aria-label', button.dataset.showLabel.replace('Show', 'Hide'));
                button.setAttribute('aria-pressed', 'true');
            }
        });
    }
    document.querySelectorAll('.scene-tabs button').forEach(button => button.addEventListener('click', () => {
        controls.forEach(hide);
        document.querySelector('.scene-card').scrollTop = 0;
    }));
    // Hide revealed values before an authentication request or when leaving this tab.
    document.querySelectorAll('.scene-form').forEach(form => form.addEventListener('submit', () => controls.forEach(hide)));
    document.addEventListener('visibilitychange', () => { if (document.hidden) controls.forEach(hide); });
})();
