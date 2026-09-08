import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuidedTracer} from '../js/tracing-engine.js';

const line = [[{x:0,y:0},{x:100,y:0}]];
const tight = {corridor:5,startRadius:8,resumeRadius:8,lookAhead:30,maxStep:35,endTolerance:0};
const create = (strokes=line,options={}) => createGuidedTracer(strokes,{...tight,...options});

test('must start at the active stroke start, not its middle or end',()=>{
  const tracer=create();assert.equal(tracer.pointerMove(10,0).reason,'start-required');
  assert.equal(tracer.pointerDown(50,0).accepted,false);assert.equal(tracer.pointerDown(100,0).accepted,false);
  assert.equal(tracer.getState().strokeProgress,0);assert.equal(tracer.pointerDown(2,2).accepted,true);
});
test('ordered line movement completes and returns snapped drawing points',()=>{
  const tracer=create();assert.deepEqual(tracer.pointerDown(0,0).point,{x:0,y:0});
  for(const x of [20,40,60,80]){const result=tracer.pointerMove(x,2);assert.equal(result.accepted,true);assert.deepEqual(result.point,{x,y:0});}
  const end=tracer.pointerMove(100,0);assert.equal(end.strokeComplete,true);assert.equal(end.complete,true);assert.equal(end.strokeIndex,0);
  assert.equal(tracer.getState().strokeIndex,1);assert.equal(tracer.getState().totalProgress,1);assert.equal(tracer.pointerMove(0,0).accepted,false);
});
test('off-path input does not advance and the child can immediately rejoin',()=>{
  const tracer=create();tracer.pointerDown(0,0);tracer.pointerMove(20,0);
  assert.equal(tracer.pointerMove(30,15).reason,'off-path');assert.equal(tracer.getState().strokeProgress,20);
  assert.equal(tracer.pointerMove(30,0).accepted,true);assert.equal(tracer.getState().strokeProgress,30);
});
test('large physical jumps and jumps beyond the local path window cannot finish',()=>{
  const tracer=create();tracer.pointerDown(0,0);assert.equal(tracer.pointerMove(100,0).reason,'step-too-large');assert.equal(tracer.getState().strokeProgress,0);
  const local=create(line,{maxStep:200,lookAhead:20});local.pointerDown(0,0);
  assert.equal(local.pointerMove(100,0).accepted,false);assert.equal(local.getState().complete,false);
});
test('a U-shaped shortcut is rejected even when its endpoint is on the path',()=>{
  const tracer=create([[[0,0],[0,40],[40,40],[40,0]]],{lookAhead:150,maxStep:100,corridor:8});tracer.pointerDown(0,0);
  assert.equal(tracer.pointerMove(40,0).accepted,false);assert.equal(tracer.getState().strokeProgress,0);
  for(const [x,y] of [[0,20],[0,40],[20,40],[40,40],[40,20],[40,0]])assert.equal(tracer.pointerMove(x,y).accepted,true);
  assert.equal(tracer.getState().complete,true);
});
test('self-crossing later path sections are not selected early',()=>{
  const tracer=create([[[0,0],[40,40],[0,40],[40,0],[60,20]]],{lookAhead:25,maxStep:35,corridor:5});
  tracer.pointerDown(0,0);tracer.pointerMove(15,15);const crossing=tracer.pointerMove(20,20);
  assert.equal(crossing.accepted,true);assert.ok(tracer.getState().strokeProgress<30);assert.equal(tracer.getState().complete,false);
});
test('backtracking moves the cursor without losing completed progress',()=>{
  const tracer=create();tracer.pointerDown(0,0);tracer.pointerMove(20,0);tracer.pointerMove(40,0);
  assert.equal(tracer.pointerMove(25,0).accepted,true);assert.equal(tracer.getState().strokeProgress,40);assert.deepEqual(tracer.getState().cursorPoint,{x:25,y:0});
  tracer.pointerMove(45,0);assert.equal(tracer.getState().strokeProgress,45);
});
test('lifting preserves progress and permits resumption only at its marker',()=>{
  const tracer=create();tracer.pointerDown(0,0);tracer.pointerMove(25,0);tracer.pointerMove(50,0);tracer.pointerUp();
  assert.equal(tracer.pointerMove(60,0).reason,'start-required');assert.equal(tracer.pointerDown(90,0).reason,'resume-too-far');
  const resumed=tracer.pointerDown(52,2);assert.equal(resumed.accepted,true);assert.deepEqual(resumed.point,{x:50,y:0});
  tracer.pointerMove(75,0);assert.equal(tracer.pointerMove(100,0).complete,true);
});
test('every next stroke requires its own start; cross-stroke moves are rejected',()=>{
  const tracer=create([[[0,0],[20,0]],[[50,0],[70,0]]]);tracer.pointerDown(0,0);
  assert.equal(tracer.pointerDown(50,0).accepted,false);tracer.pointerDown(0,0);
  const first=tracer.pointerMove(20,0);assert.equal(first.strokeComplete,true);assert.equal(first.complete,false);assert.equal(first.strokeIndex,0);
  assert.equal(tracer.getState().strokeIndex,1);assert.equal(tracer.pointerMove(60,0).reason,'start-required');
  assert.equal(tracer.pointerDown(70,0).accepted,false);tracer.pointerDown(50,0);assert.equal(tracer.pointerMove(70,0).complete,true);
});
test('dots complete on touch, including a duplicate-point dot stroke',()=>{
  const tracer=create([[[10,10],[10,10]],[[20,20]]]);assert.equal(tracer.pointerDown(10,10).strokeComplete,true);assert.equal(tracer.getState().totalProgress,.5);
  assert.equal(tracer.pointerDown(20,20).complete,true);assert.equal(tracer.state.isDrawing,false);
});
test('a subpixel i dot completes with a tap rather than a tiny drag',()=>{
  const tracer=create([[[100,56],[100,56.2]],[[100,75],[100,110]]]);
  const dot=tracer.pointerDown(100,56);assert.equal(dot.accepted,true);assert.equal(dot.strokeComplete,true);assert.equal(dot.complete,false);
  assert.equal(tracer.getState().strokeIndex,1);assert.equal(tracer.pointerMove(100,90).reason,'start-required');
  tracer.pointerDown(100,75);assert.equal(tracer.pointerMove(100,100).accepted,true);assert.equal(tracer.pointerMove(100,110).complete,true);
});
test('drawPoints retain path corners instead of returning a shortcut chord',()=>{
  const tracer=create([[[0,0],[10,0],[10,10]]],{lookAhead:30,maxStep:30,corridor:12});tracer.pointerDown(0,0);
  const result=tracer.pointerMove(10,10);assert.equal(result.accepted,true);assert.deepEqual(result.drawPoints,[{x:0,y:0},{x:10,y:0},{x:10,y:10}]);
});
test('reset clears completion and snapshots cannot mutate the model',()=>{
  const source=[[[0,0],[20,0]]],tracer=create(source);source[0][0][0]=999;tracer.pointerDown(0,0);const result=tracer.pointerMove(20,0);result.point.x=999;
  const state=tracer.reset();assert.equal(state.complete,false);assert.equal(state.strokeProgress,0);state.currentPoint.x=999;
  assert.deepEqual(tracer.getState().currentPoint,{x:0,y:0});assert.equal(tracer.pointerDown(0,0).accepted,true);
});
test('empty or malformed geometry and invalid configuration are rejected',()=>{
  for(const input of [[],null,[[]],[[{x:0,y:Infinity}]],[[[0,'1']]]])assert.throws(()=>createGuidedTracer(input));
  for(const options of [{corridor:0},{maxStep:-1},{lookAhead:Infinity},{startRadius:NaN},{resumeRadius:0},{backtrack:-1},{dotThreshold:-1},{endTolerance:-1},{maxArcRatio:.5}])assert.throws(()=>createGuidedTracer(line,options));
  const tracer=create();assert.equal(tracer.pointerDown(NaN,0).reason,'invalid-point');tracer.pointerDown(0,0);assert.equal(tracer.pointerMove(0,Infinity).reason,'invalid-point');
});
