(() => {
    const key = 'smartcity.theme';
    const preferred = matchMedia('(prefers-color-scheme: dark)');
    const valid = value => ['light', 'dark'].includes(value) ? value : null;
    let saved;
    try { saved = valid(localStorage.getItem(key)); } catch {}
    function apply(theme) {
        document.documentElement.dataset.theme = theme;
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.setAttribute('aria-checked', String(theme === 'dark'));
            button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        });
    }
    function symbol(name, pathData) {
        const span = document.createElement('span');
        span.className = `theme-symbol theme-${name}`;
        span.setAttribute('aria-hidden', 'true');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        for (const [key, value] of Object.entries({viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'1.8', 'stroke-linecap':'round', 'stroke-linejoin':'round'})) svg.setAttribute(key, value);
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', pathData); svg.append(path); span.append(svg);
        return span;
    }
    function mount(container, before = null) {
        if (container.querySelector('[data-theme-toggle]')) return;
        const wrapper = document.createElement('div'); wrapper.className = 'theme-control';
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'theme-toggle'; button.dataset.themeToggle = '';
        button.setAttribute('role', 'switch'); button.setAttribute('aria-label', 'Dark mode');
        const thumb = document.createElement('span'); thumb.className = 'theme-thumb';
        button.append(thumb,
            symbol('sun', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.4 1.4 M17.6 17.6 19 19 M5 19l1.4-1.4 M17.6 6.4 19 5'),
            symbol('moon', 'M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z'));
        button.addEventListener('click', () => {
            saved = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            apply(saved); try { localStorage.setItem(key, saved); } catch {}
        });
        wrapper.append(button); container.insertBefore(wrapper, before);
        apply(document.documentElement.dataset.theme); return wrapper;
    }
    window.SmartCityTheme = {mount};
    apply(saved || (preferred.matches ? 'dark' : 'light'));
    preferred.addEventListener('change', event => { if (!saved) apply(event.matches ? 'dark' : 'light'); });
    addEventListener('storage', event => {
        if (event.key === key || event.key === null) {
            saved = valid(event.newValue); apply(saved || (preferred.matches ? 'dark' : 'light'));
        }
    });
    document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('link');
        style.rel = 'stylesheet'; style.href = 'assets/css/refinements.css?v=scene3'; document.head.append(style);
        const script = document.createElement('script');
        script.src = 'assets/js/refinements.js?v=profile1'; document.head.append(script);
        if (!document.body.classList.contains('workspace')) mount(document.body).classList.add('auth-theme-control');
    });
})();
