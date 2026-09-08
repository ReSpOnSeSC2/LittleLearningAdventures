import test from 'node:test';
import assert from 'node:assert/strict';
import {getMathChoices, isMathAnswerCorrect} from '../js/math-game.js';

test('numeric choices preserve the correct answer at both range boundaries', () => {
  for (let answer = 0; answer <= 20; answer++) {
    const trial = {kind: 'count', answer};
    const choices = getMathChoices(trial);
    assert.equal(choices.filter(choice => isMathAnswerCorrect(trial, choice.value)).length, 1);
    assert.ok(choices.every(choice => Number.isInteger(choice.value) && choice.value >= 0 && choice.value <= 20));
    assert.equal(new Set(choices.map(choice => choice.value)).size, choices.length);
  }
});

test('explicit labels and answer values remain distinct', () => {
  const trial = {answer: 'right', choices: [{value: 'left', label: 'Left group'}, {value: 'right', label: 'Right group'}]};
  assert.deepEqual(getMathChoices(trial), trial.choices);
  assert.equal(isMathAnswerCorrect(trial, 'right'), true);
  assert.equal(isMathAnswerCorrect(trial, 'Right group'), false);
});

test('comparison and shape fallbacks supply the answer', () => {
  for (const answer of ['left', 'right', 'same', 'equal', 'circle', 'rectangle', 'triangle']) {
    const trial = {answer};
    assert.equal(getMathChoices(trial).filter(choice => isMathAnswerCorrect(trial, choice.value)).length, 1);
  }
});

test('normalization accepts numeral strings but never invents a missing answer', () => {
  assert.equal(isMathAnswerCorrect({answer: 0}, '0'), true);
  assert.equal(isMathAnswerCorrect({answer: 6}, ' 6 '), true);
  assert.equal(isMathAnswerCorrect({answer: 'Circle'}, 'circle'), true);
  assert.equal(isMathAnswerCorrect({answer: 6}, '7'), false);
  assert.equal(isMathAnswerCorrect({}, undefined), false);
  assert.equal(isMathAnswerCorrect({answer: null}, null), false);
  assert.equal(isMathAnswerCorrect({answer: ''}, ''), false);
});

test('duplicate choices are removed after normalization', () => {
  assert.deepEqual(getMathChoices({choices: [1, '1', 2, null, '', {value: 3, label: 'Three'}]}), [
    {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: 'Three'}
  ]);
});

test('an unknown non-numeric answer needs author-provided choices', () => {
  assert.deepEqual(getMathChoices({kind: 'guided', answer: 'talk with a grown-up'}), []);
});
