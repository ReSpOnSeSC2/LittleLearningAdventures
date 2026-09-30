/**
 * Little drawings for Vivian's games, made as SVG strings (no image files): the weekly egg,
 * shapes, paint, cups, nests, a plate for Didi, and letter tiles inside story scenes.
 */
export const SHAPE_NAMES = ['circle', 'square', 'triangle', 'heart', 'star', 'rectangle', 'oval', 'diamond'];
const SHAPE_COLORS = {circle: ['#ffc9c9', '#e03131'], square: ['#a5d8ff', '#1971c2'], triangle: ['#ffec99', '#f08c00'], heart: ['#fcc2d7', '#d6336c'], star: ['#ffe066', '#f59f00'],
  rectangle: ['#b2f2bb', '#2f9e44'], oval: ['#d0bfff', '#7048e8'], diamond: ['#99e9f2', '#0c8599']};
export function shapeSvg(name, size = 110, colors = null) {
  const [fill, edge] = colors || SHAPE_COLORS[name] || ['#e9ecef', '#495057'];
  const f = `fill="${fill}" stroke="${edge}" stroke-width="6" stroke-linejoin="round"`;
  const body = {
    circle: `<circle cx="50" cy="50" r="38" ${f}/>`,
    square: `<rect x="14" y="14" width="72" height="72" rx="3" ${f}/>`,
    triangle: `<polygon points="50,10 91,86 9,86" ${f}/>`,
    heart: `<path d="M50 86 C20 64 8 48 8 32 C8 18 19 9 31 9 C40 9 46 14 50 21 C54 14 60 9 69 9 C81 9 92 18 92 32 C92 48 80 64 50 86 Z" ${f}/>`,
    star: `<polygon points="50,6 61,37 94,37 67,56 78,89 50,69 22,89 33,56 6,37 39,37" ${f}/>`,
    rectangle: `<rect x="5" y="26" width="90" height="48" rx="3" ${f}/>`,
    oval: `<ellipse cx="50" cy="50" rx="44" ry="29" ${f}/>`,
    diamond: `<polygon points="50,6 88,50 50,94 12,50" ${f}/>`
  }[name] || '';
  return `<svg class="v-shape" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${name}">${body}</svg>`;
}

