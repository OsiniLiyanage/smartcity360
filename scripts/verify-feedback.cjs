const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('src/main/webapp/assets/js/feedback.js','utf8');

// Minimal DOM and controllable task clock: exercises notification lifecycle, not rendering.
function fixture(){
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.handlers={};this.textContent='';}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  setAttribute(key,value){this.attributes[key]=value;}
  removeAttribute(key){delete this.attributes[key];}
  getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,handler){(this.handlers[type]??=[]).push(handler);}
  fire(type,event={}){for(const handler of this.handlers[type]||[])handler(event);}
  remove(){this.parent.children=this.parent.children.filter(child=>child!==this);}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  closest(selector){if(selector===this.tag||selector==='.'+this.className)return this;return this.parent?.closest(selector)||null;}
 }
 const body=new Element('body'), message=new Element('p'), form=new Element('form'), button=new Element('button');
 body.append(message,form);form.append(button);
 const handlers={},storage=new Map(),timers=new Map();let clock=0,next=0;
 const document={body,activeElement:null,readyState:'complete',createElement:tag=>new Element(tag),querySelector:selector=>selector==='#message'?message:null,
  addEventListener(type,handler){(handlers[type]??=[]).push(handler);}};
 const context={document,Element,window:{},queueMicrotask,sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  setTimeout(fn,delay){const id=++next;timers.set(id,{fn,at:clock+delay});return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source,context);
 return {api:context.window.SmartCityFeedback,message,button,form,document,
  capture(type='click',target=button){for(const handler of handlers[type]||[])handler({target});},
  cards(){return body.children.find(child=>child.className==='feedback-stack').children;},
  advance(ms){clock+=ms;for(const [id,timer]of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}}};
}
function text(card){return card.children[1].children[1].textContent;}
test('capture survives microtasks; success appears only after finish',async()=>{
 const f=fixture();f.capture('submit');await Promise.resolve();const action=f.api.begin();
 assert.equal(f.cards().length,0);assert.equal(f.button.attributes['aria-busy'],'true');
 action.finish('success','Profile saved.');assert.equal(text(f.cards()[0]),'Profile saved.');
 assert.equal(f.button.attributes['aria-busy'],undefined);assert.equal(f.message.dataset.feedbackState,'success');
 action.finish('error','Should not appear');assert.equal(f.cards().length,1);
});
test('slow routine actions remain quiet',()=>{
 const f=fixture();f.capture();const action=f.api.begin();f.advance(399);assert.equal(f.cards().length,0);
 f.advance(1);assert.equal(f.cards().length,0);
 action.finish('success','Updated.');assert.equal(f.cards().length,0);
});
test('background loads stay quiet and earlier clicks expire',()=>{
 const f=fixture();f.api.begin().finish('success','Loaded.');assert.equal(f.cards().length,0);
 f.capture();f.advance(0);f.api.begin().finish('success','Background loaded.');assert.equal(f.cards().length,0);
 f.api.begin().finish('error','Could not load.');assert.equal(f.cards().length,1);
});
test('errors survive time and newer successes until explicitly dismissed',()=>{
 const f=fixture();const error=f.api.show('error','Save failed.');
 for(let i=0;i<6;i++)f.api.show('success',`Updated ${i}`);
 assert.equal(f.cards().length,4);f.advance(60000);assert.equal(f.cards().length,1);
 assert.equal(text(f.cards()[0]),'Save failed.');error.close();assert.equal(f.cards().length,0);
});
test('success expiry pauses while focused or hovered; duplicate notices merge',()=>{
 const f=fixture();f.api.show('success','Saved.');f.api.show('success','Saved.');assert.equal(f.cards().length,1);
 const card=f.cards()[0];card.fire('pointerenter');f.advance(9000);assert.equal(f.cards().length,1);
 card.fire('pointerleave');f.advance(8000);assert.equal(f.cards().length,0);
 f.api.show('info','Read this.');const second=f.cards()[0];f.document.activeElement=second.children[2];second.fire('focusin');
 f.advance(9000);assert.equal(f.cards().length,1);second.children[2].fire('click');assert.equal(f.cards().length,0);
});
test('validation warnings name the field and do not expire',()=>{
 const f=fixture();f.button.labels=[{textContent:'Phone'}];f.button.validationMessage='Use digits.';
 f.capture('invalid');assert.equal(text(f.cards()[0]),'Phone: Use digits.');f.advance(9000);assert.equal(f.cards().length,1);
});
