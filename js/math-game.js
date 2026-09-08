/** Short, encouraging math games. No network, tracking, or student identifiers. */
const SHAPES = ['circle', 'triangle', 'square', 'rectangle', 'oval', 'diamond', 'star', 'heart'];
const SOLIDS = ['sphere', 'cube', 'cylinder', 'cone'];
const SUPPORTED = new Set(['count', 'compare', 'add', 'subtract', 'shape', 'pattern', 'measure', 'sort', 'tenframe']);
const finiteNumber = value => typeof value === 'number' && Number.isFinite(value);
const validCount = value => Number.isInteger(value) && value >= 0 && value <= 20;
const labelOf = value => String(value ?? '');
function canonical(value) {
  if (value && typeof value === 'object') value = value.value ?? value.id ?? value.label;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : normalized;
  }
  return value;
}

/** Accept either primitive choices or {value, label} records. */
export function getMathChoices(trial = {}) {
  let choices = Array.isArray(trial.choices) ? trial.choices : [];
  const answer = canonical(trial.answer);
  if (!choices.length && validCount(answer)) {
    // Use nearby values, retaining zero and twenty without out-of-range distractors.
    const start = Math.min(18, Math.max(0, answer - 1));
    choices = [start, start + 1, start + 2];
  } else if (!choices.length && SHAPES.includes(answer)) {
    choices = [answer, ...SHAPES.filter(shape => shape !== answer).slice(0, 2)];
  } else if (!choices.length && ['left', 'right', 'equal', 'same'].includes(answer)) {
    choices = [{value: 'left', label: 'Left group'}, {value: 'right', label: 'Right group'},
      {value: answer === 'same' ? 'same' : 'equal', label: 'Same amount'}];
  }
  const seen = new Set();
  return choices.map(choice => {
    if (choice && typeof choice === 'object') {
      return {value: choice.value ?? choice.id ?? choice.label, label: labelOf(choice.label ?? choice.value ?? choice.id)};
    }
    return {value: choice, label: labelOf(choice)};
  }).filter(choice => {
    const key = canonical(choice.value);
    if (key === undefined || key === null || key === '' || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isMathAnswerCorrect(trial = {}, value) {
  if (trial.answer === undefined || trial.answer === null || trial.answer === '') return false;
  return canonical(trial.answer) === canonical(value);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function shapeSVG(name, size = 70) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', name);
  svg.classList.add('math-shape');
  if (SOLIDS.includes(name)) {
    const forms = {
      sphere: [['circle', {cx:50,cy:50,r:36}], ['ellipse',{cx:50,cy:50,rx:36,ry:13,fill:'none'}]],
      cube: [['polygon',{points:'15,30 50,10 85,30 85,73 50,94 15,73'}],['path',{d:'M15 30 L50 51 L85 30 M50 51 V94',fill:'none'}]],
      cylinder: [['path',{d:'M17 25 V75 C17 96 83 96 83 75 V25 Z'}],['ellipse',{cx:50,cy:25,rx:33,ry:13}]],
      cone: [['path',{d:'M50 8 L88 79 C88 98 12 98 12 79 Z'}],['ellipse',{cx:50,cy:79,rx:38,ry:11,fill:'none'}]]
    };
    for (const [tag, attrs] of forms[name]) {
      const form = document.createElementNS(ns, tag);
      form.setAttribute('fill', 'currentColor');
      form.setAttribute('stroke', '#563047');
      form.setAttribute('stroke-width', '3');
      for (const [key, value] of Object.entries(attrs)) form.setAttribute(key, value);
      svg.append(form);
    }
    return svg;
  }
  const specs = {
    circle: ['circle', {cx: 50, cy: 50, r: 36}],
    oval: ['ellipse', {cx: 50, cy: 50, rx: 42, ry: 27}],
    square: ['rect', {x: 15, y: 15, width: 70, height: 70}],
    rectangle: ['rect', {x: 7, y: 26, width: 86, height: 48}],
    triangle: ['polygon', {points: '50,9 91,86 9,86'}],
    diamond: ['polygon', {points: '50,7 89,50 50,93 11,50'}],
    star: ['polygon', {points: '50,5 61,35 94,36 68,57 78,90 50,71 22,90 32,57 6,36 39,35'}],
    heart: ['path', {d: 'M50 86 C-4 48 9 8 34 17 C43 20 48 27 50 31 C63 3 94 14 92 39 C91 58 71 73 50 86Z'}]
  };
  const spec = specs[name] || specs.circle;
  const path = document.createElementNS(ns, spec[0]);
  for (const [key, value] of Object.entries(spec[1])) path.setAttribute(key, value);
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', '#563047');
  path.setAttribute('stroke-width', '3');
  svg.append(path);
  return svg;
}

function tokenNode(value, size = 62) {
  const name = canonical(value);
  if (SHAPES.includes(name) || SOLIDS.includes(name)) return shapeSVG(name, size);
  if (['large square', 'small square'].includes(name)) {
    const token = element('span', 'math-size-token');
    Object.assign(token.style, {width: `${size}px`, height: `${size}px`, display:'inline-flex', alignItems:'center', justifyContent:'center'});
    const side = name === 'large square' ? size : Math.round(size * 0.52);
    const square = shapeSVG('square', side);
    Object.assign(square.style, {width: `${side}px`, height: `${side}px`});
    token.append(square);
    token.setAttribute('aria-label', name);
    return token;
  }
  if (['sun', 'cloud', 'rain'].includes(name)) {
    const token = element('span', 'math-weather-token', {sun:'☀', cloud:'☁', rain:'☂'}[name]);
    token.setAttribute('role', 'img');
    token.setAttribute('aria-label', name);
    token.style.fontSize = `${size * 0.75}px`;
    return token;
  }
  return element('span', 'math-token-label', labelOf(value && typeof value === 'object' ? value.label ?? value.value : value));
}

/**
 * Mount 1–3 short trials (additional trials are accepted for reuse).
 * Parent code supplies speak(text), onComplete(result), and young for preschool.
 * Returns a cleanup function so navigation can remove this screen safely.
 */
export function mountMathGame(container, trials, {speak = () => {}, onComplete = () => {}, young = false} = {}) {
  if (!container || typeof container.replaceChildren !== 'function') throw new TypeError('A DOM container is required.');
  const lessons = Array.isArray(trials) && trials.length ? trials : [{kind: 'guided', prompt: 'Practice today’s counting together.'}];
  let index = 0;
  let disposed = false;
  let completed = false;
  const results = [];
  const say = text => { if (!disposed) { try { speak(String(text)); } catch { /* Instructions remain visible. */ } } };
  const button = (text, action, className = '') => {
    const node = element('button', `button math-button ${className}`.trim(), text);
    node.type = 'button';
    node.style.minHeight = '56px';
    node.addEventListener('click', action);
    return node;
  };

  function drawTrial() {
    if (disposed) return;
    const trial = lessons[index] || {};
    const kind = String(trial.kind || '').toLowerCase();
    const choices = getMathChoices(trial);
    const answerPresent = choices.some(choice => isMathAnswerCorrect(trial, choice.value));
    const known = SUPPORTED.has(kind) && answerPresent;
    let answered = false;
    let attempts = 0;
    let helpUsed = false;
    let counted = 0;
    const shell = element('section', 'math-game');
    const header = element('p', 'math-progress', `Math play ${index + 1} of ${lessons.length}`);
    const heading = element('h2', 'math-prompt', trial.prompt || 'Let’s explore the numbers together.');
    heading.tabIndex = -1;
    shell.append(header, heading, button('Hear it again', () => say(heading.textContent), 'math-hear'));
    const visual = element('div', 'math-visual');
    const liveCount = element('p', 'math-count-status', '');
    liveCount.setAttribute('role', 'status');
    const feedback = element('p', 'math-feedback', '');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const help = element('div', 'math-model');
    help.hidden = true;
    let demonstrated = false;

    function objects(amount, label = '', {removed = 0, frame = false, frameSize, fillMissing = false, track = true} = {}) {
      if (!validCount(amount) || !validCount(removed) || removed > amount) return false;
      const group = element('div', 'math-group');
      if (label) group.append(element('h3', 'math-group-label', label));
      if (amount === 0 && !frame) group.append(element('p', 'math-empty', 'No counters. Zero!'));
      const slots = frame ? (validCount(frameSize) && frameSize >= amount ? frameSize : amount > 10 ? 20 : 10) : amount;
      let groupCount = 0;
      let filledCount = 0;
      for (let start = 0; start < slots; start += 10) {
        const grid = element('div', `math-object-grid${frame ? ' math-tenframe' : ''}`);
        Object.assign(grid.style, {display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px', margin: '8px 0', maxWidth: '370px'});
        for (let pos = start; pos < Math.min(slots, start + 10); pos++) {
          if (pos >= amount) {
            const empty = fillMissing ? button('＋', () => {
              if (empty.getAttribute('aria-pressed') === 'true') return;
              empty.setAttribute('aria-pressed', 'true');
              empty.classList.add('math-filled');
              filledCount++;
              empty.textContent = String(filledCount);
              liveCount.textContent = `You added ${filledCount} more.`;
              say(filledCount);
            }, 'math-frame-empty') : element('span', 'math-frame-empty');
            if (fillMissing) { empty.setAttribute('aria-label', 'Empty space. Tap to add one.'); empty.setAttribute('aria-pressed','false'); }
            else empty.setAttribute('aria-hidden', 'true');
            Object.assign(empty.style, {minHeight: '48px', border: '2px dashed #a994a1', borderRadius: '10px'});
            grid.append(empty);
            continue;
          }
          const gone = pos >= amount - removed;
          const counter = button('', () => {
            if (counter.getAttribute('aria-pressed') === 'true' || gone || !track) return;
            counter.setAttribute('aria-pressed', 'true');
            counter.classList.add('math-counted');
            counted++;
            groupCount++;
            const spokenCount = kind === 'compare' ? groupCount : counted;
            counter.replaceChildren(element('span', 'math-count-number', spokenCount));
            liveCount.textContent = `${kind === 'compare' && label ? label + ': ' : ''}You counted ${spokenCount}.`;
            say(spokenCount);
          }, `math-counter${gone ? ' math-removed' : ''}`);
          counter.style.minWidth = '0';
          counter.style.padding = '3px';
          counter.setAttribute('aria-label', `${label ? label + ', ' : ''}counter ${pos + 1}${gone ? ', taken away' : ', tap to count'}`);
          counter.setAttribute('aria-pressed', 'false');
          counter.append(shapeSVG('circle', 34));
          if (gone) {
            counter.append(element('span', 'math-cross', '×'));
            counter.style.opacity = '0.6';
            counter.disabled = true;
          }
          grid.append(counter);
        }
        group.append(grid);
      }
      visual.append(group);
      return true;
    }

    if (kind === 'count' && trial.display === 'numberSequence' && Array.isArray(trial.sequence)) {
      const row = element('div', 'math-number-sequence');
      Object.assign(row.style,{display:'flex',flexWrap:'wrap',gap:'10px',fontSize:'2rem'});
      trial.sequence.forEach(value => row.append(element('span', value === null ? 'math-missing' : 'math-number-token', value === null ? '?' : value)));
      visual.append(row);
      demonstrated = true;
    } else if (kind === 'count') {
      demonstrated = objects(trial.count ?? trial.target ?? canonical(trial.answer), '', {frame:['fiveframe','tenframe'].includes(trial.display),frameSize:trial.display === 'fiveframe' ? 5 : undefined});
    } else if (kind === 'tenframe') {
      const missingPart = validCount(trial.given) && validCount(trial.target) && trial.target >= trial.given;
      demonstrated = objects(trial.given ?? trial.count ?? trial.target ?? canonical(trial.answer), missingPart ? `Make ${trial.target}` : 'Ten frame', {frame: true,frameSize:missingPart ? trial.target : undefined,fillMissing:missingPart});
      if (missingPart) visual.prepend(element('p','math-fill-tip','Tap each empty space to add one. Count how many more you add.'));
    } else if (kind === 'add') {
      if (validCount(trial.left) && validCount(trial.right) && trial.left + trial.right <= 20) {
        objects(trial.left, 'First group');
        visual.append(element('p', 'math-operator', '+'));
        objects(trial.right, 'Join this group');
        demonstrated = true;
      }
    } else if (kind === 'subtract') {
      demonstrated = objects(trial.given ?? trial.left, 'Count the counters that stay', {removed: trial.remove ?? trial.right ?? 0});
    } else if (kind === 'compare') {
      if (validCount(trial.target) && Array.isArray(trial.groups) && trial.groups.every(validCount)) {
        objects(trial.target,'Match this group');
        trial.groups.forEach((amount, number) => objects(amount,`Choice ${number + 1}`));
        demonstrated = true;
      } else if (validCount(trial.left) && validCount(trial.right)) {
        objects(trial.left, 'Left group');
        objects(trial.right, 'Right group');
        demonstrated = true;
      }
    } else if (kind === 'shape') {
      const target = canonical(trial.target ?? trial.shape ?? trial.answer);
      if (trial.display === 'position') {
        const position = element('div','math-position-guide');
        Object.assign(position.style,{textAlign:'center',maxWidth:'230px',margin:'12px auto'});
        position.append(element('p','math-position-above','Above ↑'));
        const box = element('div','math-position-box','Inside');
        Object.assign(box.style,{border:'3px solid #563047',padding:'32px 12px',borderRadius:'4px'});
        position.append(box,element('p','math-position-below','↓ Below'));
        visual.append(position);
        demonstrated = true;
      } else if (SHAPES.includes(target) || SOLIDS.includes(target)) {
        // In shape-finding games the choice buttons themselves show every shape.
        if (trial.shape || trial.target || choices.some(choice => !SHAPES.includes(canonical(choice.value)) && !SOLIDS.includes(canonical(choice.value)))) {
          const svg = shapeSVG(target, 148);
          if (trial.display === 'diagonal') {
            const line = document.createElementNS('http://www.w3.org/2000/svg','line');
            for (const [key,value] of Object.entries({x1:15,y1:15,x2:85,y2:85,stroke:'#563047','stroke-width':3})) line.setAttribute(key,value);
            svg.append(line);
          }
          visual.append(svg);
        }
        demonstrated = true;
      }
    } else if (kind === 'pattern' && Array.isArray(trial.sequence) && trial.sequence.length) {
      const row = element('div', 'math-pattern');
      Object.assign(row.style, {display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'});
      for (const item of trial.sequence) row.append(tokenNode(item));
      row.append(element('span', 'math-missing', '?'));
      visual.append(row);
      demonstrated = true;
    } else if (kind === 'sort' && Array.isArray(trial.items) && trial.items.length) {
      const row = element('div', 'math-sort-items');
      Object.assign(row.style, {display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center'});
      for (const item of trial.items) row.append(tokenNode(item));
      visual.append(row);
      demonstrated = true;
    } else if (kind === 'measure') {
      const measures = Array.isArray(trial.items) ? trial.items : [{label:'Left',length:trial.left},{label:'Right',length:trial.right}];
      if (measures.length && measures.every(item => finiteNumber(item.length) && item.length > 0)) {
      const max = Math.max(...measures.map(item => item.length));
      const bars = element('div', 'math-measure');
      measures.forEach(({label, length}) => {
        const row = element('div', 'math-measure-row');
        row.append(element('span', 'math-group-label', `${label} length`));
        const bar = element('div', 'math-measure-bar');
        Object.assign(bar.style, {height: '30px', width: `${length / max * 100}%`, minWidth: '2px', background: '#ad4377', border: '2px solid #563047', borderRadius: '5px', margin: '8px 0 18px'});
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `${label} length, ${length} units`);
        row.append(bar);
        bars.append(row);
      });
      visual.append(bars);
      demonstrated = true;
      }
    }

    // Without a trustworthy visual or an explicit answer, let the grown-up guide.
    const gradeable = known && demonstrated;
    if (['count', 'tenframe', 'add', 'subtract', 'compare'].includes(kind) && demonstrated && trial.display !== 'numberSequence') {
      visual.prepend(element('p', 'math-count-tip', kind === 'compare'
        ? 'Touch each counter. Look at both groups together.'
        : kind === 'subtract' ? 'The crossed-out counters are gone. Touch the ones that stay.' : 'Touch each counter once to count.'));
      visual.append(liveCount, button('Count again', () => drawTrial(), 'math-reset-count'));
    }
    shell.append(visual);
    const choiceRow = element('div', 'choices math-choices');
    Object.assign(choiceRow.style, {display: 'grid', gridTemplateColumns: `repeat(${young ? 2 : Math.min(3, Math.max(1, choices.length))}, minmax(0, 1fr))`, gap: '12px'});
    const finishTrial = assisted => {
      if (answered || disposed) return;
      answered = true;
      assisted = assisted || helpUsed;
      results.push({kind, assisted, attempts});
      for (const choice of choiceRow.querySelectorAll('button')) choice.disabled = true;
      for (const control of visual.querySelectorAll('button')) control.disabled = true;
      helpButton.disabled = true;
      supportButton.disabled = true;
      feedback.textContent = assisted ? 'You practiced together. Well done!' : 'You did it!';
      say(feedback.textContent);
      const next = button(index + 1 < lessons.length ? 'Next little game' : 'Math play finished', () => {
        if (disposed || completed) return;
        if (index + 1 < lessons.length) { index++; drawTrial(); }
        else { completed = true; next.disabled = true; onComplete({trials: results}); }
      }, 'math-next');
      shell.append(next);
      next.focus();
    };
    if (gradeable) {
      choices.forEach(choice => {
        const option = button('', () => {
          if (answered) return;
          attempts++;
          if (isMathAnswerCorrect(trial, choice.value)) finishTrial(false);
          else {
            feedback.textContent = 'Let’s look together. Try again, or tap “Show me.”';
            say(feedback.textContent);
          }
        }, 'choice math-choice');
        const value = canonical(choice.value);
        if (SHAPES.includes(value) || SOLIDS.includes(value) || ['large square','small square','sun','cloud','rain'].includes(value)) option.append(tokenNode(value, 55));
        option.append(element('span', 'math-choice-label', choice.label));
        option.style.fontSize = validCount(value) ? '2rem' : '1.1rem';
        option.setAttribute('aria-label', choice.label);
        choiceRow.append(option);
      });
      shell.append(choiceRow);
    } else {
      shell.append(element('p', 'math-parent-guided', 'Grown-up and child: try this together with the workbook or safe, large objects. Point, talk, or show your thinking.'));
    }
    const helpButton = button('Show me', () => {
      helpUsed = true;
      help.hidden = false;
      let explanation = trial.help || '';
      if (!explanation && gradeable) {
        const answerLabel = choices.find(choice => isMathAnswerCorrect(trial, choice.value)).label;
        if (kind === 'add') explanation = `${trial.left} and ${trial.right} together make ${answerLabel}. Touch every counter together.`;
        else if (kind === 'subtract') explanation = `Start with ${trial.given ?? trial.left}. Take away ${trial.remove ?? trial.right ?? 0}. ${answerLabel} stay. Count the counters without a cross.`;
        else if (kind === 'tenframe' && validCount(trial.given)) explanation = `You have ${trial.given}. Add ${answerLabel} more to make ${trial.target}. Tap each empty space and count how many you add.`;
        else if (kind === 'count' && trial.display === 'numberSequence') explanation = `Say the numbers in order together. The missing number is ${answerLabel}.`;
        else if (kind === 'count' || kind === 'tenframe') explanation = `Touch one counter for each number. There are ${answerLabel} counters altogether.`;
        else if (kind === 'shape' && trial.display === 'diagonal') explanation = `The line goes between opposite corners. Point to each triangle. There are ${answerLabel} triangles.`;
        else if (kind === 'shape' && trial.shape) explanation = `Trace the ${trial.shape} and count its sides and corners together. The answer is ${answerLabel}.`;
        else if (kind === 'shape') explanation = `The answer is ${answerLabel}. Point to it together and explain what you notice.`;
        else if (kind === 'pattern') explanation = `Say the pattern together. The next part is ${answerLabel}.`;
        else explanation = `Look and talk together. The answer is ${answerLabel}. Show how you know.`;
      }
      help.textContent = explanation || 'Grown-up: show one example, then let your child try with your help. Talking and pointing both count as practice.';
      say(help.textContent);
    }, 'math-help');
    const supportButton = button(gradeable ? 'I did it with help' : 'We tried it together', () => finishTrial(true), 'math-assisted');
    shell.append(feedback, help, helpButton, supportButton);
    container.replaceChildren(shell);
    if (index > 0) heading.focus();
    say(heading.textContent);
  }
  drawTrial();
  return () => { disposed = true; };
}
