const $ = selector => document.querySelector(selector);
const names = {LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', LOCAL_STAFF: 'Local staff',
    SUPERVISOR: 'Supervisor', CITY_MANAGER: 'City manager', ASSIGNED: 'Assigned',
    UNASSIGNED: 'Needs assignment', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
    RESIDENT: 'Resident submission', DEMO_OPERATOR: 'Demo operator', SUBMITTED: 'Submitted',
    FORWARDED: 'Forwarded', UNHANDLED: 'Unhandled', STATUS_CHANGED: 'Work updated',
    REOPENED: 'Reopened', ESCALATED: 'Escalated'};
let cityId = null;
let ready = false;
let busy = false;
let complaints = [];
let selected = null;

async function request(path, method = 'GET', body) {
    const response = await fetch(`api/${path}`, {
        method, headers: body === undefined ? {} : {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || `Request failed (${response.status}). Please try again.`);
    if (result === null) throw new Error('Unexpected server response. Please refresh.');
    return result;
}
async function act(operation) {
    if (busy) return;
    busy = true;
    $('#message').textContent = 'Working…';
    controls();
    try { await operation(); }
    catch (error) {
        $('#message').textContent = error.name === 'TimeoutError'
            ? 'The request timed out. Refresh to check whether it was saved before trying again.' : error.message;
    } finally { busy = false; controls(); }
}
function controls() {
    document.querySelectorAll('button, input, textarea, select').forEach(element => { element.disabled = busy; });
    $('#city-select').disabled = busy || !$('#city-select').options.length;
    $('#complaint-form').querySelectorAll('button, input, textarea, select').forEach(element => { element.disabled = busy || !ready; });
    $('#refresh-detail').disabled = busy || !selected;
}
function element(tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}
function list() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    const status = $('#status-filter').value;
    const shown = complaints.filter(item => (!status || item.status === status)
        && `${item.id} ${item.subject}`.toLocaleLowerCase().includes(query));
    $('#queue-count').textContent = `${shown.length} of ${complaints.length} complaints`;
    const container = $('#complaint-list');
    container.replaceChildren();
    if (!shown.length) container.append(element('p', ready ? 'No complaints match this view.' : 'Choose a city to load complaints.', 'py-5 text-sm text-slate-500'));
    for (const item of shown) {
        const button = element('button', '', 'tree-node');
        button.type = 'button';
        button.setAttribute('aria-pressed', String(item.id === selected?.id));
        button.setAttribute('aria-label', `Complaint ${item.id}: ${item.subject}`);
        const text = element('span', '', 'min-w-0');
        text.append(element('span', `#${item.id} · ${item.subject}`, 'block break-words font-semibold'),
            element('span', `${names[item.severity]} · ${names[item.assignedTo] || 'No team assigned'}`, 'mt-1 block text-xs text-slate-500'));
        button.append(text, element('span', names[item.status], 'badge'));
        button.addEventListener('click', () => act(async () => {
            // Avoid leaving a different complaint actionable while this detail loads.
            detail(null);
            detail(await request(`cities/${cityId}/complaints/${item.id}`));
            list();
            $('#message').textContent = `Opened complaint #${item.id}.`;
        }));
        container.append(button);
    }
    controls();
}
function detail(item) {
    selected = item;
    $('#complaint-detail').hidden = !item;
    $('#detail-empty').hidden = !!item;
    if (!item) return;
    $('#detail-reference').textContent = `Complaint #${item.id}`;
    $('#detail-subject').textContent = item.subject;
    $('#detail-meta').textContent = `${item.residentName} · ${item.zoneName} · Submitted ${new Date(item.createdAt).toLocaleString()}`;
    $('#detail-description').textContent = item.description;
    $('#detail-severity').textContent = names[item.severity];
    $('#detail-team').textContent = names[item.assignedTo] || 'No team assigned';
    $('#detail-status').textContent = names[item.status];
    $('#work-panel').hidden = item.status === 'UNASSIGNED';
    $('#work-action').textContent = item.status === 'RESOLVED' ? 'Reopen complaint'
        : item.status === 'IN_PROGRESS' ? 'Mark resolved' : 'Start work';
    $('#work-form').reset();
    const levels = ['LOW', 'MEDIUM', 'HIGH'];
    const higher = levels.slice(levels.indexOf(item.severity) + 1);
    $('#escalation-panel').hidden = !higher.length || item.status === 'RESOLVED';
    $('#escalation-severity').replaceChildren(...higher.map(level => new Option(names[level], level)));
    $('#escalation-note').value = '';
    $('#history').replaceChildren();
    for (const event of item.history) {
        const entry = element('li', '', 'text-sm');
        entry.append(element('p', `${names[event.type] || event.type} · ${names[event.actor] || event.actor}`, 'font-semibold'),
            element('p', event.message, 'mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600'),
            element('p', new Date(event.occurredAt).toLocaleString(), 'mt-1 text-xs text-slate-500'));
        $('#history').append(entry);
    }
    controls();
}
async function loadCity(id, keepId = null) {
    cityId = id;
    ready = false;
    complaints = [];
    detail(null);
    list();
    $('#area-select').replaceChildren(new Option('Whole city', ''));
    if (id === null) return;
    const [tree, records] = await Promise.all([request(`cities/${id}/zones`), request(`cities/${id}/complaints`)]);
    function areas(node, parent = '') {
        const path = parent ? `${parent} / ${node.name}` : node.name;
        if (node.type !== 'CITY') $('#area-select').add(new Option(path, String(node.id)));
        for (const child of node.children) areas(child, node.type === 'CITY' ? '' : path);
    }
    areas(tree);
    complaints = records;
    ready = true;
    list();
    if (keepId && records.some(item => item.id === keepId)) {
        detail(await request(`cities/${id}/complaints/${keepId}`));
        list();
    }
}
async function loadCities() {
    const records = await request('cities');
    const chosen = records.find(item => item.id === cityId) || records[0];
    $('#city-select').replaceChildren(...records.map(item => new Option(item.name, String(item.id))));
    if (chosen) $('#city-select').value = String(chosen.id);
    await loadCity(chosen?.id ?? null, selected?.id);
}
async function saved(item, message) {
    detail(item);
    try { complaints = await request(`cities/${cityId}/complaints`); list(); }
    catch { message += ' Saved successfully, but the queue could not refresh. Use Refresh complaints.'; }
    $('#message').textContent = message;
}
$('#city-select').addEventListener('change', () => act(async () => {
    $('#complaint-form').reset();
    await loadCity(Number($('#city-select').value));
    $('#message').textContent = 'Complaints loaded.';
}));
$('#refresh').addEventListener('click', () => act(async () => {
    await loadCities();
    $('#message').textContent = 'Complaints refreshed.';
}));
$('#refresh-detail').addEventListener('click', () => act(async () => {
    await saved(await request(`cities/${cityId}/complaints/${selected.id}`), 'Details refreshed.');
}));
$('#status-filter').addEventListener('change', list);
$('#search').addEventListener('input', list);
$('#complaint-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        const item = await request(`cities/${cityId}/complaints`, 'POST', {
            residentName: $('#resident-name').value, subject: $('#subject').value,
            description: $('#description').value, severity: $('#severity').value,
            zoneId: $('#area-select').value ? Number($('#area-select').value) : null
        });
        $('#complaint-form').reset();
        $('#status-filter').value = '';
        $('#search').value = '';
        await saved(item, `Complaint #${item.id} saved. ${item.assignedTo ? `Assigned to ${names[item.assignedTo]}.` : 'Needs manual assignment.'}`);
    });
});
$('#work-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        const target = selected.status === 'IN_PROGRESS' ? 'RESOLVED' : 'IN_PROGRESS';
        const item = await request(`cities/${cityId}/complaints/${selected.id}/status`, 'PUT', {
            status: target, note: $('#work-note').value, version: selected.version
        });
        await saved(item, `Complaint #${item.id}: ${names[item.status]}.`);
    });
});
$('#escalate-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        const item = await request(`cities/${cityId}/complaints/${selected.id}/escalate`, 'PUT', {
            severity: $('#escalation-severity').value, note: $('#escalation-note').value, version: selected.version
        });
        await saved(item, `Complaint #${item.id} escalated and assigned to ${names[item.assignedTo] || 'manual review'}.`);
    });
});
act(async () => {
    await loadCities();
    $('#message').textContent = ready ? 'Choose a complaint or submit a new one.' : 'Create a city in City zones to begin.';
});
