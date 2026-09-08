import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {getMathChoices,isMathAnswerCorrect} from '../js/math-game.js';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.scope,'./');
for(const icon of manifest.icons){const f=await readFile(resolve(root,icon.src));assert.equal(f.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(`${f.readUInt32BE(16)}x${f.readUInt32BE(20)}`,icon.sizes);}
let trials=0;
for(const id of ['anastasia','vivian']){
  const raw=await readFile(resolve(root,`data/${id}.json`),'utf8');assert(!/Layman/i.test(raw));const profile=JSON.parse(raw);assert.equal(profile.id,id);assert.equal(profile.days.length,60);
  for(const [i,d] of profile.days.entries()){
    assert.equal(d.day,i+1);assert.equal(d.week,Math.ceil((i+1)/5));assert(d.story.text&&d.story.question&&d.story.answer);
    assert(d.movement.instruction&&d.discovery.instruction);assert.match(d.worksheetFile,new RegExp(`^worksheets/${id}/[A-Za-z0-9_]+\\.pdf$`));
    const pdf=await readFile(resolve(root,d.worksheetFile));assert.equal(pdf.toString('utf8',0,5),'%PDF-');
    for(const t of d.math.trials){trials++;assert(getMathChoices(t).some(c=>isMathAnswerCorrect(t,c.value)),`${id} day ${d.day}: missing answer`);if(t.kind==='add')assert.equal(t.answer,t.left+t.right);if(t.kind==='subtract')assert.equal(t.answer,t.left-t.right);}
  }
}
const sw=await readFile(resolve(root,'sw.js'),'utf8');const match=sw.match(/const APP_SHELL = (\[[\s\S]*?\]);/);assert(match,'Offline manifest missing');const shell=JSON.parse(match[1]);for(const path of shell)if(!['./','./index.html'].includes(path))await stat(resolve(root,path));
const tracing=JSON.parse(await readFile(resolve(root,'data/tracing.json'),'utf8'));
assert.equal(Object.keys(tracing.letters).filter(k=>/^[A-Z]$/.test(k)).length,26);assert.equal(Object.keys(tracing.numbers).length,10);
for(const symbol of 'Vivian')assert(tracing.letters[symbol]);
for(const path of ['down','across','curve','circle','zigzag'])assert(tracing.paths[path]);
let models=0;
for(const group of Object.values(tracing))for(const model of Object.values(group)){
  models++;assert.equal(model.start.length,2);assert(model.strokes.length);
  assert.deepEqual(model.strokes[0][0].slice(1),model.start);
  for(const stroke of model.strokes){assert(stroke.length);assert.equal(stroke[0][0],'M');for(const [command,...values] of stroke){assert.equal(values.length,{M:2,L:2,C:6,Z:0}[command]);assert(values.every(n=>Number.isFinite(n)&&n>=0&&n<=100));}}
}
console.log(`Verified: 120 lessons, ${trials} math trials, 120 printable day files, ${models} tracing models, install manifest/icons and every offline asset.`);
