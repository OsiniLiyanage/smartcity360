const $ = selector => document.querySelector(selector);
const labels = {CITY: 'City', DISTRICT: 'District', STREET: 'Street', BUILDING: 'Building'};
const nextType = {CITY: 'DISTRICT', DISTRICT: 'STREET', STREET: 'BUILDING'};
const states = {EMPTY: 'No buildings', ON: 'On', OFF: 'Off', MIXED: 'Mixed'};
const numbers = new Intl.NumberFormat(undefined, {maximumFractionDigits: 3});
let cityId = null;
let root = null;
let selected = null;
let busy = false;

async function request(path, method = 'GET', body) {
    const response = await SmartCityAuth.fetch(`api/${path}`, {
        method,
        headers: body === undefined ? {} : {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || `Request failed (${response.status}). Please try again.`);
    if (!result) throw new Error('The server returned an unexpected response. Please refresh.');
    return result;
}

// Serialize page actions so a slow response cannot overwrite a different city's view.
async function act(operation) {
    if (busy) return;
    busy = true;
    $('#message').textContent = 'Working…';
    syncControls();
    try { await operation(); }
    catch (error) { $('#message').textContent = error.message; }
    finally { busy = false; syncControls(); }
}

function syncControls() {
    document.querySelectorAll('button, input, select').forEach(control => { control.disabled = busy; });
    $('#city-select').disabled = busy || $('#city-select').options.length === 0;
    for (const id of ['#power-on', '#power-off']) $(id).disabled = busy || !selected?.buildingCount;
}

function key(node) { return `${node.type}:${node.id}`; }
function find(node, target, trail = []) {
    if (!node) return null;
    const path = [...trail, node.name];
    if (key(node) === target) return {node, path};
    for (const child of node.children) {
        const found = find(child, target, path);
        if (found) return found;
    }
    return null;
}

function render(tree, preferredKey = selected && key(selected)) {
    root = tree;
    const found = find(root, preferredKey) || (root && {node: root, path: [root.name]});
    selected = found?.node || null;
    $('#workspace').hidden = !selected;
    $('#empty-state').hidden = !!selected;
    $('#hierarchy').replaceChildren();
    if (!selected) {
        $('#hierarchy').textContent = 'Choose or create a city to begin.';
        return;
    }
    function branch(node) {
        const wrapper = document.createElement('div');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tree-node';
        button.setAttribute('aria-pressed', String(key(node) === key(selected)));
        const name = document.createElement('span');
        name.className = 'min-w-0 break-words';
        name.textContent = node.name;
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = labels[node.type];
        button.append(name, badge);
        button.addEventListener('click', () => {
            if (busy) return;
            render(root, key(node));
            $('#message').textContent = '';
            // Rendering replaces the old button; restore focus to its replacement.
            $('#hierarchy button[aria-pressed="true"]').focus({preventScroll: true});
        });
        wrapper.append(button);
        if (node.children.length) {
            const children = document.createElement('div');
            children.className = 'tree-children';
            for (const child of node.children) children.append(branch(child));
            wrapper.append(children);
        }
        return wrapper;
    }
    $('#hierarchy').append(branch(root));
    $('#selected-type').textContent = labels[selected.type];
    $('#selected-name').textContent = selected.name;
    $('#selected-path').textContent = found.path.join(' / ');
    $('#usage-total').textContent = numbers.format(selected.usageKwh);
    $('#building-count').textContent = numbers.format(selected.buildingCount);
    $('#power-state').textContent = states[selected.powerState];
    $('#powered-count').textContent = `${selected.poweredCount} of ${selected.buildingCount} powered on`;
    $('#power-scope').textContent = selected.buildingCount
        ? `Applies to ${selected.buildingCount} building${selected.buildingCount === 1 ? '' : 's'} in ${selected.name}.`
        : 'Add a building below this area to use power controls.';
    const childType = nextType[selected.type];
    $('#add-panel').hidden = !childType;
    $('#usage-panel').hidden = selected.type !== 'BUILDING';
    $('#zone-form').reset();
    if (childType) {
        $('#add-heading').textContent = `Add a ${labels[childType].toLowerCase()} to ${selected.name}`;
        $('#zone-name-label').textContent = `${labels[childType]} name`;
        $('#add-zone').textContent = `Add ${labels[childType].toLowerCase()}`;
    }
    $('#usage-input').value = selected.type === 'BUILDING' ? selected.usageKwh : '';
    syncControls();
}

async function loadTree(id) {
    // Clear old controls if loading fails; never leave another city's tree actionable.
    cityId = id;
    render(null);
    if (id !== null) render(await request(`cities/${id}/zones`), null);
}

async function loadCities(preferredId = cityId) {
    const cities = await request('cities');
    const select = $('#city-select');
    select.replaceChildren();
    for (const city of cities) select.add(new Option(city.name, String(city.id)));
    const chosen = cities.find(city => city.id === preferredId) || cities[0];
    if (chosen) select.value = String(chosen.id);
    await loadTree(chosen?.id ?? null);
}

$('#city-select').addEventListener('change', () => act(async () => {
    await loadTree(Number($('#city-select').value));
    $('#message').textContent = 'City loaded.';
}));
$('#refresh').addEventListener('click', () => act(async () => {
    await loadCities();
    $('#message').textContent = 'Cities refreshed.';
}));
$('#city-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        const city = await request('cities', 'POST', {name: $('#city-name').value});
        $('#city-form').reset();
        try { await loadCities(city.id); }
        catch { throw new Error(`Saved ${city.name}, but the view could not refresh. Use Refresh cities.`); }
        $('#message').textContent = `Saved ${city.name}. Add its first district below.`;
    });
});
$('#zone-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        const name = $('#zone-name').value;
        render(await request(`cities/${cityId}/zones`, 'POST', {
            name, type: nextType[selected.type], parentId: selected.type === 'CITY' ? null : selected.id
        }));
        $('#message').textContent = `Added ${name.trim()}. Select it in the city structure to continue.`;
    });
});
$('#usage-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        render(await request(`cities/${cityId}/zones/${selected.id}/usage`, 'PUT', {usageKwh: Number($('#usage-input').value)}));
        $('#message').textContent = 'Usage saved. All parent totals have been recalculated.';
    });
});
for (const [id, on] of [['#power-on', true], ['#power-off', false]]) {
    $(id).addEventListener('click', () => act(async () => {
        render(await request(`cities/${cityId}/zones/power`, 'PUT', {
            zoneId: selected.type === 'CITY' ? null : selected.id, powerOn: on
        }));
        $('#message').textContent = `Power switched ${on ? 'on' : 'off'} for ${selected.name}.`;
    }));
}
act(async () => {
    await loadCities();
    $('#message').textContent = root ? 'City ready. Select an area to begin.' : 'Create your first city to begin.';
});
