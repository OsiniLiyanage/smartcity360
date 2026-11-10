const $ = selector => document.querySelector(selector);
const names = {LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', LOCAL_STAFF: 'Local staff',
    SUPERVISOR: 'Supervisor', CITY_MANAGER: 'City manager', ASSIGNED: 'Assigned',
    UNASSIGNED: 'Needs assignment', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
    RESIDENT: 'Resident submission', DEMO_OPERATOR: 'Demo operator', SUBMITTED: 'Submitted',
    FORWARDED: 'Forwarded', UNHANDLED: 'Unhandled', STATUS_CHANGED: 'Work updated',
    REOPENED: 'Reopened', ESCALATED: 'Escalated', EMPLOYEE_ASSIGNED:'Employee assigned',EMPLOYEE_UNASSIGNED:'Allocation cleared',
    RESIDENT_MESSAGE:'Resident message',STAFF_REPLY:'Public staff reply',REOPEN_REQUESTED:'Reopening requested',REOPEN_APPROVED:'Reopening approved',REOPEN_DECLINED:'Reopening declined'};
let cityId = Number(new URLSearchParams(location.search).get('city')) || null;
let ready = false;
let busy = false;
let complaints = [];
let selected = null;
let recordPage = 0, filteredCount = 0;
let candidatePage=0, candidatesComplete=false;

