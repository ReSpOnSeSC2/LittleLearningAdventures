/** Pure, DOM-free ordered tracing geometry. All distances use the caller's units. */
const EPSILON = 1e-7;
const copy = point => point ? {x: point.x, y: point.y} : null;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function readPoint(value) {
  const x = Array.isArray(value) ? value[0] : value?.x;
  const y = Array.isArray(value) ? value[1] : value?.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Each tracing point needs finite x and y coordinates.');
  return {x, y};
}

function prepareStroke(input) {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError('Each stroke needs at least one point.');
  const points = [];
  for (const value of input) {
    const point = readPoint(value);
    if (!points.length || distance(points.at(-1), point) > EPSILON) points.push(point);
  }
  const segments = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const size = distance(points[i - 1], points[i]);
    segments.push({a: points[i - 1], b: points[i], start: length, end: length + size, length: size});
    length += size;
  }
  return {points, segments, length};
}

function pointAt(stroke, arc) {
  if (!stroke.segments.length) return copy(stroke.points[0]);
  const value = clamp(arc, 0, stroke.length);
  const segment = stroke.segments.find(part => value <= part.end + EPSILON) || stroke.segments.at(-1);
  const t = clamp((value - segment.start) / segment.length, 0, 1);
  return {x: segment.a.x + (segment.b.x - segment.a.x) * t, y: segment.a.y + (segment.b.y - segment.a.y) * t};
}

function project(stroke, point, low, high, preferredArc) {
  let best = null;
  for (const segment of stroke.segments) {
    if (segment.end < low - EPSILON || segment.start > high + EPSILON) continue;
    const from = Math.max(0, (low - segment.start) / segment.length);
    const to = Math.min(1, (high - segment.start) / segment.length);
    if (from > to) continue;
    const dx = segment.b.x - segment.a.x, dy = segment.b.y - segment.a.y;
    const t = clamp(((point.x - segment.a.x) * dx + (point.y - segment.a.y) * dy) / segment.length ** 2, from, to);
    const snapped = {x: segment.a.x + t * dx, y: segment.a.y + t * dy};
    const arc = segment.start + t * segment.length;
    const gap = distance(point, snapped);
    // At crossings, equal-distance candidates favor the current local position.
    if (!best || gap < best.distance - EPSILON || (Math.abs(gap - best.distance) <= EPSILON && Math.abs(arc - preferredArc) < Math.abs(best.arc - preferredArc))) {
      best = {point: snapped, arc, distance: gap};
    }
  }
  return best;
}

function centerlineBetween(stroke, from, to) {
  const result = [pointAt(stroke, from)];
  const low = Math.min(from, to), high = Math.max(from, to);
  const corners = stroke.segments.filter(segment => segment.end > low + EPSILON && segment.end < high - EPSILON).map(segment => ({arc: segment.end, point: segment.b}));
  if (to < from) corners.reverse();
  for (const corner of corners) result.push(copy(corner.point));
  const last = pointAt(stroke, to);
  if (distance(result.at(-1), last) > EPSILON) result.push(last);
  return result;
}

/**
 * Create a guided tracer for ordered strokes, each an array of {x,y} or [x,y].
 * Coordinates/options should be in displayed CSS pixels, not canvas device pixels.
 * Consecutive duplicate points collapse; a one-point stroke is a tappable dot.
 * Empty strokes, nonfinite points, and invalid options throw before interaction.
 *
 * Options (positive distances unless noted):
 * corridor=18: accepted distance from the nearby centerline.
 * startRadius=24 / resumeRadius=24: initial/resume touch distance from the marker.
 * lookAhead=48: maximum forward centerline window per pointer event.
 * maxStep=64: maximum straight-line distance per pointer event.
 * backtrack=48: local backward window, may be zero; progress never decreases.
 * dotThreshold=1: strokes no longer than this distance complete on a start tap.
 * endTolerance=3: endpoint tolerance, capped at 10% of this stroke's length.
 * maxArcRatio=1.45: maximum path travel / pointer travel ratio (>=1).
 *
 * pointerDown(x,y) begins at the current start/resume marker. pointerMove(x,y)
 * follows only the local path. pointerUp() ends input while preserving progress.
 * Accepted results provide `point` plus `drawPoints`: render each drawPoint in
 * order rather than drawing a chord between two distant curve/corner positions.
 * Rejected movement leaves the last valid anchor unchanged, so returning to the
 * marker/path works immediately. Every next stroke requires a new pointerDown.
 *
 * Result: {accepted, reason, point, drawPoints, strokeIndex, strokeProgress,
 * strokeComplete, complete}. strokeIndex refers to the stroke just handled.
 * getState()/state expose the NEXT active stroke after a stroke completes:
 * {strokeIndex, strokeCount, completedStrokes, strokeProgress, strokeLength,
 * totalProgress, complete, isDrawing, currentPoint, cursorPoint}.
 * totalProgress is a 0..1 fraction, weighting each stroke equally, including dots.
 * currentPoint marks the furthest valid progress; cursorPoint may backtrack.
 * reset() starts over and returns a fresh state snapshot. No returned objects
 * share mutable point references with the model or internal state.
 */
