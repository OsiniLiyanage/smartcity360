(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('link');
        style.rel = 'stylesheet'; style.href = 'assets/css/refinements.css?v=2';
        document.head.append(style);
        const script = document.createElement('script');
        script.src = 'assets/js/refinements.js?v=2'; document.head.append(script);
    });
    const key='smartcity.theme';
    let saved;try{saved=localStorage.getItem(key);}catch{}
    const preferred=matchMedia('(prefers-color-scheme: dark)');
    function apply(theme){document.documentElement.dataset.theme=theme;
        document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
            button.textContent=theme==='dark'?'Light mode':'Dark mode';
            button.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');
        });
    }
    apply(['light','dark'].includes(saved)?saved:(preferred.matches?'dark':'light'));
    preferred.addEventListener('change',event=>{if(!saved)apply(event.matches?'dark':'light');});
    document.addEventListener('DOMContentLoaded',()=>{
        const button=document.createElement('button');button.type='button';button.className='theme-toggle';button.dataset.themeToggle='';
        button.addEventListener('click',()=>{saved=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(saved);try{localStorage.setItem(key,saved);}catch{}});
        document.body.append(button);apply(document.documentElement.dataset.theme);
    });
    addEventListener('storage',event=>{if(event.key===key){saved=event.newValue;apply(['light','dark'].includes(saved)?saved:(preferred.matches?'dark':'light'));}});
})();