async function request(path, method = 'GET', body) {
    const response = await SmartCityAuth.fetch(`api/${path}`, {
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
    const feedback = SmartCityFeedback.begin(); let outcome = 'success';
    busy = true;
    $('#message').textContent = 'WorkingÃ¢â‚¬Â¦';
    delete $('#message').dataset.error;
    controls();
    try { await operation(); }
    catch (error) {
        outcome = 'error';
        $('#message').dataset.error='true';
        $('#message').textContent = error.name === 'TimeoutError'
            ? 'The request timed out. Refresh to check whether it was saved before trying again.' : error.message;
    } finally { busy = false; controls(); feedback.finish(outcome); }
}
function controls() {
    document.querySelectorAll('main button, main input, main textarea, main select').forEach(element => { element.disabled = busy; });
    $('#city-select').disabled = busy || !$('#city-select').options.length;
    $('#complaint-form').querySelectorAll('button, input, textarea, select').forEach(element => { element.disabled = busy || !ready; });
    $('#refresh-detail').disabled = busy || !selected;
    $('#load-assignees').disabled=busy||candidatesComplete;
    $('#new-complaint').disabled=busy||!ready;
    $('#case-previous').disabled=busy||recordPage===0;
    $('#case-next').disabled=busy||(recordPage+1)*25>=filteredCount;
}
function element(tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}
function openDialog(dialog, opener) {
    const stack=document.querySelector('.feedback-stack');
    if(stack)dialog.append(stack);
    dialog.addEventListener('close',()=>{
        if(stack?.parentElement===dialog)document.body.append(stack);
        requestAnimationFrame(()=>{
            if(!document.querySelector('dialog[open]')) {
                if(opener?.isConnected&&!opener.disabled)opener.focus();else $('#search').focus();
            }
        });
    },{once:true});
    dialog.showModal();
    dialog.querySelector('[data-dialog-title]').focus();
}
for(const dialog of document.querySelectorAll('.record-dialog')) {
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
    dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!busy)dialog.close();}));
}
function list() {
    const query = $('#search').value.trim().toLocaleLowerCase().replace(/^#/, '');
    const status = $('#status-filter').value, severity=$('#severity-filter').value;
    const shown = complaints.filter(item => (!status || item.status === status) && (!severity || item.severity === severity)
        && `${item.id} ${item.subject}`.toLocaleLowerCase().includes(query));
    filteredCount=shown.length;
    recordPage=Math.min(recordPage,Math.max(0,Math.ceil(filteredCount/25)-1));
    const active=[names[status],names[severity]].filter(Boolean);
    $('#queue-count').textContent = `${shown.length} of ${complaints.length} complaints${active.length?' | '+active.join(' | '):''}`;
    $('#case-filter-toggle').textContent=`Filters${active.length?' ('+active.length+')':''}`;
    $('#case-page-info').textContent=`${shown.length?recordPage*25+1:0}-${Math.min((recordPage+1)*25,shown.length)} of ${shown.length} | Page ${recordPage+1} of ${Math.max(1,Math.ceil(shown.length/25))}`;
    const container = $('#complaint-list'); container.replaceChildren();
    if (!shown.length) {
        const row=element('tr',''),cell=element('td',ready?'No complaints match these filters.':'Choose a city to load complaints.');
        cell.colSpan=7;row.append(cell);container.append(row);
    }
    for (const item of shown.slice(recordPage*25,(recordPage+1)*25)) {
        const row=element('tr',''),reference=element('td',''),button=element('button',`#${item.id}`,'record-edit');
        button.type='button';button.setAttribute('aria-label',`Open complaint ${item.id}: ${item.subject}`);
        button.addEventListener('click',()=>{
            detail(null);$('#detail-empty').textContent='Loading complaint...';
            openDialog($('#case-dialog'),button);
            act(async()=>{
                try {detail(await request(`cities/${cityId}/complaints/${item.id}`));}
                catch(error){$('#detail-empty').textContent='Could not load this complaint. Close this dialog and try again.';throw error;}
                $('#message').textContent=`Opened complaint #${item.id}.`;
            });
        });
        reference.append(button);
        const statusCell=element('td','');statusCell.append(element('span',names[item.status],'record-badge'+(item.status==='RESOLVED'?' active':'')));
        row.append(reference,element('td',item.subject),element('td',item.zoneId===null?'Whole city':([...$('#area-select').options].find(option=>option.value===String(item.zoneId))?.textContent||`Area #${item.zoneId}`)),element('td',names[item.severity]),
            element('td',names[item.assignedTo]||'Not assigned'),statusCell,element('td',new Date(item.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})));
        container.append(row);
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
    $('#detail-meta').textContent = `${item.residentName} Ã‚Â· ${item.zoneName} Ã‚Â· Submitted ${new Date(item.createdAt).toLocaleString()}`;
    $('#detail-description').textContent = item.description;
    $('#detail-severity').textContent = names[item.severity];
    $('#detail-team').textContent = names[item.assignedTo] || 'No team assigned';
    $('#detail-status').textContent = names[item.status];
    $('#reopen-pending').hidden=!item.reopenRequested;
    $('#assignment-panel').hidden=!item.canAssign;
    $('#public-message-panel').hidden=!item.canMessage;
    $('#public-message-panel h3').textContent=SmartCityAuth.user.role==='RESIDENT'?'Contact your city team':'Conversation with the resident';
    $('#request-reopen-panel').hidden=!item.canRequestReopen;
    $('#review-reopen-panel').hidden=!item.canReviewReopen;
    for(const form of ['assignment','public-message','request-reopen','review-reopen'])$(`#${form}-form`).reset();
    candidatePage=0;candidatesComplete=false;
    $('#load-assignees').textContent='Load eligible employees';
    $('#assigned-user').replaceChildren(new Option('No individual employee',''));
    if(item.assignee){$('#assigned-user').add(new Option(item.assignee.displayName+(item.assignee.eligible?'':' (no longer eligible)'),String(item.assignee.id)));$('#assigned-user').value=String(item.assignee.id);}
    $('#current-assignee').textContent=item.assignee?`Currently allocated to ${item.assignee.displayName}.${item.assignee.eligible?'':' This account is no longer eligible. Reassign or clear this allocation.'}`:'No individual employee is allocated yet.';
    $('#work-panel').hidden = !item.canWork || item.status === 'UNASSIGNED';
    $('#work-action').textContent = item.status === 'RESOLVED' ? 'Reopen complaint'
        : item.status === 'IN_PROGRESS' ? 'Mark resolved' : 'Start work';
    $('#work-form').reset();
    const levels = ['LOW', 'MEDIUM', 'HIGH'];
    const higher = levels.slice(levels.indexOf(item.severity) + 1);
    $('#escalation-panel').hidden = !item.canWork || !higher.length || item.status === 'RESOLVED';
    $('#escalation-severity').replaceChildren(...higher.map(level => new Option(names[level], level)));
    $('#escalation-note').value = '';
    $('#history').replaceChildren();
    for (const event of item.history) {
        const entry = element('li', '', 'text-sm');
        entry.append(element('p', `${names[event.type] || event.type} Ã‚Â· ${names[event.actor] || event.actor}`, 'font-semibold'),
            element('p', event.message, 'mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600'),
            element('p', new Date(event.occurredAt).toLocaleString(), 'mt-1 text-xs text-slate-500'));
        $('#history').append(entry);
    }
    controls();
}
async function loadCity(id, keepId = null) {
    cityId = id;
    recordPage = 0;
    ready = false;
    complaints = [];
    detail(null);
    list();
    $('#area-select').replaceChildren(new Option('Whole city', ''));
    if (id === null) return;
    const [tree, records] = await Promise.all([request(`cities/${id}/areas`), request(`cities/${id}/complaints`)]);
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
    await loadCity(chosen?.id ?? null, selected?.id || Number(new URLSearchParams(location.search).get("complaint")) || null);
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
for(const id of ['status-filter','severity-filter'])$(`#${id}`).addEventListener('change',()=>{recordPage=0;list();});
$('#search').addEventListener('input',()=>{recordPage=0;list();});
$('#case-filter-toggle').addEventListener('click',()=>{const show=$('#case-filters').hidden;$('#case-filters').hidden=!show;$('#case-filter-toggle').setAttribute('aria-expanded',String(show));});
$('#clear-case-filters').addEventListener('click',()=>{for(const id of ['search','status-filter','severity-filter'])$(`#${id}`).value='';recordPage=0;list();});
for(const [id,delta] of [['case-previous',-1],['case-next',1]])$(`#${id}`).addEventListener('click',()=>{recordPage+=delta;list();});
$('#new-complaint').addEventListener('click',()=>{
    if(SmartCityAuth.user?.role!=='RESIDENT'||!ready)return;
    $('#complaint-form').reset();$('#submit-city').textContent=`City: ${$('#city-select').selectedOptions[0].textContent}`;
    openDialog($('#submit-dialog'),$('#new-complaint'));
});
$('#complaint-form').addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
        const item = await request(`cities/${cityId}/complaints`, 'POST', {
            subject: $('#subject').value,
            description: $('#description').value, severity: $('#severity').value,
            zoneId: $('#area-select').value ? Number($('#area-select').value) : null
        });
        $('#complaint-form').reset();
        $('#status-filter').value = '';
        $('#severity-filter').value = '';
        $('#search').value = '';
        recordPage=0;
        await saved(item, `Complaint #${item.id} saved. ${item.assignedTo ? `Assigned to ${names[item.assignedTo]}.` : 'Needs manual assignment.'}`);
        $('#submit-dialog').close();
        openDialog($('#case-dialog'),$('#new-complaint'));
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
$('#load-assignees').addEventListener('click',()=>act(async()=>{
    const rows=await request(`cities/${cityId}/complaints/${selected.id}/assignees?page=${candidatePage}`);
    for(const person of rows)if(![...$('#assigned-user').options].some(o=>o.value===String(person.id)))$('#assigned-user').add(new Option(`${person.displayName} (${names[person.role]})`,String(person.id)));
    candidatePage++;candidatesComplete=rows.length<25;$('#load-assignees').textContent=candidatesComplete?'All eligible employees loaded':'Load more employees';
    $('#message').textContent=rows.length?'Eligible employees loaded. Choose an employee and enter a reason.':'No more eligible employees. An admin can check staff city and role assignments.';
}));
for(const [form,path,method,payload,notice]of [
    ['assignment','assignment','PUT',()=>({assignedUserId:$('#assigned-user').value?Number($('#assigned-user').value):null,note:$('#assignment-note').value}),'Employee assignment saved.'],
    ['public-message','messages','POST',()=>({message:$('#public-message').value}),'Message sent. It is visible to the resident and authorized staff.'],
    ['request-reopen','reopen-request','POST',()=>({note:$('#reopen-reason').value}),'Reopening requested. The city team will review it.'],
    ['review-reopen','reopen-request','PUT',()=>({approve:$('#reopen-decision').value==='approve',note:$('#review-explanation').value}),'Review decision saved with its public explanation.']
])$(`#${form}-form`).addEventListener('submit',event=>{event.preventDefault();act(async()=>{
    const item=await request(`cities/${cityId}/complaints/${selected.id}/${path}`,method,{...payload(),version:selected.version});await saved(item,notice);
});});
act(async () => {
    await loadCities();
    if(selected)openDialog($('#case-dialog'),$('#search'));
    $('#message').textContent = ready ? '' : 'No accessible cities are available.';
});
