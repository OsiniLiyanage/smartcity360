(() => {
const $=selector=>document.querySelector(selector);
const fieldNames={noise:'noise (dB)',hour:'local hour',parkingMinutes:'parking minutes'};
const outcomes={VIOLATION:'Violation detected',NO_VIOLATION:'No violation under this rule',PERMITTED:'Activity permitted',NOT_PERMITTED:'Activity not permitted'};
let cityId=null,selected=null,zones=[],rows=[],page=0,historyPage=0,history=null,busy=false,ready=false,dirty=false;
const dialogs=[];
const canManage=()=>['CITY_MANAGER','SYSTEM_ADMIN'].includes(SmartCityAuth.user?.role);
async function request(path,method='GET',body){
 const response=await SmartCityAuth.fetch(`api/${path}`,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const value=await response.json().catch(()=>null);
 if(!response.ok)throw Error(value?.error||`Request failed (${response.status}). Please refresh.`);
 if(value===null)throw Error('Unexpected server response. Please refresh.');return value;
}
async function act(action){
 if(busy)return;const feedback=SmartCityFeedback.begin();let outcome='success';busy=true;controls();$('#message').textContent='Working…';
 try{await SmartCityAuth.ready;await action();}catch(error){outcome='error';$('#message').textContent=error.name==='TimeoutError'?'The request timed out. Refresh to check whether it was saved before retrying.':error.message;}
 finally{busy=false;controls();feedback.finish(outcome);}
}
function element(tag,text,css=''){const node=document.createElement(tag);node.textContent=text;node.className=css;return node;}
function filtered(){const query=$('#policy-search').value.trim().toLocaleLowerCase(),category=$('#category-filter').value,status=$('#status-filter').value;
 return rows.filter(row=>(!query||`${row.name} ${row.expression}`.toLocaleLowerCase().includes(query))&&(!category||row.category===category)&&(!status||row.active===(status==='active')));}
function controls(){
 document.querySelectorAll('main button,main input,main select,main textarea').forEach(node=>{if(!node.closest('.feedback-stack'))node.disabled=busy||!ready;});
 document.querySelectorAll('[data-close]').forEach(node=>node.disabled=busy);
 $('#city-select').disabled=busy||!$('#city-select').options.length;$('#refresh').disabled=busy||!cityId;
 $('#new-policy').disabled=busy||!ready||!canManage();$('#edit-policy').disabled=busy||!selected||!canManage();$('#refresh-detail').disabled=busy||!selected;
 $('#previous').disabled=busy||page===0;$('#next').disabled=busy||(page+1)*25>=filtered().length;
 $('#history-previous').disabled=busy||!selected||historyPage===0;$('#history-next').disabled=busy||!history||(historyPage+1)*25>=history.total;
 const canEvaluate=ready&&selected?.active&&!dirty&&zones.length>0;$('#evaluate-policy').disabled=busy||!canEvaluate;
 $('#evaluation-form').querySelectorAll('button:not([data-close]),input,select,textarea').forEach(node=>node.disabled=busy||!canEvaluate);
 const hint=!selected?'Select an active policy to begin.':dirty?'Save or cancel your policy changes before evaluating.':!selected.active?'This policy is inactive. A manager must activate it before new evaluations.':!zones.length?'Add a city zone before evaluating.':`Using saved revision ${selected.version}. Required: ${selected.requiredFields.map(field=>fieldNames[field]).join(', ')}. Other observations are optional.`;
 $('#evaluation-hint').textContent=hint;$('#detail-hint').textContent=hint;
}
function openDialog(dialog,opener=document.activeElement){
 if(dialog.open)return;dialogs.push(dialog);const stack=document.querySelector('.feedback-stack');if(stack)dialog.append(stack);
 dialog.addEventListener('close',()=>{
  const index=dialogs.indexOf(dialog);if(index>=0)dialogs.splice(index,1);const parent=dialogs.filter(node=>node.open).at(-1);if(stack)(parent||document.body).append(stack);
  if(dialog.id==='editor-dialog'){fillEditor(selected);controls();}
  requestAnimationFrame(()=>{const top=dialogs.filter(node=>node.open).at(-1);if(top&&!top.contains(opener))return;
   if(opener?.isConnected&&!opener.disabled)opener.focus();else(top?.querySelector('[data-close]')||$('#policy-search')).focus();});
 },{once:true});
 dialog.showModal();requestAnimationFrame(()=>{if(dialog.open)(dialog.querySelector('input:not(:disabled),select:not(:disabled)')||dialog.querySelector('[data-close]'))?.focus();});
}
for(const dialog of document.querySelectorAll('.record-dialog')){
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!busy)dialog.close();}));
}
function flatten(node,parent=''){const label=parent?`${parent} / ${node.name}`:node.name;return[{...node,label},...node.children.flatMap(child=>flatten(child,label))];}
function fillEditor(row){
 dirty=false;$('#editor-title').textContent=row?'Edit policy':'New policy';$('#revision').textContent=row?`Saved revision ${row.version} | ${new Date(row.updatedAt).toLocaleString()}`:'This policy will belong to the selected city.';
 $('#policy-name').value=row?.name||'';$('#category').value=row?.category||'NOISE';$('#meaning').value=row?.trueMeaning||'VIOLATION';$('#expression').value=row?.expression||'';$('#active').checked=row?.active??true;$('#syntax').textContent='';$('#policy-examples').hidden=!!row;
}
function renderDetail(){
 $('#detail-title').textContent=selected?.name||'Policy details';$('#detail-meta').textContent=selected?`${selected.category} | ${selected.active?'Active':'Inactive'} | Revision ${selected.version} | ${new Date(selected.updatedAt).toLocaleString()}`:'';
 $('#detail-rule').textContent=selected?.expression||'';$('#detail-meaning').textContent=selected?`True means: ${selected.trueMeaning==='VIOLATION'?'a violation is detected':'the activity is permitted'}. Parsed grouping: ${selected.grouping}`:'';controls();
}
function renderList(){
 const matches=filtered(),pages=Math.max(1,Math.ceil(matches.length/25));page=Math.max(0,Math.min(page,pages-1));const body=$('#policies');body.replaceChildren();
 for(const row of matches.slice(page*25,(page+1)*25)){
  const tr=element('tr',''),status=element('td',''),action=element('td',''),button=element('button','Open','record-edit');button.type='button';button.setAttribute('aria-label',`Open policy ${row.name}`);
  button.addEventListener('click',()=>act(async()=>{await openPolicy(row.id);openDialog($('#policy-detail'),button);$('#message').textContent='';}));
  status.append(element('span',row.active?'Active':'Inactive',`record-badge${row.active?' active':''}`));action.append(button);
  tr.append(element('td',row.name),element('td',row.category),status,element('td',String(row.version)),element('td',new Date(row.updatedAt).toLocaleString()),action);body.append(tr);
 }
 if(!matches.length){const tr=element('tr',''),td=element('td',!ready?'Choose an available city to begin.':rows.length?'No matching policies. Clear the filters to see all policies.':'No policies saved in this city.');td.colSpan=6;tr.append(td);body.append(tr);}
 $('#policy-count').textContent=`${matches.length} of ${rows.length} policies`;$('#page-label').textContent=`Page ${page+1} of ${pages}`;controls();
}
function inspectResult(row,opener){
 $('#history-title').textContent=`Result #${row.id}: ${outcomes[row.outcome]}`;const zone=zones.find(item=>item.id===row.zoneId)?.label||`Zone ${row.zoneId}`;
 const content=$('#history-content');content.replaceChildren(element('p',`${row.policyName} | Revision ${row.policyVersion} | ${new Date(row.evaluatedAt).toLocaleString()}`),element('p',zone),element('pre',row.expression,'policy-expression'),element('p',`Observations: ${Object.entries(row.observations).map(([key,value])=>`${fieldNames[key]}: ${value}`).join(' | ')}`),element('p',`Expression: ${row.matched?'true':'false'}. True means ${row.trueMeaning.toLowerCase()}.`));
 if(row.note)content.append(element('p',row.note));openDialog($('#history-detail'),opener);
}
function renderHistory(){
 const body=$('#history');body.replaceChildren();
 for(const row of history?.items||[]){
  const tr=element('tr',''),action=element('td',''),button=element('button','View','record-edit');button.type='button';button.setAttribute('aria-label',`View result ${row.id}`);button.addEventListener('click',()=>{if(!busy)inspectResult(row,button);});action.append(button);
  tr.append(element('td',outcomes[row.outcome]),element('td',zones.find(item=>item.id===row.zoneId)?.label||`Zone ${row.zoneId}`),element('td',String(row.policyVersion)),element('td',new Date(row.evaluatedAt).toLocaleString()),action);body.append(tr);
 }
 if(!history?.items.length){const tr=element('tr',''),td=element('td',history?'No saved evaluations on this page.':'History has not loaded. Use Reload saved policy to try again.');td.colSpan=5;tr.append(td);body.append(tr);}
 $('#history-page').textContent=`Page ${historyPage+1} of ${Math.max(1,Math.ceil((history?.total||0)/25))}`;controls();
}
async function loadList(){
 // Read every API page before filtering, so search never misses later records.
 const first=await request(`cities/${cityId}/policies?page=0&pageSize=100`),loaded=[...first.items];
 for(let index=1;index*100<first.total;index++){const part=await request(`cities/${cityId}/policies?page=${index}&pageSize=100`);loaded.push(...part.items);}rows=loaded;renderList();
}
async function loadHistory(){history=await request(`cities/${cityId}/policies/${selected.id}/evaluations?page=${historyPage}&pageSize=25`);renderHistory();}
async function openPolicy(id){const row=await request(`cities/${cityId}/policies/${id}`);selected=row;historyPage=0;history=null;dirty=false;fillEditor(row);renderDetail();renderHistory();await loadHistory();}
async function loadCity(id){
 cityId=id;ready=false;selected=null;rows=[];zones=[];page=0;history=null;historyPage=0;dirty=false;$('#policy-search').value='';$('#category-filter').value='';$('#status-filter').value='';fillEditor(null);renderList();$('#zone-select').replaceChildren();
 const tree=await request(`cities/${id}/zones`);zones=tree.children.flatMap(node=>flatten(node));$('#zone-select').replaceChildren(...zones.map(zone=>new Option(zone.label,String(zone.id))));await loadList();ready=true;renderList();$('#message').textContent='';
}
$('#city-select').addEventListener('change',()=>act(()=>loadCity(Number($('#city-select').value))));
$('#refresh').addEventListener('click',()=>act(async()=>{await loadCity(cityId);$('#message').textContent='Policies refreshed.';}));
$('#refresh-detail').addEventListener('click',()=>act(async()=>{await openPolicy(selected.id);$('#message').textContent='Loaded the saved policy.';}));
$('#new-policy').addEventListener('click',()=>{if(busy||!ready||!canManage())return;selected=null;fillEditor(null);openDialog($('#editor-dialog'));controls();});
$('#edit-policy').addEventListener('click',()=>{if(busy||!selected||!canManage())return;fillEditor(selected);openDialog($('#editor-dialog'));});
$('#evaluate-policy').addEventListener('click',()=>{if(busy||!selected?.active||dirty)return;$('#evaluation-form').reset();$('#result').hidden=true;for(const field of Object.keys(fieldNames))$(`#${field}`).required=selected.requiredFields.includes(field);openDialog($('#evaluation-dialog'));controls();});
$('#toggle-filters').addEventListener('click',()=>{const filters=$('#policy-filters');filters.hidden=!filters.hidden;$('#toggle-filters').setAttribute('aria-expanded',String(!filters.hidden));});
for(const id of ['policy-search','category-filter','status-filter'])$(`#${id}`).addEventListener(id==='policy-search'?'input':'change',()=>{page=0;renderList();});
$('#clear-filters').addEventListener('click',()=>{$('#policy-search').value='';$('#category-filter').value='';$('#status-filter').value='';page=0;renderList();$('#policy-search').focus();});
for(const name of ['noise','parking'])$(`#${name}-example`).addEventListener('click',()=>{if(busy||selected||!canManage())return;const noise=name==='noise';$('#policy-name').value=noise?'Overnight noise limit':'Daytime parking permission';$('#category').value=noise?'NOISE':'PARKING';$('#meaning').value=noise?'VIOLATION':'PERMITTED';$('#expression').value=noise?'noise > 65 AND (hour >= 22 OR hour < 6)':'hour >= 8 AND hour < 18 AND parkingMinutes <= 120';dirty=true;$('#syntax').textContent='';controls();});
$('#policy-form').addEventListener('input',()=>{dirty=true;$('#syntax').textContent='';controls();});
$('#validate').addEventListener('click',()=>act(async()=>{ $('#syntax').textContent='';const result=await request('policy-language/validate','POST',{expression:$('#expression').value});$('#syntax').textContent=`Valid rule. Required: ${result.requiredFields.map(field=>fieldNames[field]).join(', ')}.\nParsed grouping: ${result.grouping}`;$('#message').textContent='Rule syntax is valid. No policy or evaluation was saved.';}));
$('#policy-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{
 if(!canManage())throw Error('Your role cannot edit policies.');const body={name:$('#policy-name').value,category:$('#category').value,expression:$('#expression').value,trueMeaning:$('#meaning').value,active:$('#active').checked};if(selected)body.version=selected.version;
 const row=await request(`cities/${cityId}/policies${selected?'/'+selected.id:''}`,selected?'PUT':'POST',body);selected=row;fillEditor(row);renderDetail();historyPage=0;history=null;renderHistory();$('#editor-dialog').close();openDialog($('#policy-detail'),$('#new-policy'));
 try{await loadList();await loadHistory();}catch{throw Error(`Policy saved as revision ${row.version}, but the view could not refresh. Use Refresh before continuing.`);}$('#message').textContent=`Saved ${row.name}. Revision ${row.version} is ready.`;
});});
$('#evaluation-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{
 if(!selected||dirty||!selected.active)throw Error('Save and activate the policy before evaluating.');const observations={};for(const field of Object.keys(fieldNames))if($(`#${field}`).value!=='')observations[field]=Number($(`#${field}`).value);$('#result').hidden=true;
 const result=await request(`cities/${cityId}/policies/${selected.id}/evaluations`,'POST',{version:selected.version,zoneId:Number($('#zone-select').value),observations,note:$('#observation-note').value});$('#result-title').textContent=outcomes[result.outcome];$('#result-description').textContent=`The rule evaluated to ${result.matched?'true':'false'}. Saved result #${result.id} uses revision ${result.policyVersion} of ${result.policyName}.`;$('#result').hidden=false;historyPage=0;
 try{await loadHistory();}catch{throw Error(`Result #${result.id} saved, but history could not refresh. Reload the saved policy.`);}$('#message').textContent='Evaluation saved with its original rule and observations.';
});});
for(const[id,change]of[['previous',-1],['next',1]])$(`#${id}`).addEventListener('click',()=>{if(!busy){page+=change;renderList();}});
for(const[id,change]of[['history-previous',-1],['history-next',1]])$(`#${id}`).addEventListener('click',()=>act(async()=>{historyPage+=change;await loadHistory();$('#message').textContent='Result page loaded.';}));
act(async()=>{if(!SmartCityAuth.user||SmartCityAuth.user.role==='RESIDENT')return;const cities=await request('cities');$('#city-select').replaceChildren(...cities.map(city=>new Option(city.name,String(city.id))));if(cities.length)await loadCity(cities[0].id);else{renderList();$('#message').textContent='Create a city in City zones first.';}});
})();
