(() => {
    'use strict';
    const $=selector=>document.querySelector(selector), model=CityExplorerModel;
    const labels={CITY:'City',DISTRICT:'District',STREET:'Street',BUILDING:'Building'};
    const plurals={DISTRICT:'districts',STREET:'streets',BUILDING:'buildings'};
    const nextType={CITY:'DISTRICT',DISTRICT:'STREET',STREET:'BUILDING'};
    const states={EMPTY:'No buildings',ON:'On',OFF:'Off',MIXED:'Mixed'};
    const numbers=new Intl.NumberFormat(undefined,{maximumFractionDigits:3});
    let cityId=null,root=null,location=null,detail=null,page=0,busy=false;
    const canAdd=()=>['SUPERVISOR','CITY_MANAGER','SYSTEM_ADMIN'].includes(SmartCityAuth.user?.role);
    const canPower=()=>['CITY_MANAGER','SYSTEM_ADMIN'].includes(SmartCityAuth.user?.role);
    const canCreateCity=()=>SmartCityAuth.user?.role==='SYSTEM_ADMIN';
    function node(tag,text,css=''){const el=document.createElement(tag);el.textContent=text;el.className=css;return el;}
    async function request(path,method='GET',body) {
        const response=await SmartCityAuth.fetch(`api/${path}`,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
        const value=await response.json().catch(()=>null);
        if(!response.ok)throw Error(value?.error||`Request failed (${response.status}). Please try again.`);
        if(!value)throw Error('The server returned an unexpected response. Please refresh.');
        return value;
    }
    function syncControls() {
        document.querySelectorAll('main button, main input, main select').forEach(el=>{if(!el.closest('.feedback-stack'))el.disabled=busy;});
        $('#city-select').disabled=busy||!$('#city-select').options.length;
        $('#new-city').hidden=!canCreateCity();$('#new-zone').hidden=!location||!nextType[location.type]||!canAdd();
        $('#area-details').disabled=busy||!location;
        for(const id of ['power-on','power-off'])$(`#${id}`).disabled=busy||!detail?.buildingCount||!canPower();
        const result=model.listing(location,$('#zone-search').value,page);
        $('#previous').disabled=busy||!location||result.page===0;$('#next').disabled=busy||!location||result.page+1>=result.pages;
    }
    async function act(work) {
        if(busy)return; const feedback=SmartCityFeedback.begin(),focused=document.activeElement;let outcome='success';
        busy=true;$('#message').textContent='Working...';syncControls();
        try {await SmartCityAuth.ready;await work();}
        catch(error){outcome='error';$('#message').textContent=error.name==='TimeoutError'?'The request timed out. Refresh to check whether it was saved before retrying.':error.message;}
        finally {busy=false;syncControls();if(document.activeElement===document.body&&focused?.isConnected&&!focused.disabled)focused.focus();feedback.finish(outcome);}
    }
    function openDialog(dialog,opener=document.activeElement) {
        const stack=document.querySelector('.feedback-stack');if(stack)dialog.append(stack);
        dialog.addEventListener('close',()=>{
            if(stack)document.body.append(stack);if(dialog.id==='detail-dialog')detail=null;
            requestAnimationFrame(()=>{if(opener?.isConnected&&!opener.disabled)opener.focus();else $('#location-title').focus();});
        },{once:true});
        dialog.showModal();
        requestAnimationFrame(()=>{if(dialog.open)(dialog.querySelector('[autofocus]:not(:disabled)')||dialog.querySelector('[data-close]:not(:disabled)'))?.focus();});
    }
    for(const dialog of document.querySelectorAll('.record-dialog')) {
        dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
        dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
        dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!busy)dialog.close();}));
    }
    function locationPath(target) {return model.path(root,model.key(target))||[];}
    function navigate(target) {
        if(busy)return;location=target;page=0;$('#zone-search').value='';render();$('#location-title').focus();
    }
    function icon(building) {
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('aria-hidden','true');
        const shape=document.createElementNS(svg.namespaceURI,'path');shape.setAttribute('d',building?'M5 21V3h14v18M3 21h18M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3':'M3 7V5h6l2 2h10v13H3Z');svg.append(shape);return svg;
    }
    function render() {
        $('#workspace').hidden=!location;$('#empty-state').hidden=!!location;
        $('#breadcrumbs').replaceChildren();$('#zone-rows').replaceChildren();
        if(!location){syncControls();return;}
        const trail=locationPath(location);
        for(const [index,area] of trail.entries()) {
            if(index) {const separator=node('span','/');separator.setAttribute('aria-hidden','true');$('#breadcrumbs').append(separator);}
            if(index===trail.length-1){const current=node('span',area.name);current.setAttribute('aria-current','location');$('#breadcrumbs').append(current);}
            else {const link=node('button',area.name);link.type='button';link.addEventListener('click',()=>navigate(area));$('#breadcrumbs').append(link);}
        }
        const childType=nextType[location.type],children=location.children||[];
        $('#location-title').textContent=location.name;
        $('#location-summary').textContent=`${labels[location.type]} | ${numbers.format(location.usageKwh)} kWh recorded | ${location.buildingCount} building${location.buildingCount===1?'':'s'}`;
        $('#new-zone').textContent=`+ Add ${labels[childType]?.toLowerCase()||'area'}`;
        $('#zone-search').placeholder=`Search ${plurals[childType]||'this location'}`;
        $('#level-hint').textContent=`${children.length} ${plurals[childType]||'items'} in this location`;
        const result=model.listing(location,$('#zone-search').value,page);page=result.page;
        for(const area of result.rows) {
            const row=document.createElement('tr'),name=node('td',''),button=node('button','','zone-open');button.type='button';button.dataset.zoneKey=model.key(area);
            button.setAttribute('aria-label',`${area.type==='BUILDING'?'View details for':'Open'} ${area.name}`);
            button.append(icon(area.type==='BUILDING'),node('span',area.name,'zone-label'),node('span',area.type==='BUILDING'?'Details':'Open','zone-arrow'));
            button.addEventListener('click',()=>{if(busy)return;if(area.type==='BUILDING')showDetails(area,button);else navigate(area);});name.append(button);
            const state=node('td','');state.append(node('span',states[area.powerState]||area.powerState,`record-badge${area.powerState==='ON'?' active':''}`));
            row.append(name,node('td',labels[area.type]),node('td',String(area.buildingCount)),node('td',`${numbers.format(area.usageKwh)} kWh`),state);$('#zone-rows').append(row);
        }
        if(!result.rows.length) {
            const tr=node('tr',''),td=node('td',$('#zone-search').value.trim()?'No matches in this location. Clear the search to see all items.':`No ${plurals[childType]||'items'} yet.${canAdd()?' Use the Add button to create the first one.':''}`);td.colSpan=5;tr.append(td);$('#zone-rows').append(tr);
        }
        $('#page-info').textContent=`${result.total?page*25+1:0}-${Math.min((page+1)*25,result.total)} of ${result.total} items | Page ${page+1} of ${result.pages}`;
        syncControls();
    }
    function setTree(tree,preferred=location&&model.key(location)) {
        const detailKey=detail&&model.key(detail);root=tree;
        location=(model.path(root,preferred)||[root]).at(-1);render();
        if(detailKey){detail=model.path(root,detailKey)?.at(-1)||null;if(detail)renderDetails();else $('#detail-dialog').close();}
    }
    function renderDetails() {
        $('#selected-type').textContent=labels[detail.type];$('#selected-name').textContent=detail.name;
        $('#selected-path').textContent=locationPath(detail).map(area=>area.name).join(' / ');
        $('#usage-total').textContent=numbers.format(detail.usageKwh);$('#building-count').textContent=String(detail.buildingCount);
        $('#power-state').textContent=states[detail.powerState];$('#powered-count').textContent=`${detail.poweredCount} of ${detail.buildingCount} powered on`;
        $('#usage-panel').hidden=detail.type!=='BUILDING';$('#usage-input').value=detail.type==='BUILDING'?detail.usageKwh:'';
        $('#power-panel').hidden=!canPower();$('#power-scope').textContent=detail.buildingCount?`Applies to ${detail.buildingCount} building${detail.buildingCount===1?'':'s'} in ${detail.name}.`:'There are no buildings in this area yet.';
        syncControls();
    }
    function showDetails(area,opener) {detail=area;renderDetails();openDialog($('#detail-dialog'),opener);}
    async function loadTree(id,preferred=null) {
        cityId=id;root=null;location=null;render();
        if(id!==null)setTree(await request(`cities/${id}/zones`),preferred);
    }
    async function loadCities(preferredId=cityId,preferredKey=location&&model.key(location)) {
        const cities=await request('cities'),select=$('#city-select');select.replaceChildren(...cities.map(city=>new Option(city.name,String(city.id))));
        const chosen=cities.find(city=>city.id===preferredId)||cities[0];if(chosen)select.value=String(chosen.id);
        await loadTree(chosen?.id??null,chosen?.id===preferredId?preferredKey:null);
    }
    $('#city-select').addEventListener('change',()=>act(async()=>{page=0;$('#zone-search').value='';await loadTree(Number($('#city-select').value));$('#message').textContent='City loaded.';}));
    $('#refresh').addEventListener('click',()=>act(async()=>{await loadCities();$('#message').textContent='City zones refreshed.';}));
    $('#zone-search').addEventListener('input',()=>{if(busy)return;page=0;render();});
    $('#clear-search').addEventListener('click',()=>{$('#zone-search').value='';page=0;render();$('#zone-search').focus();});
    for(const [id,delta] of [['previous',-1],['next',1]])$(`#${id}`).addEventListener('click',()=>{if(busy)return;page+=delta;render();$('#location-title').focus();});
    $('#area-details').addEventListener('click',()=>{if(location&&!busy)showDetails(location,$('#area-details'));});
    $('#new-city').addEventListener('click',()=>{if(!canCreateCity()||busy)return;$('#city-form').reset();openDialog($('#city-dialog'));});
    $('#new-zone').addEventListener('click',()=>{
        if(!canAdd()||!location||busy)return;const type=nextType[location.type];if(!type)return;
        $('#zone-form').reset();$('#add-heading').textContent=`Add ${labels[type].toLowerCase()}`;$('#zone-name-label').textContent=`${labels[type]} name`;
        $('#add-zone').textContent=`Add ${labels[type].toLowerCase()}`;$('#add-location').textContent=`In ${locationPath(location).map(area=>area.name).join(' / ')}`;
        openDialog($('#zone-dialog'));
    });
    $('#city-form').addEventListener('submit',event=>{event.preventDefault();if(!canCreateCity())return;act(async()=>{
        const city=await request('cities','POST',{name:$('#city-name').value});$('#city-form').reset();$('#city-dialog').close();page=0;$('#zone-search').value='';
        try{await loadCities(city.id,null);}catch{throw Error(`Saved ${city.name}, but the view could not refresh. Use Refresh before creating another city.`);}
        $('#message').textContent=`Saved ${city.name}. You can now add its first district.`;
    });});
    $('#zone-form').addEventListener('submit',event=>{event.preventDefault();if(!location||!canAdd())return;act(async()=>{
        const name=$('#zone-name').value,oldKeys=new Set(location.children.map(model.key)),parentKey=model.key(location);
        const tree=await request(`cities/${cityId}/zones`,'POST',{name,type:nextType[location.type],parentId:location.type==='CITY'?null:location.id});
        const parent=model.path(tree,parentKey)?.at(-1),index=parent?.children.findIndex(child=>!oldKeys.has(model.key(child)))??0;
        page=Math.max(0,Math.floor(index/25));$('#zone-search').value='';setTree(tree,parentKey);$('#zone-dialog').close();$('#message').textContent=`Added ${name.trim()}.`;
    });});
    $('#usage-form').addEventListener('submit',event=>{event.preventDefault();if(!detail||detail.type!=='BUILDING')return;act(async()=>{
        setTree(await request(`cities/${cityId}/zones/${detail.id}/usage`,'PUT',{usageKwh:Number($('#usage-input').value)}));$('#message').textContent='Usage saved. All parent totals have been recalculated.';
    });});
    for(const [id,on] of [['power-on',true],['power-off',false]])$(`#${id}`).addEventListener('click',()=>{if(!detail||!canPower())return;act(async()=>{
        setTree(await request(`cities/${cityId}/zones/power`,'PUT',{zoneId:detail.type==='CITY'?null:detail.id,powerOn:on}));$('#message').textContent=`Simulated power switched ${on?'on':'off'} for ${detail.name}.`;
    });});
    act(async()=>{if(!SmartCityAuth.user||SmartCityAuth.user.role==='RESIDENT')return;await loadCities();$('#message').textContent='';});
})();
