const $ = selector => document.querySelector(selector);
const numbers = new Intl.NumberFormat(undefined, {maximumFractionDigits: 3});
const credentials = new Map(); // Memory only: never localStorage, URLs or logging.
let cityId = null, tree = null, meters = [], selectedMeter = null, readings = [], selectedReading = null;
let busy = false, ready = false;
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
    try { await action(); }
    catch (error) { outcome = 'error'; $('#message').textContent = error.name === 'TimeoutError'
        ? 'Request timed out. Refresh to check whether it was saved before retrying.' : error.message; }
    finally { busy = false; controls(); feedback.finish(outcome); }
}
function controls() {
    document.querySelectorAll('main button, main input, main select').forEach(control => { control.disabled = busy; });
    $('#city-select').disabled = busy || !$('#city-select').options.length;
    $('#meter-select').disabled = busy || !meters.length;
    $('#meter-form').querySelectorAll('button, input, select').forEach(control => {
        control.disabled = busy || !ready || !$('#building-select').options.length;
    });
    $('#workspace').querySelectorAll('button, input').forEach(control => { control.disabled = busy || !selectedMeter; });
    $('#recover').disabled = $('#tamper').disabled = busy || !selectedReading;
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
    $('#processing-order').textContent = parts.join(' → ');
    const missing = [];
    if (!$('#authentication').checked) missing.push('meter credential checking is off');
    if (!$('#encryption').checked) missing.push('payload encryption is off');
    $('#layer-warning').hidden = !missing.length;
    $('#layer-warning').textContent = `Demonstration mode: ${missing.join('; ')}.`;
}
function layers(value) {
    return [value.authentication ? 'Credential checked' : 'No credential check',
        value.compression ? 'GZIP' : 'No compression', value.encryption ? 'AES-GCM' : 'No encryption'].join(' · ');
}
function detail(value) {
    selectedReading = value;
    $('#reading-detail').hidden = !value;
    $('#recovery-status').textContent = '';
    $('#recovered').hidden = true; $('#recovered').textContent = '';
    if (!value) return;
    $('#detail-title').textContent = `Reading #${value.id} · ${numbers.format(value.usageKwh)} kWh`;
    $('#detail-layers').textContent = layers(value);
    const difference = value.encodedBytes - value.originalBytes;
    $('#detail-sizes').textContent = `Original: ${value.originalBytes} bytes → encoded: ${value.encodedBytes} bytes (${Math.abs(difference)} bytes ${difference >= 0 ? 'larger' : 'smaller'}).`;
    $('#payload').textContent = value.payloadBase64;
}
function renderReadings() {
    const list = $('#readings'); list.replaceChildren();
    if (!readings.length) list.textContent = 'No readings saved for this meter yet.';
    for (const reading of readings) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'tree-node';
        button.setAttribute('aria-pressed', String(reading.id === selectedReading?.id));
        button.textContent = `Reading #${reading.id} · ${numbers.format(reading.usageKwh)} kWh · ${new Date(reading.receivedAt).toLocaleString()}`;
        button.addEventListener('click', () => { if (!busy) { detail(reading); renderReadings(); } });
        list.append(button);
    }
    controls();
}
async function selectMeter(id) {
    selectedMeter = meters.find(meter => meter.id === id) || null;
    readings = []; detail(null); renderReadings();
    $('#workspace').hidden = !selectedMeter; $('#empty').hidden = !!selectedMeter;
    $('#credential').value = selectedMeter ? credentials.get(selectedMeter.id) || '' : '';
    $('#credential').type = 'password'; $('#show-credential').checked = false;
    totals();
    if (!selectedMeter) return;
    $('#meter-select').value = String(selectedMeter.id);
    $('#meter-title').textContent = selectedMeter.name;
    $('#usage').value = '';
    readings = await request(`cities/${cityId}/meters/${id}/readings`);
    detail(readings[0] || null); renderReadings();
}
async function loadCity(id, preferredMeter = null) {
    cityId = id; ready = false; tree = null; meters = []; selectedMeter = null;
    $('#meter-select').replaceChildren(); $('#building-select').replaceChildren();
    await selectMeter(null);
    if (id === null) { $('#register-hint').textContent = 'Create a city and buildings in City zones.'; return; }
    [tree, meters] = await Promise.all([request(`cities/${id}/zones`), request(`cities/${id}/meters`)]);
    ready = true;
    const buildings = nodes(tree).filter(node => node.type === 'BUILDING' && !meters.some(meter => meter.buildingId === node.id));
    $('#building-select').replaceChildren(...buildings.map(node => new Option(node.label, String(node.id))));
    $('#register-hint').textContent = buildings.length ? 'One meter per building. Registration issues a new credential once.' : 'No unregistered buildings. Add another building in City zones.';
    $('#meter-select').replaceChildren(...meters.map(meter => new Option(meter.name, String(meter.id))));
    await selectMeter(meters.find(meter => meter.id === preferredMeter)?.id ?? meters[0]?.id ?? null);
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
$('#meter-select').addEventListener('change', () => act(async () => {
    await selectMeter(Number($('#meter-select').value)); $('#message').textContent = 'Meter loaded.';
}));
$('#refresh').addEventListener('click', () => act(async () => {
    await loadCities(); $('#message').textContent = 'Meters refreshed.';
}));
$('#credential').addEventListener('input', () => { if (selectedMeter) credentials.set(selectedMeter.id, $('#credential').value); });
$('#show-credential').addEventListener('change', () => { $('#credential').type = $('#show-credential').checked ? 'text' : 'password'; });
for (const id of ['#authentication', '#compression', '#encryption']) $(id).addEventListener('change', processing);
$('#meter-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        const issued = await request(`cities/${cityId}/meters`, 'POST', {buildingId: Number($('#building-select').value), name: $('#meter-name').value});
        credentials.set(issued.meter.id, issued.credential); $('#meter-form').reset();
        try { await loadCity(cityId, issued.meter.id); }
        catch { throw new Error('Meter registered. The view could not refresh; use Refresh meters. Its new credential is retained in this tab.'); }
        $('#message').textContent = 'Meter registered. Its new credential is filled in below; save it privately before leaving.';
    });
});
$('#replace-credential').addEventListener('click', () => act(async () => {
    const issued = await request(`cities/${cityId}/meters/${selectedMeter.id}/credential`, 'POST');
    credentials.set(selectedMeter.id, issued.credential); $('#credential').value = issued.credential;
    $('#credential').type = 'password'; $('#show-credential').checked = false;
    $('#message').textContent = 'New credential issued and filled in. The previous credential is no longer accepted.';
}));
$('#reading-form').addEventListener('submit', event => {
    event.preventDefault(); act(async () => {
        const value = await request(`cities/${cityId}/meters/${selectedMeter.id}/readings`, 'POST', {
            usageKwh: Number($('#usage').value), credential: $('#credential').value,
            authentication: $('#authentication').checked, compression: $('#compression').checked, encryption: $('#encryption').checked
        });
        readings.unshift(value); detail(value); renderReadings();
        try { tree = await request(`cities/${cityId}/zones`); totals(); }
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
act(async () => { await loadCities(); $('#message').textContent = 'Choose a meter or register one for a building.'; });
