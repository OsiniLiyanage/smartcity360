(() => {
    'use strict';
    const $ = selector => document.querySelector(selector);
    const model = SmartCityReportModel, auth = SmartCityAuth;
    let cities = [], areaEntries = [], busy = false, ready = false;
    function node(tag, text, css = '') { const el = document.createElement(tag); el.textContent = text; el.className = css; return el; }
    function invalidate(message) {
        ready = false;
        $('#report-preview').hidden = true;
        delete document.body.dataset.reportReady;
        $('#print-report').disabled = true;
        if (message) $('#message').textContent = message;
    }
    function controls() {
        $('#report-filters').querySelectorAll('input,select,button').forEach(el => { el.disabled = busy || !cities.length; });
        $('#print-report').disabled = busy || !ready;
    }
    async function act(work) {
        if (busy) return;
        busy = true; invalidate('Loading saved data...'); delete $('#message').dataset.error; controls();
        try { await work(); }
        catch (error) {
            invalidate(); $('#message').dataset.error = 'true';
            $('#message').textContent = error.name === 'TimeoutError' ? 'The report could not load in time. Generate again to retry.' : error.message;
        } finally { busy = false; controls(); }
    }
    function filters() { return Object.fromEntries(['from','to','status','severity','area'].map(key => [key,$(`#report-${key}`).value])); }
    function bars(selector, entries) {
        const max = Math.max(1,...entries.map(([,count]) => count));
        $(selector).replaceChildren(...entries.map(([label,count]) => {
            const item = node('li',''), heading = node('div','','report-bar-label');
            heading.append(node('span',label),node('strong',String(count)));
            const track = node('div','','report-bar-track'), fill = node('span','','report-bar-fill');
            track.setAttribute('aria-hidden','true'); fill.style.width = `${count / max * 100}%`; track.append(fill); item.append(heading,track); return item;
        }));
        if (!entries.length) $(selector).append(node('li','No matching submissions.','small-note'));
    }
    async function generate() {
        const options = filters();
        model.build([],options,areaEntries); // Reject invalid dates before loading records.
        const city = cities.find(c => String(c.id) === $('#report-city').value);
        if (!city) throw new Error('Choose an available city.');
        const records = await auth.json(`cities/${city.id}/complaints`);
        const report = model.build(records,options,areaEntries);
        const role = auth.roleNames[auth.user.role];
        $('#report-title').textContent = auth.user.role === 'RESIDENT' ? 'My complaint report' : 'Complaint workload report';
        $('#report-scope').textContent = `${city.name} | ${role} access | ${auth.user.role === 'RESIDENT' ? 'Your own cases only' : 'Authorized city and authority-tier scope'}`;
        const area = options.area === 'city' ? 'Whole-city complaints only' : areaEntries.find(a => a.id === options.area)?.label || 'All areas';
        $('#report-filter-summary').textContent = `Submitted: ${options.from || 'earliest'} through ${options.to || 'latest'} (UTC, inclusive). Area: ${area}${options.area && options.area !== 'city' ? ' and child areas' : ''}. Status: ${model.statuses[options.status] || 'All'}. Severity: ${model.severities[options.severity] || 'All'}.`;
        $('#report-generated').textContent = `Generated: ${new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC')}. ${report.total} of ${records.length} accessible cases match.`;
        for (const key of ['total','open','resolved','pending']) $(`#report-${key}`).textContent = String(report[key]);
        bars('#report-status-chart',Object.entries(report.byStatus).map(([key,value]) => [model.statuses[key],value]));
        bars('#report-severity-chart',Object.entries(report.bySeverity).map(([key,value]) => [model.severities[key],value]));
        bars('#report-month-chart',report.months);
        $('#report-rows').replaceChildren(...report.rows.map(row => {
            const tr = node('tr',''), reference = node('td','');
            const link = node('a',`#${row.id}`,'text-link'); link.href = `complaints.html?city=${city.id}&complaint=${row.id}`; reference.append(link);
            tr.append(reference,node('td',row.subject),node('td',row.area),node('td',model.severities[row.severity]),node('td',model.statuses[row.status] + (row.reopenRequested ? ' (reopening requested)' : '')),node('td',row.submitted.slice(0,10)));
            return tr;
        }));
        $('#report-empty').hidden = report.total > 0;
        $('#report-preview').hidden = false; ready = true; document.body.dataset.reportReady = 'true';
        $('#message').textContent = `${report.total} matching complaints. Charts, table and print output use the same filters.`;
    }
    async function loadAreas() {
        areaEntries = [];
        $('#report-area').replaceChildren(new Option('All areas',''),new Option('Whole-city complaints only','city'));
        const tree = await auth.json(`cities/${$('#report-city').value}/areas`);
        areaEntries = model.areas(tree);
        for (const area of areaEntries) $('#report-area').add(new Option(area.label,area.id));
    }
    $('#report-filters').addEventListener('submit',event => { event.preventDefault(); act(generate); });
    $('#report-filters').addEventListener('input',() => { invalidate('Filters changed. Generate the report to refresh the preview.'); delete $('#message').dataset.error; });
    $('#report-city').addEventListener('change',() => act(async () => { await loadAreas(); await generate(); }));
    $('#reset-report').addEventListener('click',() => act(async () => {
        for (const key of ['from','to','status','severity','area']) $(`#report-${key}`).value = '';
        await generate();
    }));
    $('#print-report').addEventListener('click',async () => {
        // Recheck server permissions and refresh the snapshot before exposing the print dialog.
        await act(generate);
        if (ready) window.print();
    });
    auth.ready.then(user => {
        if (!user || user.passwordChangeRequired) return;
        if (user.role === 'RESIDENT') $('#report-intro').textContent = 'Review and print a summary of your own complaints. Only your cases appear here.';
        act(async () => {
            cities = await auth.json('cities');
            $('#report-city').replaceChildren(...cities.map(city => new Option(city.name,String(city.id))));
            if (!cities.length) { invalidate('No cities are available. An administrator can create a city before reports are generated.'); return; }
            const requested = new URLSearchParams(location.search).get('city');
            if (cities.some(city => String(city.id) === requested)) $('#report-city').value = requested;
            await loadAreas(); await generate();
        });
    }).catch(() => { invalidate(); controls(); });
})();
