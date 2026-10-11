// Run with `node 10-restaurant/validate.mjs`; no browser, server or installed packages.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const read=file=>fs.readFileSync(`10-restaurant/${file}`,'utf8');
// Data URLs avoid requiring a package.json just to test the browser's ES modules.
const moduleFrom=file=>import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
const data=await moduleFrom('menu-data.js'),layoutModule=await moduleFrom('film-layout.js');
const html=read('index.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Every HTML and SVG ID must be unique');
for(const match of html.matchAll(/url\(#([^)]+)\)/g))assert(ids.includes(match[1]),`Missing SVG paint reference ${match[1]}`);
for(const match of html.matchAll(/(?:aria-controls|aria-labelledby|aria-describedby|for)="([^"]+)"/g)){
  for(const id of match[1].split(' '))assert(ids.includes(id),`Missing accessibility target ${id}`);
}
const cards=[...html.matchAll(/<article class="dish-card" data-id="([^"]+)" data-tags="([^"]*)">([\s\S]*?)<\/article>/g)];
assert.equal(cards.length,data.dishes.length);
for(const dish of data.dishes){
  const card=cards.find(card=>card[1]===dish.id);assert(card,`Missing ${dish.id}`);
  assert(card[3].includes('<svg '),`Missing plate ${dish.id}`);
  assert(card[3].includes(`<h4>${dish.name}</h4>`));
  assert(card[3].includes(`$${dish.price}`));
  assert.deepEqual(card[2].split(' '),dish.tags);
}
const tags=['vegetarian','spicy','gluten-free'];
for(const category of layoutModule.courseNames)for(let mask=0;mask<8;mask++){
  const selected=tags.filter((_,index)=>mask&(1<<index));
  const expected=data.filterMenu(category,selected).map(dish=>dish.id);
  const actual=data.dishes.filter(dish=>dish.category===category).filter(dish=>{
    const card=cards.find(card=>card[1]===dish.id);
    return selected.every(tag=>card[2].split(' ').includes(tag));
  }).map(dish=>dish.id);
  assert.deepEqual(actual,expected);
}
// Exercise actual menu handlers without a browser or moving a plate out of its card.
function fixture(dataset={}){
  const handlers={},classes=new Set(),attributes={};
  return {dataset,checked:false,inert:false,tabIndex:0,textContent:'',
    classList:{toggle(name,value){value?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)},
    addEventListener(name,callback){(handlers[name]??=[]).push(callback);},
    dispatch(name,event={}){handlers[name]?.forEach(callback=>callback(event));},
    setAttribute(name,value){attributes[name]=value;},removeAttribute(name){delete attributes[name];},
    getAttribute(name){return attributes[name];},focus(){},scrollIntoView(){},scrollBy(){}};
}
const tabNodes=layoutModule.courseNames.map(()=>fixture()),courseNodes=tabNodes.map(()=>fixture());
const filterNodes=tags.map(value=>Object.assign(fixture(),{value}));
const cardNodes=cards.map(card=>Object.assign(fixture({id:card[1],tags:card[2]}),{illustration:{svg:card[3]}}));
const plates=cardNodes.map(card=>card.illustration);
const groups={'.menu-tabs [role="tab"]':tabNodes,'.tasting-course':courseNodes,'.diet-filters input':filterNodes,'.dish-card':cardNodes};
const singles={'.menu-status':fixture(),'.gallery-strip':fixture(),'#gallery-prev':fixture(),'#gallery-next':fixture()};
globalThis.document={querySelector:selector=>singles[selector],querySelectorAll:selector=>groups[selector]??[]};
globalThis.matchMedia=()=>({matches:false});
let filmSource=read('film.js');
for(const file of ['menu-data.js','film-layout.js','embers.js'])filmSource=filmSource.replace(`'./${file}'`,`'data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}'`);
const film=await import(`data:text/javascript;base64,${Buffer.from(filmSource).toString('base64')}`);
film.initTastingMenu();
for(let category=0;category<4;category++)for(let mask=0;mask<8;mask++){
  tabNodes[category].dispatch('click');
  filterNodes.forEach((input,index)=>{input.checked=Boolean(mask&(1<<index));});
  filterNodes[0].dispatch('change');
  assert.equal(tabNodes[category].getAttribute('aria-selected'),'true');
  const selected=filterNodes.filter(input=>input.checked).map(input=>input.value);
  cardNodes.forEach((card,index)=>{
    const matches=selected.every(tag=>card.dataset.tags.split(' ').includes(tag));
    assert.equal(card.classList.contains('is-dimmed'),!matches);
    assert.equal(card.illustration,plates[index]);
  });
  const count=data.filterMenu(layoutModule.courseNames[category],selected).length;
  assert(singles['.menu-status'].textContent.includes(`${count} matching`));
}
delete globalThis.document;delete globalThis.matchMedia;
for(const mobile of [false,true]){
  const layout=layoutModule.filmLayout(mobile);
  assert.equal(layout.starts.length,7);
  assert(layout.total>=(mobile?6:12)&&layout.total<=(mobile?7:13));
  for(let index=0;index<7;index++)assert(layout.rests[index]>layout.starts[index]&&layout.rests[index]<layout.starts[index]+layout.lengths[index]);
  layout.courseRests.forEach((rest,index)=>assert.equal(Math.floor((rest-layout.starts[4])/layout.courseLength),index));
  assert.equal(layout.snapPoints[0],0);assert.equal(layout.snapPoints.at(-1),1);
  assert.equal(new Set(layout.snapPoints).size,layout.snapPoints.length);
  console.log(`${mobile?'Mobile':'Desktop'}: ${layout.total.toFixed(2)} pinned viewport lengths, all chapter/course rests valid`);
}
for(let day=0;day<7;day++){
  const date=new Date(2026,9,12+day),hours=data.kitchenHours(date.getDay());
  date.setHours(hours.opens,0);assert(data.isOpen(date));
  date.setHours(hours.closes,0);assert(!data.isOpen(date));
  const key=data.localDateKey(date);
  for(const party of [1,2,6,8])for(const slot of data.availableSlots(key,party,new Date(2026,8,1))){
    assert.equal(slot.disabled,slot.full||slot.past);
    assert(Number(slot.value.split(':')[0])<hours.closes-1);
  }
}
assert.equal(data.parseLocalDate('2026-02-30'),null);
assert(data.availableSlots('2026-10-01',2,new Date(2026,9,12)).every(slot=>slot.disabled));
for(const file of fs.readdirSync('10-restaurant').filter(file=>file.endsWith('.js'))){
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:read(file),encoding:'utf8'});
  assert.equal(result.status,0,`${file}: ${result.stderr}`);
}
assert(!/filter\s*:\s*drop-shadow/.test(read('style.css')+read('film.css')));
assert(!/\.innerHTML\s*=/.test(read('film.js')),'Menu SVGs must stay connected');
assert(!/preventDefault\(\).*wheel|addEventListener\(['"](?:wheel|touchmove)/.test(read('film.js')));
console.log('Passed: 32 dietary combinations, 15 permanent plates, unique SVG IDs/references, rest navigation, hours/availability boundaries and module syntax.');