export function createGuidedTracer(strokes, options = {}) {
  if (!Array.isArray(strokes) || strokes.length === 0) throw new TypeError('Provide at least one tracing stroke.');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Tracing options must be an object.');
  const model = strokes.map(prepareStroke);
  const settings = {corridor: 18, startRadius: 24, resumeRadius: 24, lookAhead: 48, maxStep: 64, backtrack: 48, dotThreshold: 1, endTolerance: 3, maxArcRatio: 1.45, ...options};
  for (const key of ['corridor', 'startRadius', 'resumeRadius', 'lookAhead', 'maxStep']) {
    if (!Number.isFinite(settings[key]) || settings[key] <= 0) throw new RangeError(`${key} must be a positive finite number.`);
  }
  for (const key of ['backtrack', 'dotThreshold', 'endTolerance']) {
    if (!Number.isFinite(settings[key]) || settings[key] < 0) throw new RangeError(`${key} must be a nonnegative finite number.`);
  }
  if (!Number.isFinite(settings.maxArcRatio) || settings.maxArcRatio < 1) throw new RangeError('maxArcRatio must be at least one.');
  let index = 0, progress = 0, cursor = 0, drawing = false, previousInput = null;
  const complete = () => index === model.length;

  function getState() {
    const stroke = model[index];
    return {strokeIndex: index, strokeCount: model.length, completedStrokes: index, strokeProgress: progress,
      strokeLength: stroke?.length ?? 0, totalProgress: complete() ? 1 : (index + (stroke.length ? progress / stroke.length : 0)) / model.length,
      complete: complete(), isDrawing: drawing, currentPoint: stroke ? pointAt(stroke, progress) : null,
      cursorPoint: stroke ? pointAt(stroke, cursor) : null};
  }
  function reject(reason) {
    return {accepted: false, reason, point: null, drawPoints: [], strokeIndex: index, strokeProgress: progress, strokeComplete: false, complete: complete()};
  }
  function accept(point, drawPoints, strokeComplete = false) {
    const handledIndex = index, handledProgress = progress;
    if (strokeComplete) {index++;progress = 0;cursor = 0;drawing = false;previousInput = null;}
    return {accepted: true, reason: strokeComplete ? 'stroke-complete' : 'accepted', point: copy(point),
      drawPoints: drawPoints.map(copy), strokeIndex: handledIndex, strokeProgress: handledProgress, strokeComplete, complete: complete()};
  }
  function pointerPoint(x, y) {return Number.isFinite(x) && Number.isFinite(y) ? {x, y} : null;}

  function pointerDown(x, y) {
    drawing = false;previousInput = null;
    if (complete()) return reject('complete');
    const input = pointerPoint(x, y);if (!input) return reject('invalid-point');
    const stroke = model[index], marker = pointAt(stroke, progress);
    const radius = progress > EPSILON ? settings.resumeRadius : settings.startRadius;
    if (distance(input, marker) > radius) return reject(progress > EPSILON ? 'resume-too-far' : 'start-too-far');
    drawing = true;cursor = progress;
    // The forgiving start area snaps to the marker, establishing a safe anchor.
    previousInput = copy(marker);
    const dot = stroke.length <= settings.dotThreshold;
    if (dot) progress = stroke.length;
    return accept(marker, [marker], dot);
  }

  function pointerMove(x, y) {
    if (complete()) return reject('complete');
    if (!drawing) return reject('start-required');
    const input = pointerPoint(x, y);if (!input) return reject('invalid-point');
    const travel = distance(previousInput, input);
    if (travel > settings.maxStep + EPSILON) return reject('step-too-large');
    const stroke = model[index], low = Math.max(0, cursor - settings.backtrack), high = Math.min(stroke.length, cursor + settings.lookAhead);
    const nearest = project(stroke, input, low, high, cursor);
    if (!nearest || nearest.distance > settings.corridor + EPSILON) return reject('off-path');
    const arcTravel = Math.abs(nearest.arc - cursor);
    if ((travel <= EPSILON && arcTravel > EPSILON) || arcTravel > travel * settings.maxArcRatio + Math.min(2, settings.corridor / 4)) return reject('shortcut');
    // A valid endpoint alone is insufficient: the movement connecting the last
    // accepted touch to it must also stay near this local stretch of the path.
    const steps = Math.max(1, Math.ceil(travel / Math.max(2, settings.corridor / 3)));
    for (let i = 1; i < steps; i++) {
      const sample = {x: previousInput.x + (input.x - previousInput.x) * i / steps, y: previousInput.y + (input.y - previousInput.y) * i / steps};
      const projected = project(stroke, sample, Math.min(cursor, nearest.arc), Math.max(cursor, nearest.arc), cursor);
      if (!projected || projected.distance > settings.corridor + EPSILON) return reject('shortcut');
    }
    const endpointTolerance = Math.min(settings.endTolerance, stroke.length * 0.1);
    const finished = nearest.arc >= stroke.length - endpointTolerance && distance(input, stroke.points.at(-1)) <= settings.corridor;
    const newCursor = finished ? stroke.length : nearest.arc;
    const drawPoints = centerlineBetween(stroke, cursor, newCursor);
    cursor = newCursor;progress = Math.max(progress, cursor);previousInput = copy(input);
    return accept(pointAt(stroke, cursor), drawPoints, finished);
  }

  function pointerUp() {drawing = false;previousInput = null;return reject('pointer-up');}
  function reset() {index = 0;progress = 0;cursor = 0;drawing = false;previousInput = null;return getState();}
  return {pointerDown, pointerMove, pointerUp, getState, reset, get state() {return getState();}};
}