/* The week's egg: speckles in the unit colour; cracks grow with each finished day (0-4); 5 = hatched shell. */
export function eggSvg(stage = 0, color = '#2f9e44', size = 120) {
  const cracks = [
    'M38 44 L44 50 L40 56',
    'M60 36 L55 43 L62 48 L57 54',
    'M30 62 L38 60 L42 67 L50 63',
    'M52 70 L58 66 L64 72 L70 67'
  ].slice(0, Math.max(0, Math.min(4, stage))).map(d => `<path d="${d}" fill="none" stroke="#5c4033" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  if (stage >= 5) {
    return `<svg class="v-egg-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><path d="M16 64 L24 56 L32 64 L40 55 L48 64 L56 55 L64 64 L72 55 L80 64 L84 60 C86 82 70 94 50 94 C30 94 14 82 16 64 Z" fill="#fffaf0" stroke="#d8c7a8" stroke-width="3"/>
      <circle cx="34" cy="80" r="4" fill="${color}" opacity=".45"/><circle cx="62" cy="84" r="5" fill="${color}" opacity=".45"/></svg>`;
  }
  return `<svg class="v-egg-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="50" cy="94" rx="26" ry="4" fill="#0000001a"/>
    <path d="M50 8 C74 8 86 42 86 62 C86 82 70 94 50 94 C30 94 14 82 14 62 C14 42 26 8 50 8 Z" fill="#fffaf0" stroke="#d8c7a8" stroke-width="3"/>
    <circle cx="36" cy="30" r="5" fill="${color}" opacity=".5"/><circle cx="62" cy="24" r="4" fill="${color}" opacity=".45"/><circle cx="68" cy="58" r="7" fill="${color}" opacity=".45"/>
    <circle cx="30" cy="74" r="6" fill="${color}" opacity=".45"/><circle cx="50" cy="84" r="4" fill="${color}" opacity=".4"/><circle cx="44" cy="46" r="3" fill="${color}" opacity=".35"/>
    <path d="M32 20 C36 14 42 12 46 12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>${cracks}</svg>`;
}

export function splatSvg(hex, size = 84, label = '') {
  const light = ['#ffffff', '#fff'].includes(String(hex).toLowerCase());
  return `<svg class="v-splat" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label}"><path d="M50 8 C62 8 64 20 74 20 C86 20 92 32 88 42 C84 52 94 58 90 70 C86 82 72 80 66 88 C60 96 44 96 38 88 C32 80 16 84 12 72 C8 60 18 54 14 44 C10 32 20 20 32 22 C40 23 40 8 50 8 Z" fill="${hex}" stroke="${light ? '#adb5bd' : '#00000026'}" stroke-width="3"/><ellipse cx="38" cy="36" rx="9" ry="6" fill="#ffffff" opacity=".35"/></svg>`;
}
export function paintPotSvg(hex, size = 92, label = '') {
  const light = ['#ffffff', '#fff'].includes(String(hex).toLowerCase());
  return `<svg class="v-pot" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label}"><path d="M18 40 L82 40 L76 90 C75 94 72 96 68 96 L32 96 C28 96 25 94 24 90 Z" fill="#e9ecef" stroke="#868e96" stroke-width="3"/>
    <ellipse cx="50" cy="40" rx="32" ry="9" fill="${hex}" stroke="${light ? '#adb5bd' : '#00000033'}" stroke-width="3"/><path d="M34 42 C34 56 40 58 40 66" fill="none" stroke="${hex}" stroke-width="7" stroke-linecap="round"/>
    <path d="M30 18 L46 36" stroke="#8d6e63" stroke-width="6" stroke-linecap="round"/><path d="M44 33 L52 42" stroke="${hex}" stroke-width="9" stroke-linecap="round"/></svg>`;
}
export function cupSvg(level, size = 96) {
  const top = 20, bottom = 88; const h = (bottom - top) * level; const y = bottom - h;
  return `<svg class="v-cup" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${level >= 1 ? 'a full cup' : level <= 0 ? 'an empty cup' : 'a cup with some water'}">
    <defs><clipPath id="cupclip${Math.round(level * 100)}"><path d="M22 18 L78 18 L70 90 L30 90 Z"/></clipPath></defs>
    <g clip-path="url(#cupclip${Math.round(level * 100)})"><rect x="0" y="${y}" width="100" height="${h + 4}" fill="#74c0fc"/>${level > 0 ? `<rect x="0" y="${y}" width="100" height="4" fill="#a5d8ff"/>` : ''}</g>
    <path d="M22 18 L78 18 L70 90 L30 90 Z" fill="none" stroke="#495057" stroke-width="4" stroke-linejoin="round"/><path d="M30 26 L34 80" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`;
}
export function nestSvg(size = 110) {
  return `<svg class="v-nest" viewBox="0 0 100 60" width="${size}" height="${size * 0.6}" aria-hidden="true"><path d="M6 24 C10 50 30 58 50 58 C70 58 90 50 94 24 Z" fill="#a9754f" stroke="#7c5236" stroke-width="3"/>
    <path d="M10 30 C30 40 70 40 90 30 M14 40 C34 48 66 48 86 40 M20 48 C40 54 60 54 80 48" fill="none" stroke="#7c5236" stroke-width="2.5"/><ellipse cx="50" cy="24" rx="44" ry="8" fill="#8b5e3c" stroke="#7c5236" stroke-width="3"/></svg>`;
}
export function plateSvg(size = 160) {
  return `<svg class="v-plate-svg" viewBox="0 0 100 40" width="${size}" height="${size * 0.4}" aria-hidden="true"><ellipse cx="50" cy="22" rx="48" ry="16" fill="#fff" stroke="#adb5bd" stroke-width="3"/><ellipse cx="50" cy="20" rx="32" ry="9" fill="#f1f3f5"/></svg>`;
}
export function dotsSvg(n, size = 44, color = '#1c7ed6') {
  const pos = {1: [[50, 50]], 2: [[30, 50], [70, 50]], 3: [[25, 70], [50, 30], [75, 70]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]], 7: [[28, 22], [72, 22], [28, 50], [50, 50], [72, 50], [28, 78], [72, 78]], 8: [[28, 20], [72, 20], [28, 40], [72, 40], [28, 60], [72, 60], [28, 80], [72, 80]],
    9: [[25, 25], [50, 25], [75, 25], [25, 50], [50, 50], [75, 50], [25, 75], [50, 75], [75, 75]], 10: [[20, 30], [35, 30], [50, 30], [65, 30], [80, 30], [20, 70], [35, 70], [50, 70], [65, 70], [80, 70]]}[n] || [];
  const r = n > 6 ? 7 : 10;
  return `<svg class="v-dots" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`).join('')}</svg>`;
}
export function letterTileSvg(ch, x, y, h) {
  const w = h * 0.86;
  return `<g><rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="${h * 0.18}" fill="#fff" stroke="#e64980" stroke-width="1.2"/><text x="${x}" y="${y - h * 0.24}" font-size="${h * 0.72}" text-anchor="middle" font-family="Andika, system-ui, sans-serif" font-weight="700" fill="#c2255c">${ch}</text></g>`;
}
/* Water for sink or float: returns the tank; the item sits on top (floats) or at the bottom (sinks). */
export function tankSvg(width = 240) {
  return `<svg class="v-tank-svg" viewBox="0 0 120 80" width="${width}" height="${width * 2 / 3}" aria-hidden="true"><rect x="4" y="6" width="112" height="70" rx="8" fill="#e7f5ff" stroke="#74c0fc" stroke-width="3"/>
    <path d="M6 26 C18 22 26 30 38 26 C50 22 58 30 70 26 C82 22 90 30 102 26 C108 24 112 25 114 26 L114 74 L6 74 Z" fill="#74c0fc" opacity=".55"/></svg>`;
}
