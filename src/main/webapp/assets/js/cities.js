const form = document.querySelector('#city-form');
const message = document.querySelector('#message');
const list = document.querySelector('#cities');
const nameInput = document.querySelector('#city-name');

async function loadCities() {
    const response = await fetch('api/cities');
    if (!response.ok) throw new Error('Could not load cities. Check the server and database.');
    const cities = await response.json();
    list.replaceChildren();
    for (const city of cities) {
        const item = document.createElement('li');
        item.textContent = `${city.name} (record ${city.id})`;
        list.append(item);
    }
    if (cities.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'No cities saved yet.';
        list.append(item);
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    message.textContent = 'Saving...';
    try {
        const response = await fetch('api/cities', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: nameInput.value})
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Could not save the city. Check the server and database.');
        }
        const city = await response.json();
        form.reset();
        message.textContent = `Saved ${city.name}.`;
        try {
            await loadCities();
        } catch {
            message.textContent += ' The list could not refresh; use Refresh cities.';
        }
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

document.querySelector('#refresh').addEventListener('click', () => {
    message.textContent = '';
    loadCities().catch(error => { message.textContent = error.message; });
});
loadCities().catch(error => { message.textContent = error.message; });
