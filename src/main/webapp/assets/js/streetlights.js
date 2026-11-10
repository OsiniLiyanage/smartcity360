(() => {
const $ = selector => document.querySelector(selector);
const colours = {WARM_WHITE: 'Warm white', NEUTRAL_WHITE: 'Neutral white', COOL_WHITE: 'Cool white'};
const numbers = new Intl.NumberFormat();
let cityId = null, specifications = [], streets = [], selected = null, page = 0, result = null;
let ready = false, busy = false;
async function request(path, method = 'GET', body) {
    const response = await SmartCityAuth.fetch(`api/${path}`, {
        method, headers: body === undefined ? {} : {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    const value = await response.json().catch(() => null);
    if (!response.ok) throw new Error(value?.error || `Request failed (${response.status}). Please refresh.`);
    if (value === null) throw new Error('Unexpected server response. Please refresh.');
    return value;
}
async function act(action) {
    if (busy) return;
    const feedback = SmartCityFeedback.begin(); let outcome = 'success';
    busy = true; $('#message').textContent = 'Working…'; controls();
    try { await SmartCityAuth.ready; await action(); }
    catch (error) { outcome = 'error'; $('#message').textContent = error.name === 'TimeoutError'
        ? 'The request timed out. Refresh to check whether it was saved before retrying.' : error.message; }
    finally { busy = false; controls(); feedback.finish(outcome); }
}
function controls() {
    document.querySelectorAll('main button, main input, main select, main textarea').forEach(node => { if (!node.closest('.feedback-stack')) node.disabled = busy; });
    $('#city-select').disabled = busy || !$('#city-select').options.length;
    $('#light-form').querySelectorAll('button[type=submit], input, select').forEach(node => { node.disabled = busy || !ready || !streets.length || !specifications.length; });
    $('#previous').disabled = busy || !ready || page === 0;
    $('#next').disabled = busy || !ready || !result || (page + 1) * result.pageSize >= result.total;
    $('#refresh-detail').disabled = busy || !selected;
    $('#new-light').disabled = busy || !ready;
}
function element(tag, text, css = '') {
    const node = document.createElement(tag); node.textContent = text; node.className = css; return node;
}
function flatten(node, parent = '') {
    const label = parent ? `${parent} / ${node.name}` : node.name;
    return [{...node, label}, ...node.children.flatMap(child => flatten(child, label))];
}
function specOptions() {
    for (const id of ['#spec-select', '#edit-spec']) {
        const previous = $(id).value;
        $(id).replaceChildren(...specifications.map(spec => new Option(`${spec.model} | ${spec.ratedWatts} W | ${colours[spec.colour]}`, String(spec.id))));
        if (specifications.some(spec => String(spec.id) === previous)) $(id).value = previous;
    }
}
function faultField() {
    $('#fault-panel').hidden = !$('#fault').checked;
    $('#fault-note').required = $('#fault').checked;
    if (!$('#fault').checked) $('#fault-note').value = '';
}
function detail(value) {
    selected = value; $('#detail').hidden = !value;
    if (!value) return;
    $('#detail-title').textContent = value.label;
    $('#detail-street').textContent = streets.find(street => street.id === value.streetId)?.label || 'Street';
    $('#detail-state').textContent = `${value.state === 'FAULT' ? 'Fault reported' : value.state === 'ON' ? 'On' : 'Off'} | ${value.ratedLoadWatts} W simulated rated load`;
    $('#edit-label').value = value.label; $('#edit-location').value = value.location;
    $('#edit-spec').value = String(value.specificationId);
    $('#power-on').checked = value.powerOn; $('#fault').checked = value.faulty;
    $('#fault-note').value = value.faultNote; faultField();
}
function render() {
    for (const id of ['total', 'on', 'faulty']) $(`#${id}`).textContent = numbers.format(result?.[id] || 0);
    $('#load').textContent = `${numbers.format(result?.ratedLoadWatts || 0)} W`;
    $('#lights').replaceChildren();
    const query = $('#light-search').value.trim().toLocaleLowerCase(), state = $('#state-filter').value;
    const items = (result?.items || []).filter(item => (!state || item.state === state) &&
        `${item.label} ${item.location} ${item.model}`.toLocaleLowerCase().includes(query));
    $('#filter-summary').textContent = result ? `${items.length} of ${result.items.length} records on this page match. ${numbers.format(result.total)} registered in this city.` : '';
    if (!items.length) {
        const row = element('tr',''), cell = element('td', !ready ? 'Choose an available city to begin.' : result?.items.length ? 'No matches on this page. Clear the filters or browse another page.' : 'No streetlights on this page.');
        cell.colSpan = 5; row.append(cell); $('#lights').append(row);
    }
    for (const item of items) {
        const row = element('tr',''), place = element('td',''), spec = element('td',''), stateCell = element('td',''), action = element('td','');
        place.append(element('span', streets.find(street => street.id === item.streetId)?.name || 'Street', 'record-name'), element('span',item.location,'record-subtitle'));
        spec.append(element('span',item.model),element('span',`${item.ratedWatts} W | ${colours[item.colour]}`,'record-subtitle'));
        stateCell.append(element('span',item.state === 'FAULT' ? 'Fault reported' : item.state === 'ON' ? 'On' : 'Off',`record-badge${item.state === 'ON' ? ' active' : item.state === 'FAULT' ? ' fault' : ''}`));
        const button = element('button','Open','record-edit'); button.type = 'button';
        button.setAttribute('aria-label',`Open streetlight ${item.label}`);
        button.addEventListener('click', () => act(async () => {
            detail(null);
            detail(await request(`cities/${cityId}/streetlights/${item.id}`));
            openDialog($('#detail'),button);
            $('#message').textContent = '';
        }));
        action.append(button); row.append(element('td',item.label),place,spec,stateCell,action); $('#lights').append(row);
    }
    const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
    $('#page-label').textContent = `Page ${page + 1} of ${pages}`;
    $('#sharing').textContent = result ? `This page: ${result.items.length} light objects use ${result.pageSpecificationObjects} shared specification objects in Java. City-wide: ${result.distinctSpecifications} specification types.` : '';
    controls();
}
async function loadPage() { result = await request(`cities/${cityId}/streetlights?page=${page}&pageSize=25`); render(); }
async function loadCity(id, selectedId = null) {
    $('#light-search').value = ''; $('#state-filter').value = '';
    cityId = id; ready = false; result = null; streets = []; page = 0; detail(null); render();
    $('#street-select').replaceChildren();
    if (id === null) { $('#street-hint').textContent = 'Create a city and streets in City zones.'; return; }
    const tree = await request(`cities/${id}/zones`);
    streets = flatten(tree).filter(node => node.type === 'STREET');
    $('#street-select').replaceChildren(...streets.map(street => new Option(street.label, String(street.id))));
    $('#street-hint').textContent = streets.length ? (specifications.length ? 'Pole labels must be unique within this city.' : 'Ask an administrator to add a lamp specification first.') : 'Add a street in City zones before registering lights.';
    ready = true; await loadPage();
    if (selectedId) { detail(await request(`cities/${id}/streetlights/${selectedId}`)); render(); }
}
async function refresh() {
    const [cities, specs] = await Promise.all([request('cities'), request('lamp-specifications')]);
    specifications = specs; specOptions();
    const chosen = cities.find(city => city.id === cityId) || cities[0];
    $('#city-select').replaceChildren(...cities.map(city => new Option(city.name, String(city.id))));
    if (chosen) $('#city-select').value = String(chosen.id);
    await loadCity(chosen?.id ?? null, selected?.id);
}
async function saved(value, message) {
    detail(value);
    try { await loadPage(); }
    catch { message += ' Saved successfully, but inventory could not refresh. Use Refresh streetlights.'; }
    $('#message').textContent = message;
}
function openDialog(dialog, opener = document.activeElement) {
    const stack = document.querySelector('.feedback-stack');
    if (stack) dialog.append(stack);
    dialog.addEventListener('close', () => {
        if (stack && stack.parentElement === dialog) document.body.append(stack);
        if (dialog.id === 'detail') detail(null);
        requestAnimationFrame(() => {
            if (document.querySelector('dialog[open]')) return;
            if (opener?.isConnected && !opener.disabled) opener.focus(); else $('#main-content').focus();
        });
    }, {once:true});
    dialog.showModal();
    requestAnimationFrame(() => { if (dialog.open) (dialog.querySelector('input:not(:disabled),select:not(:disabled)') || dialog.querySelector('[data-close]'))?.focus(); });
}
for (const dialog of document.querySelectorAll('.record-dialog')) {
    dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { if (!busy) dialog.close(); }));
}
$('#new-light').addEventListener('click', () => {
    if (busy || !ready || !['SUPERVISOR','CITY_MANAGER','SYSTEM_ADMIN'].includes(SmartCityAuth.user?.role)) return;
    $('#light-form').reset(); openDialog($('#register-dialog'));
});
$('#new-spec').addEventListener('click', () => {
    if (busy || SmartCityAuth.user?.role !== 'SYSTEM_ADMIN') return;
    $('#spec-form').reset(); openDialog($('#spec-dialog'));
});
$('#open-demo').addEventListener('click', () => {
    if (!busy && SmartCityAuth.user?.role === 'SYSTEM_ADMIN') openDialog($('#demo-dialog'));
});
$('#light-search').addEventListener('input', () => { if (!busy) render(); });
$('#state-filter').addEventListener('change', () => { if (!busy) render(); });
$('#clear-search').addEventListener('click', () => {
    if (busy) return; $('#light-search').value = ''; $('#state-filter').value = ''; render(); $('#light-search').focus();
});
$('#city-select').addEventListener('change', () => act(async () => {
    await loadCity(Number($('#city-select').value)); $('#message').textContent = 'Streetlights loaded.';
}));
$('#refresh').addEventListener('click', () => act(async () => { await refresh(); $('#message').textContent = 'Streetlights refreshed.'; }));
for (const [id, step] of [['#previous', -1], ['#next', 1]]) $(id).addEventListener('click', () => act(async () => {
    const previous = page; page += step; detail(null);
    try { await loadPage(); } catch (error) { page = previous; render(); throw error; }
    $('#message').textContent = 'Inventory page loaded.';
}));
$('#refresh-detail').addEventListener('click', () => act(async () => {
    await saved(await request(`cities/${cityId}/streetlights/${selected.id}`), 'Details refreshed.');
}));
$('#fault').addEventListener('change', faultField);
$('#light-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        const value = await request(`cities/${cityId}/streetlights`, 'POST', {
            streetId: Number($('#street-select').value), specificationId: Number($('#spec-select').value),
            label: $('#pole-label').value, location: $('#location').value
        });
        $('#light-form').reset();
        $('#register-dialog').close();
        await saved(value, `Registered ${value.label}.`);
        openDialog($('#detail'),$('#new-light'));
    });
});
$('#edit-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        const value = await request(`cities/${cityId}/streetlights/${selected.id}`, 'PUT', {
            label: $('#edit-label').value, location: $('#edit-location').value, specificationId: Number($('#edit-spec').value),
            powerOn: $('#power-on').checked, faulty: $('#fault').checked,
            faultNote: $('#fault-note').value, version: selected.version
        });
        await saved(value, `Saved changes to ${value.label}. Other lights were not changed.`);
    });
});
$('#spec-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        const value = await request('lamp-specifications', 'POST', {model: $('#model').value, ratedWatts: Number($('#watts').value), colour: $('#colour').value});
        $('#spec-form').reset(); $('#spec-dialog').close();
        try { specifications = await request('lamp-specifications'); specOptions(); $('#spec-select').value = String(value.id); }
        catch { throw new Error('Specification saved, but the list could not refresh. Use Refresh streetlights.'); }
        $('#message').textContent = `Specification ${value.model} is available. Matching configurations reuse the existing specification.`;
    });
});
$('#demo-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        $('#demo-result').textContent = '';
        const value = await request(`lamp-specifications/demo?count=${Number($('#demo-count').value)}`);
        $('#demo-result').textContent = `${numbers.format(value.lights)} temporary lights\nWith sharing: ${numbers.format(value.sharedSpecifications)} specification objects\nWithout sharing: ${numbers.format(value.unsharedSpecifications)} specification objects\nAvoided: ${numbers.format(value.avoidedSpecificationObjects)} specification objects\nIndependent power state: ${value.independentState ? 'verified' : 'not verified'}\nCombined demonstration time: ${value.elapsedMilliseconds.toFixed(2)} ms. No database records created.`;
        $('#message').textContent = 'Specification-sharing demonstration completed.';
    });
});
act(async () => { if (!SmartCityAuth.user || SmartCityAuth.user.role === 'RESIDENT') return; await refresh(); $('#message').textContent = ''; });

})();
