const assert = require('node:assert/strict');
const {test} = require('node:test');
const {build,areas} = require('../src/main/webapp/assets/js/report-model.js');
const tree = {id:1,name:'City',type:'CITY',children:[{id:2,name:'North',type:'DISTRICT',children:[{id:3,name:'Park',type:'BUILDING',children:[]}]},{id:4,name:'South',type:'DISTRICT',children:[]}]};
const locations = areas(tree);
function row(id,createdAt,status='ASSIGNED',zoneId=3,severity='LOW') {
    return {id,createdAt,status,zoneId,severity,subject:`Case ${id}`,residentName:'PRIVATE NAME',assignedUserId:99,history:[{message:'PRIVATE NOTE'}]};
}
const records = [row(1,'2026-01-31T23:59:59Z'),row(2,'2026-02-01T00:00:00Z','RESOLVED'),{...row(3,'2026-02-28T23:59:59.999Z','RESOLVED',4,'HIGH'),reopenRequested:true},row(4,'2026-03-01T00:00:00Z','IN_PROGRESS',null,'MEDIUM')];
test('Inclusive UTC dates exclude adjacent days and handle offset timestamps',()=>{
    const result=build([...records,row(5,'2026-03-01T01:00:00+05:30')],{from:'2026-02-01',to:'2026-02-28'},locations);
    assert.deepEqual(result.rows.map(r=>r.id),[3,5,2]);
    assert.equal(result.total,3); assert.equal(result.resolved,2); assert.equal(result.pending,1);
});
test('Filters intersect; parent areas include descendants and whole-city is distinct',()=>{
    assert.deepEqual(build(records,{area:'2',status:'RESOLVED',severity:'LOW'},locations).rows.map(r=>r.id),[2]);
    assert.deepEqual(build(records,{area:'city'},locations).rows.map(r=>r.id),[4]);
    assert.deepEqual(build(records,{area:'4'},locations).rows.map(r=>r.id),[3]);
});
test('Chart totals match rows and pending reopening remains resolved',()=>{
    const result=build(records,{},locations);
    assert.equal(result.total,4);assert.equal(result.open,2);assert.equal(result.resolved,2);assert.equal(result.pending,1);
    assert.equal(Object.values(result.byStatus).reduce((a,b)=>a+b,0),4);
    assert.equal(Object.values(result.bySeverity).reduce((a,b)=>a+b,0),4);
    assert.deepEqual(result.months,[['2026-01',1],['2026-02',2],['2026-03',1]]);
});
test('Empty result has zero totals, no fabricated trend and no private fields',()=>{
    const empty=build(records,{from:'2027-01-01'},locations);
    assert.equal(empty.total,0);assert.equal(empty.open,0);assert.deepEqual(empty.months,[]);
    const report=JSON.stringify(build(records,{},locations));
    for(const value of ['PRIVATE NAME','PRIVATE NOTE','assignedUserId','history','residentName'])assert.ok(!report.includes(value));
});
test('Invalid ranges, dates, enums and unavailable areas are rejected',()=>{
    for(const filters of [{from:'2026-02-30'},{from:'2026-02-02',to:'2026-01-01'},{to:'not-a-date'},{status:'FAKE'},{severity:'URGENT'},{area:'99'}])assert.throws(()=>build(records,filters,locations));
    assert.doesNotThrow(()=>build(records,{from:'2024-02-29'},locations));
    assert.throws(()=>build([row(8,'invalid')],{},locations));
});
test('Same timestamp ordering is deterministic and subjects remain plain data',()=>{
    const data=[row(1,'2026-01-01T00:00:00Z'),{...row(2,'2026-01-01T00:00:00Z'),subject:'<img src=x onerror=alert(1)>'}];
    const result=build(data,{},locations); assert.deepEqual(result.rows.map(r=>r.id),[2,1]);
    assert.equal(result.rows[0].subject,data[1].subject); assert.equal(data[0].id,1);
});
