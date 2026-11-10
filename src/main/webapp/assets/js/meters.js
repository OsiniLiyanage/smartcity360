(() => {
const $ = selector => document.querySelector(selector);
const numbers = new Intl.NumberFormat(undefined, {maximumFractionDigits: 3});
const credentials = new Map(); // Memory only: never localStorage, URLs or logging.
let cityId = null, tree = null, meters = [], selectedMeter = null, readings = [], selectedReading = null;
let busy = false, ready = false, meterPage = 0, readingPage = 0;
const dialogStack = [];
async function request(path, method = 'GET', body) {
    const response = await SmartCityAuth.fetch(`api/${path}`, {
        method, headers: body === undefined ? {} : {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    const value = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(value?.error || `Request failed (${response.status}). Please refresh.`);
        error.status = response.status;
        throw error;
    }
    if (value === null) throw new Error('Unexpected server response. Please refresh.');
    return value;
}
async function act(action) {
    if (busy) return;
    const feedback = SmartCityFeedback.begin(); let outcome = 'success';
    busy = true; $('#message').textContent = 'Working…'; controls();
    try { await SmartCityAuth.ready; await action(); }
    catch (error) { outcome = 'error'; $('#message').textContent = error.name === 'TimeoutError'
        ? 'Request timed out. Refresh to check whether it was saved before retrying.' : error.message; }
    finally { busy = false; controls(); feedback.finish(outcome); }
}
function controls() {
    document.querySelectorAll('main button, main input, main select').forEach(control => {
        if (!control.closest('.feedback-stack')) control.disabled = busy;
    });
    $('#city-select').disabled = busy || !$('#city-select').options.length;
    $('#new-meter').disabled = busy || !ready; $('#new-meter').hidden = !!selectedMeter;
    $('#meter-form').querySelectorAll('button[type=submit], input, select').forEach(control => {
        control.disabled = busy || !ready || !$('#building-select').options.length;
    });
    $('#workspace').querySelectorAll('button, input').forEach(control => { control.disabled = busy || !selectedMeter; });
    $('#recover').disabled = $('#tamper').disabled = busy || !selectedReading;
    const count = filteredMeters().length;
    $('#meter-previous').disabled = busy || meterPage === 0;
    $('#meter-next').disabled = busy || (meterPage + 1) * 25 >= count;
    $('#reading-previous').disabled = busy || readingPage === 0;
    $('#reading-next').disabled = busy || (readingPage + 1) * 25 >= readings.length;
}
function element(tag, text, css = '') {
    const node = document.createElement(tag); node.textContent = text; node.className = css; return node;
}
function filteredMeters() {
    const query = $('#meter-search').value.trim().toLocaleLowerCase();
    const buildings = new Map(nodes(tree).filter(node => node.type === 'BUILDING').map(node => [node.id,node]));
    return meters.filter(meter => `${meter.name} ${buildings.get(meter.buildingId)?.label || ''}`.toLocaleLowerCase().includes(query));
}
function renderMeters() {
    const matches = filteredMeters(), pages = Math.max(1, Math.ceil(matches.length / 25));
    meterPage = Math.max(0,Math.min(meterPage,pages-1));
    const rows = $('#meter-rows'); rows.replaceChildren();
    const buildings = new Map(nodes(tree).filter(node => node.type === 'BUILDING').map(node => [node.id,node]));
    for (const meter of matches.slice(meterPage*25,(meterPage+1)*25)) {
        const building = buildings.get(meter.buildingId), row = element('tr',''), place = element('td',''), action = element('td','');
        place.append(element('span',building?.name || 'Building','record-name'),element('span',building?.label || '', 'record-subtitle'));
        const button = element('button','Open','record-edit'); button.type = 'button'; button.setAttribute('aria-label',`Open meter ${meter.name}`);
        button.addEventListener('click', () => act(async () => { await selectMeter(meter.id); $('#meter-title').focus(); $('#message').textContent = ''; }));
        action.append(button); row.append(element('td',meter.name),place,element('td',building ? `${numbers.format(building.usageKwh)} kWh` : '-'),action); rows.append(row);
    }
    if (!matches.length) {
        const row = element('tr',''), cell = element('td',!ready ? 'Choose an available city to begin.' : meters.length ? 'No matching meters. Clear the search to see all meters.' : 'No meters registered in this city.');
        cell.colSpan=4; row.append(cell); rows.append(row);
    }
    $('#meter-count').textContent = `${matches.length} of ${meters.length} meters`;
    $('#meter-page').textContent = `Page ${meterPage+1} of ${pages}`;
    controls();
}
function credentialLabels() {
    document.querySelectorAll('.credential-meter-name').forEach(node => { node.textContent = selectedMeter?.name || ''; });
    document.querySelectorAll('[data-credential-status]').forEach(node => { node.textContent = $('#credential').value ? 'A credential is available in this tab. It will be checked by the server when required.' : 'No credential entered. Set one if this reading uses authentication.'; });
}
function openDialog(dialog, opener = document.activeElement) {
    if (dialog.open) return;
    dialogStack.push(dialog);
    const stack = document.querySelector('.feedback-stack'); if (stack) dialog.append(stack);
    dialog.addEventListener('close', () => {
        const index = dialogStack.indexOf(dialog); if (index >= 0) dialogStack.splice(index,1);
        const parent = dialogStack.filter(node => node.open).at(-1);
        if (stack) (parent || document.body).append(stack);
        if (dialog.id === 'credential-dialog') { $('#credential').type = 'password'; $('#show-credential').checked = false; }
        requestAnimationFrame(() => {
            const top = dialogStack.filter(node => node.open).at(-1);
            if (top && !top.contains(opener)) return;
            if (opener?.isConnected && !opener.disabled) opener.focus(); else $('#meter-title').focus();
        });
    }, {once:true});
    dialog.hidden = false; dialog.showModal();
    requestAnimationFrame(() => { if (dialog.open) (dialog.querySelector('input:not(:disabled),select:not(:disabled)') || dialog.querySelector('[data-close]'))?.focus(); });
}
for (const dialog of document.querySelectorAll('.record-dialog')) {
    dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { if (!busy) dialog.close(); }));
}
function nodes(node, path = '') {
    if (!node) return [];
    const label = path ? `${path} / ${node.name}` : node.name;
    return [{...node, label}, ...node.children.flatMap(child => nodes(child, label))];
}
function totals() {
    const building = nodes(tree).find(node => node.type === 'BUILDING' && node.id === selectedMeter?.buildingId);
    $('#building-total').textContent = building ? `${numbers.format(building.usageKwh)} kWh` : '-';
    $('#city-total').textContent = tree ? `${numbers.format(tree.usageKwh)} kWh` : '-';
    if (selectedMeter) $('#meter-location').textContent = building?.label || 'Building';
}
function processing() {
    const parts = [];
    if ($('#authentication').checked) parts.push('Check credential');
    parts.push('Meter message');
    if ($('#compression').checked) parts.push('GZIP');
    if ($('#encryption').checked) parts.push('AES-GCM');
    parts.push('Verify recovery', 'Save');
    $('#processing-order').textContent = parts.join(' -> ');
    const missing = [];
    if (!$('#authentication').checked) missing.push('meter credential checking is off');
    if (!$('#encryption').checked) missing.push('payload encryption is off');
    $('#layer-warning').hidden = !missing.length;
    $('#layer-warning').textContent = `Demonstration mode: ${missing.join('; ')}.`;
}
function layers(value) {
    return [value.authentication ? 'Credential checked' : 'No credential check',
        value.compression ? 'GZIP' : 'No compression', value.encryption ? 'AES-GCM' : 'No encryption'].join(' | ');
}
function detail(value) {
    selectedReading = value;
    $('#recovery-status').textContent = '';
    $('#recovered').hidden = true; $('#recovered').textContent = '';
    if (!value) return;
    $('#detail-title').textContent = `Reading #${value.id} | ${numbers.format(value.usageKwh)} kWh`;
    $('#detail-layers').textContent = layers(value);
    const difference = value.encodedBytes - value.originalBytes;
    $('#detail-sizes').textContent = `Original: ${value.originalBytes} bytes -> encoded: ${value.encodedBytes} bytes (${Math.abs(difference)} bytes ${difference >= 0 ? 'larger' : 'smaller'}).`;
    $('#payload').textContent = value.payloadBase64;
}
function renderReadings() {
    const pages = Math.max(1,Math.ceil(readings.length/25)); readingPage = Math.max(0,Math.min(readingPage,pages-1));
    const list = $('#readings'); list.replaceChildren();
    for (const reading of readings.slice(readingPage*25,(readingPage+1)*25)) {
        const row = element('tr',''), action = element('td',''), button = element('button','Inspect','record-edit'); button.type = 'button';
        button.setAttribute('aria-label',`Inspect reading ${reading.id}`);
        button.addEventListener('click', () => { if (!busy) { detail(reading); openDialog($('#reading-detail'),button); } });
        action.append(button); row.append(element('td',`#${reading.id}`),element('td',`${numbers.format(reading.usageKwh)} kWh`),element('td',new Date(reading.receivedAt).toLocaleString()),element('td',layers(reading)),action); list.append(row);
    }
    if (!readings.length) { const row=element('tr',''),cell=element('td','No saved readings to display.');cell.colSpan=5;row.append(cell);list.append(row); }
    $('#reading-page').textContent = `Page ${readingPage+1} of ${pages}`;
    controls();
}
async function selectMeter(id) {
    selectedMeter = meters.find(meter => meter.id === id) || null;
    readings = []; readingPage = 0; detail(null); renderReadings();
    $('#workspace').hidden = !selectedMeter; $('#inventory').hidden = !!selectedMeter;
    $('#credential').value = selectedMeter ? credentials.get(selectedMeter.id) || '' : '';
    $('#credential').type = 'password'; $('#show-credential').checked = false;
    credentialLabels(); totals(); controls();
    if (!selectedMeter) return;
    $('#meter-title').textContent = selectedMeter.name; $('#usage').value = '';
    $('#readings-hint').textContent = 'Loading saved readings...';
    try {
        readings = await request(`cities/${cityId}/meters/${id}/readings`);
        $('#readings-hint').textContent = `${readings.length} saved readings, newest first. Inspect a reading to view its payload and verify recovery.`;
        renderReadings();
    } catch (error) { $('#readings-hint').textContent = 'Readings could not load. Use Refresh to try again.'; throw error; }
}
async function loadCity(id, preferredMeter = null) {
    cityId = id; ready = false; tree = null; meters = []; selectedMeter = null; meterPage = 0;
    $('#meter-search').value = ''; $('#building-select').replaceChildren();
    await selectMeter(null); renderMeters();
    if (id === null) { $('#register-hint').textContent = 'Create a city and buildings in City zones.'; return; }
    [tree, meters] = await Promise.all([request(`cities/${id}/zones`), request(`cities/${id}/meters`)]);
    ready = true;
    const buildings = nodes(tree).filter(node => node.type === 'BUILDING' && !meters.some(meter => meter.buildingId === node.id));
    $('#building-select').replaceChildren(...buildings.map(node => new Option(node.label, String(node.id))));
    $('#register-hint').textContent = buildings.length ? 'One meter per building. Registration issues a new credential once.' : 'No unregistered buildings. Add another building in City zones.';
    renderMeters(); totals();
    if (preferredMeter && meters.some(meter => meter.id === preferredMeter)) await selectMeter(preferredMeter);
}
async function loadCities() {
    const cities = await request('cities');
    const chosen = cities.find(city => city.id === cityId) || cities[0];
    $('#city-select').replaceChildren(...cities.map(city => new Option(city.name, String(city.id))));
    if (chosen) $('#city-select').value = String(chosen.id);
    await loadCity(chosen?.id ?? null, selectedMeter?.id);
}
$('#city-select').addEventListener('change', () => act(async () => {
    await loadCity(Number($('#city-select').value)); $('#message').textContent = 'Meters loaded.';
}));
$('#new-meter').addEventListener('click', () => {
    if (busy || !ready || !['SUPERVISOR','CITY_MANAGER','SYSTEM_ADMIN'].includes(SmartCityAuth.user?.role)) return;
    $('#meter-form').reset(); openDialog($('#register-dialog'));
});
$('#new-reading').addEventListener('click', () => {
    if (busy || !selectedMeter) return; $('#usage').value = ''; processing(); credentialLabels(); openDialog($('#reading-dialog'));
});
$('#back-to-meters').addEventListener('click', () => { if (!busy) act(async () => { await selectMeter(null); renderMeters(); $('#meter-search').focus(); $('#message').textContent = ''; }); });
$('#meter-search').addEventListener('input', () => { if (!busy) { meterPage=0; renderMeters(); } });
$('#clear-meter-search').addEventListener('click', () => { if (!busy) { $('#meter-search').value='';meterPage=0;renderMeters();$('#meter-search').focus(); } });
for (const [id,step] of [['meter-previous',-1],['meter-next',1]]) $(`#${id}`).addEventListener('click', () => { if (!busy) { meterPage+=step;renderMeters(); } });
for (const [id,step] of [['reading-previous',-1],['reading-next',1]]) $(`#${id}`).addEventListener('click', () => { if (!busy) { readingPage+=step;renderReadings(); } });
document.querySelectorAll('[data-credential-open]').forEach(button => button.addEventListener('click', () => { if (!busy && selectedMeter) openDialog($('#credential-dialog'),button); }));
$('#refresh').addEventListener('click', () => act(async () => {
    await loadCities(); $('#message').textContent = 'Meters refreshed.';
}));
$('#credential').addEventListener('input', () => { if (selectedMeter) credentials.set(selectedMeter.id, $('#credential').value); credentialLabels(); });
$('#show-credential').addEventListener('change', () => { $('#credential').type = $('#show-credential').checked ? 'text' : 'password'; });
for (const id of ['#authentication', '#compression', '#encryption']) $(id).addEventListener('change', processing);
$('#meter-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        const issued = await request(`cities/${cityId}/meters`, 'POST', {buildingId: Number($('#building-select').value), name: $('#meter-name').value});
        credentials.set(issued.meter.id, issued.credential); $('#meter-form').reset(); $('#register-dialog').close();
        try { await loadCity(cityId, issued.meter.id); }
        catch { throw new Error('Meter registered. The view could not refresh; use Refresh meters. Its new credential is retained in this tab.'); }
        openDialog($('#credential-dialog'),$('#manage-credential'));
        $('#message').textContent = 'Meter registered. Its new credential is filled in; save it privately before leaving.';
    });
});
$('#replace-credential').addEventListener('click', () => act(async () => {
    const issued = await request(`cities/${cityId}/meters/${selectedMeter.id}/credential`, 'POST');
    credentials.set(selectedMeter.id, issued.credential); $('#credential').value = issued.credential;
    $('#credential').type = 'password'; $('#show-credential').checked = false;
    credentialLabels();
    $('#message').textContent = 'New credential issued and filled in. The previous credential is no longer accepted.';
}));
$('#reading-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        if ($('#authentication').checked && !$('#credential').value) throw new Error('Set the meter credential before processing an authenticated reading.');
        const value = await request(`cities/${cityId}/meters/${selectedMeter.id}/readings`, 'POST', {
            usageKwh: Number($('#usage').value), credential: $('#credential').value,
            authentication: $('#authentication').checked, compression: $('#compression').checked, encryption: $('#encryption').checked
        });
        readings.unshift(value); readingPage = 0; detail(value); renderReadings();
        $('#readings-hint').textContent = `${readings.length} saved readings, newest first.`;
        $('#reading-dialog').close(); openDialog($('#reading-detail'),$('#new-reading'));
        try { tree = await request(`cities/${cityId}/zones`); totals(); renderMeters(); }
        catch { throw new Error(`Reading #${value.id} saved, but totals could not refresh. Use Refresh meters.`); }
        $('#message').textContent = `Reading #${value.id} processed, recovered exactly and saved. Building usage updated.`;
    });
});
async function recover(tamper) {
    $('#recovered').hidden = true; $('#recovered').textContent = ''; $('#recovery-status').textContent = '';
    try {
        const result = await request(`cities/${cityId}/meters/${selectedMeter.id}/readings/${selectedReading.id}/recover`, 'POST',
            {credential: $('#credential').value, simulateTampering: tamper});
        if (tamper) throw new Error('Unexpected result: corrupted data was accepted.');
        $('#recovered').textContent = JSON.stringify(JSON.parse(result.recovered), null, 2);
        $('#recovered').hidden = false;
        $('#recovery-status').textContent = 'Verified: recovered bytes match the original message.';
        $('#message').textContent = 'Saved reading recovered successfully.';
    } catch (error) {
        if (tamper && error.status === 400) {
            $('#recovery-status').textContent = 'Corrupted copy rejected. The saved reading is unchanged.';
            $('#message').textContent = 'Corruption test passed.';
        } else { $('#recovery-status').textContent = 'Recovery was not completed.'; throw error; }
    }
}
$('#recover').addEventListener('click', () => act(() => recover(false)));
$('#tamper').addEventListener('click', () => act(() => recover(true)));
processing();
act(async () => { if (!SmartCityAuth.user || SmartCityAuth.user.role === 'RESIDENT') return; await loadCities(); $('#message').textContent = ''; });

})();
