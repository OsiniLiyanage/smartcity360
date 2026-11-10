import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Detect a partial deployment: a new page can otherwise load an older script
// that has no handlers for its newly added buttons.
const base = (process.argv[2] || 'http://localhost:9080/smartcity360').replace(/\/$/, '');
const files = ['streetlights.html', 'assets/js/streetlights.js', 'assets/css/streetlight-records.css'];
const normalize = text => text.replace(/\r\n/g, '\n');
const html = await readFile('src/main/webapp/streetlights.html', 'utf8');
for (const file of files) {
    const url = file.endsWith('.html') ? file : [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map(match => match[1]).find(value => value.split('?')[0] === file);
    assert.ok(url, `Page must reference ${file}`);
    const response = await fetch(`${base}/${url}`, {cache: 'no-store', signal: AbortSignal.timeout(15000)});
    assert.equal(response.status, 200, `Cannot load ${file}`);
    const live = normalize(await response.text());
    const local = normalize(await readFile(`src/main/webapp/${file}`, 'utf8'));
    assert.ok(live === local, `${file} differs from source. Finish the source changes, rebuild and redeploy together.`);
    console.log(`Deployed file matches source: ${file}`);
}
