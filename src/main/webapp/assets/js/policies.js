const $ = selector => document.querySelector(selector);
const fieldNames = {noise: 'noise (dB)', hour: 'local hour', parkingMinutes: 'parking minutes'};
const outcomes = {VIOLATION: 'Violation detected', NO_VIOLATION: 'No violation under this rule', PERMITTED: 'Activity permitted', NOT_PERMITTED: 'Activity not permitted'};
let cityId = null, selected = null, zones = [], page = 0, historyPage = 0, listing = null, history = null;
let busy = false, ready = false, dirty = false;
async function request(path, method = 'GET', body) {
    const response = await SmartCityAuth.fetch(`api/${path}`, {method, headers: body === undefined ? {} : {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)});
    const value = await response.json().catch(() => null);
    if (!response.ok) throw new Error(value?.error || `Request failed (${response.status}). Please refresh.`);
    if (value === null) throw new Error('Unexpected server response. Please refresh.');
    return value;
}
async function act(action) {
    if (busy) return; const feedback = SmartCityFeedback.begin(); let outcome = 'success'; busy = true; controls(); $('#message').textContent = 'Working…';
    try { await action(); }
    catch (error) { outcome = 'error'; $('#message').textContent = error.name === 'TimeoutError' ? 'The request timed out. Refresh to check whether it was saved before retrying.' : error.message; }
    finally { busy = false; controls(); feedback.finish(outcome); }
}
function element(tag, text, css = '') { const node = document.createElement(tag); node.textContent = text; node.className = css; return node; }
function controls() {
    document.querySelectorAll('main button, main input, main select, main textarea').forEach(node => { node.disabled = busy || !ready; });
    $('#city-select').disabled = busy || !$('#city-select').options.length;
    $('#refresh').disabled = busy || !cityId;
    $('#refresh-detail').disabled = busy || !selected;
    $('#previous').disabled = busy || !ready || page === 0;
    $('#next').disabled = busy || !ready || !listing || (page + 1) * 25 >= listing.total;
    $('#history-previous').disabled = busy || !selected || historyPage === 0;
    $('#history-next').disabled = busy || !history || (historyPage + 1) * 25 >= history.total;
    const canEvaluate = ready && selected?.active && !dirty && zones.length > 0;
    $('#evaluation-form').querySelectorAll('button,input,select,textarea').forEach(node => { node.disabled = busy || !canEvaluate; });
    $('#evaluation-hint').textContent = !selected ? 'Save or select an active policy to begin.' : dirty ? 'Save your policy changes before evaluating.'
        : !selected.active ? 'This policy is inactive. Activate and save it to record new evaluations.'
        : !zones.length ? 'Add a district, street or building in City zones before evaluating.'
        : `Evaluating saved revision ${selected.version}. Required: ${selected.requiredFields.map(field => fieldNames[field]).join(', ')}. Other observations are optional.`;
}
function flatten(node, parent = '') {
    const label = parent ? `${parent} / ${node.name}` : node.name;
    return [{...node, label}, ...node.children.flatMap(child => flatten(child, label))];
}
function editor(row = null) {
    selected = row; dirty = false; historyPage = 0; history = null; $('#result').hidden = true;
    const canManage = ['CITY_MANAGER','SYSTEM_ADMIN'].includes(SmartCityAuth.user?.role);
    $('#editor-title').textContent = row ? (canManage ? 'Edit policy' : row.name) : (canManage ? 'New policy' : 'Select a saved policy');
    $('#revision').textContent = row ? `Saved revision ${row.version} · ${new Date(row.updatedAt).toLocaleString()}` : 'A new policy will belong to the selected city.';
    $('#policy-name').value = row?.name || ''; $('#category').value = row?.category || 'NOISE';
    $('#meaning').value = row?.trueMeaning || 'VIOLATION'; $('#expression').value = row?.expression || '';
    $('#active').checked = row?.active ?? true;
    $('#syntax').textContent = row ? `Rule: ${row.expression}. True means ${row.trueMeaning.toLowerCase()}. Parsed grouping: ${row.grouping}` : '';
    $('#evaluation-form').reset();
    for (const field of Object.keys(fieldNames)) $(`#${field}`).required = row?.requiredFields.includes(field) || false;
    renderHistory(); controls();
}
function renderList() {
    $('#policies').replaceChildren();
    for (const row of listing?.items || []) {
        const button = element('button', '', 'tree-node'); button.type = 'button'; button.setAttribute('aria-label', `Policy ${row.name}`);
        button.setAttribute('aria-pressed', String(row.id === selected?.id));
        const info = element('span', '', 'min-w-0'); info.append(element('span', row.name, 'block break-words font-semibold'),
            element('span', `${row.category} · revision ${row.version}`, 'mt-1 block text-xs text-slate-500'));
        button.append(info, element('span', row.active ? 'Active' : 'Inactive', 'badge'));
        button.addEventListener('click', () => act(async () => { await openPolicy(row.id); $('#message').textContent = `Opened ${row.name}.`; }));
        $('#policies').append(button);
    }
    if (!listing?.items.length) $('#policies').append(element('p', ready ? 'No policies on this page. Create one or start with an example.' : 'Choose a city.', 'py-3 text-sm text-slate-500'));
    $('#policy-count').textContent = `${listing?.total || 0} saved policies`;
    $('#page-label').textContent = `Page ${page + 1} of ${Math.max(1, Math.ceil((listing?.total || 0) / 25))}`;
}
function renderHistory() {
    $('#history').replaceChildren();
    for (const row of history?.items || []) {
        const card = element('details', '', 'rounded-lg border border-slate-200 p-4');
        card.append(element('summary', `${outcomes[row.outcome]} · revision ${row.policyVersion} · ${new Date(row.evaluatedAt).toLocaleString()}`, 'cursor-pointer text-sm font-semibold'));
        const zone = zones.find(item => item.id === row.zoneId)?.label || `Zone ${row.zoneId}`;
        card.append(element('p', `${row.policyName} · ${zone}`, 'mt-3 text-xs text-slate-500'),
            element('p', row.expression, 'mt-2 break-words font-mono text-sm'),
            element('p', `Observations: ${Object.entries(row.observations).map(([key,value]) => `${fieldNames[key]}: ${value}`).join(' · ')}`, 'mt-2 text-sm'),
            element('p', `Expression: ${row.matched ? 'true' : 'false'}. True means ${row.trueMeaning.toLowerCase()}.`, 'mt-2 text-xs text-slate-500'));
        if (row.note) card.append(element('p', row.note, 'mt-2 break-words text-sm'));
        $('#history').append(card);
    }
    if (!history?.items.length) $('#history').append(element('p', selected ? 'No saved evaluations on this page.' : 'Select a policy to see its history.', 'text-sm text-slate-500'));
    $('#history-page').textContent = `Page ${historyPage + 1} of ${Math.max(1, Math.ceil((history?.total || 0) / 25))}`;
}
async function loadList() { listing = await request(`cities/${cityId}/policies?page=${page}&pageSize=25`); renderList(); }
async function loadHistory() { history = await request(`cities/${cityId}/policies/${selected.id}/evaluations?page=${historyPage}&pageSize=25`); renderHistory(); }
async function openPolicy(id) {
    editor(null); editor(await request(`cities/${cityId}/policies/${id}`)); await loadHistory(); renderList();
}
async function loadCity(id) {
    cityId = id; ready = false; listing = null; zones = []; page = 0; editor(null); renderList(); $('#zone-select').replaceChildren();
    const tree = await request(`cities/${id}/zones`); zones = tree.children.flatMap(node => flatten(node));
    $('#zone-select').replaceChildren(...zones.map(zone => new Option(zone.label, String(zone.id))));
    await loadList(); ready = true; renderList(); $('#message').textContent = 'Policies loaded. Create a rule or select a saved policy.';
}
$('#city-select').addEventListener('change', () => act(() => loadCity(Number($('#city-select').value))));
$('#refresh').addEventListener('click', () => act(() => loadCity(cityId)));
$('#refresh-detail').addEventListener('click', () => act(async () => { await openPolicy(selected.id); $('#message').textContent = 'Loaded the saved policy.'; }));
$('#new-policy').addEventListener('click', () => { editor(null); renderList(); $('#message').textContent = 'New policy draft.'; });
for (const name of ['noise', 'parking']) $(`#${name}-example`).addEventListener('click', () => {
    editor(null); const noise = name === 'noise';
    $('#policy-name').value = noise ? 'Overnight noise limit' : 'Daytime parking permission';
    $('#category').value = noise ? 'NOISE' : 'PARKING'; $('#meaning').value = noise ? 'VIOLATION' : 'PERMITTED';
    $('#expression').value = noise ? 'noise > 65 AND (hour >= 22 OR hour < 6)' : 'hour >= 8 AND hour < 18 AND parkingMinutes <= 120';
    dirty = true; renderList(); controls(); $('#message').textContent = 'Example opened as a new draft. Review and save it.';
});
$('#policy-form').addEventListener('input', () => { dirty = true; $('#syntax').textContent = ''; $('#result').hidden = true; controls(); });
$('#validate').addEventListener('click', () => act(async () => {
    $('#syntax').textContent = '';
    const result = await request('policy-language/validate', 'POST', {expression: $('#expression').value});
    $('#syntax').textContent = `Valid rule. Required: ${result.requiredFields.map(field => fieldNames[field]).join(', ')}.\nParsed grouping: ${result.grouping}`;
    $('#message').textContent = 'Rule syntax is valid. This check does not save a policy or an evaluation.';
}));
$('#policy-form').addEventListener('submit', event => { event.preventDefault(); act(async () => {
    const body = {name: $('#policy-name').value, category: $('#category').value, expression: $('#expression').value,
        trueMeaning: $('#meaning').value, active: $('#active').checked};
    if (selected) body.version = selected.version;
    const row = await request(`cities/${cityId}/policies${selected ? '/' + selected.id : ''}`, selected ? 'PUT' : 'POST', body);
    if (!selected) page = Math.floor((listing?.total || 0) / 25);
    await loadList(); await openPolicy(row.id); $('#message').textContent = `Saved ${row.name}. Revision ${row.version} is ready.`;
}); });
$('#evaluation-form').addEventListener('submit', event => { event.preventDefault(); act(async () => {
    if (!selected || dirty || !selected.active) throw new Error('Save and activate the policy before evaluating.');
    const observations = {};
    for (const field of Object.keys(fieldNames)) if ($(`#${field}`).value !== '') observations[field] = Number($(`#${field}`).value);
    $('#result').hidden = true;
    const result = await request(`cities/${cityId}/policies/${selected.id}/evaluations`, 'POST', {
        version: selected.version, zoneId: Number($('#zone-select').value), observations, note: $('#observation-note').value});
    $('#result-title').textContent = outcomes[result.outcome];
    $('#result-description').textContent = `The rule evaluated to ${result.matched ? 'true' : 'false'}. Saved result #${result.id} uses revision ${result.policyVersion} of “${result.policyName}”.`;
    $('#result').hidden = false; historyPage = 0; await loadHistory(); $('#message').textContent = 'Evaluation saved with its original rule and observations.';
}); });
for (const [id, change] of [['previous',-1],['next',1]]) $(`#${id}`).addEventListener('click', () => act(async () => { page += change; await loadList(); $('#message').textContent = 'Policy page loaded.'; }));
for (const [id, change] of [['history-previous',-1],['history-next',1]]) $(`#${id}`).addEventListener('click', () => act(async () => { historyPage += change; await loadHistory(); $('#message').textContent = 'Result page loaded.'; }));
act(async () => {
    const cities = await request('cities'); $('#city-select').replaceChildren(...cities.map(city => new Option(city.name, String(city.id))));
    if (cities.length) await loadCity(cities[0].id);
    else { editor(null); renderList(); $('#message').textContent = 'Create a city in City zones first.'; }
});
