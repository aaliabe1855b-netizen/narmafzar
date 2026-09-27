// DOM smoke test — executes the client script against a stub DOM and
// exercises init / recompute / draw / panels / checks / print / exports /
// examples / trace / double-line cutter exports.
// Run with: node scripts/smoke-dom.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'worker.js'), 'utf8');
const mod = await import(join(root, 'worker.js'));
const html = await (await mod.default.fetch(new Request('https://x/'))).text();
const clientJS = html.match(/<script>([\s\S]*)<\/script>/)[1];

// ---------- id cross-check ----------
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const jsIds = new Set([...clientJS.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]));
const missing = [...jsIds].filter(id => !htmlIds.has(id));
if (missing.length) {
  console.error('FAIL ids referenced in JS but missing in HTML:', missing.join(', '));
  process.exit(1);
}
console.log('id cross-check    : OK (' + jsIds.size + ' ids)');

// ---------- stub DOM ----------
function makeCtx() {
  const noop = () => {};
  return new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return () => ({ width: 12 });
      if (k === 'getImageData') {
        return (x, y, w, h) => {
          const data = new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4).fill(255);
          return { data, width: w, height: h };
        };
      }
      if (typeof k === 'string') return t[k] !== undefined ? t[k] : noop;
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function makeEl(id) {
  const el = {
    id, tagName: 'DIV', innerHTML: '', textContent: '', value: '', checked: false,
    width: 0, height: 0, clientWidth: 1200, clientHeight: 700, files: null,
    style: {}, children: [],
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(type, fn) { (el._ev[type] = el._ev[type] || []).push(fn); },
    _ev: {},
    removeEventListener() { }, setAttribute() { }, getAttribute() { return null; },
    appendChild(c) { el.children.push(c); }, removeChild() { }, remove() { },
    click() { }, focus() { }, setPointerCapture() { },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 700 }; },
    getContext() { return makeCtx(); },
    toBlob(cb) { cb({ size: 10 }); },
    querySelectorAll() { return []; }
  };
  return el;
}
const els = new Map();
const documentStub = {
  readyState: 'complete',
  getElementById(id) {
    if (!els.has(id)) els.set(id, makeEl(id));
    return els.get(id);
  },
  querySelectorAll() { return []; },
  createElement(tag) { return makeEl('dyn-' + tag); },
  addEventListener() { },
  body: makeEl('body'),
  documentElement: makeEl('html')
};
const storage = new Map();
const localStorageStub = {
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  setItem(k, v) { storage.set(k, String(v)); },
  removeItem(k) { storage.delete(k); },
  key(i) { return [...storage.keys()][i] ?? null; },
  get length() { return storage.size; }
};
const windowStub = {
  devicePixelRatio: 1,
  prompt() { return 'test text'; },
  confirm() { return true; },
  addEventListener() { },
  print() { windowStub.__printed = true; }
};
const urlStub = { createObjectURL: () => 'blob:stub', revokeObjectURL() { } };
class BlobStub { constructor(parts) { this.size = String(parts[0]).length; } }

const api = new Function(
  'window', 'document', 'localStorage', 'DOMParser', 'FileReader', 'Blob', 'URL', 'setTimeout',
  clientJS + '\n;return { S, recompute, draw, showCheck, buildPrint, exportSVG, exportDXF, exportPNG, exportCSV, exportJSON, exportCutSvg, exportCutDxf, snapAll, setTool, runChecks, pathD, doPrint, svgBody, renderCutList, saveProject, saveProfile, loadExample, channelForPath, openTraceFromImage, updateTracePreview, applyTrace, demoCafeProject, demoShapesProject, openHelp };'
)(windowStub, documentStub, localStorageStub, function () { }, function () { }, BlobStub, urlStub, (fn) => fn());

let fails = 0;
function check(name, cond, detail) {
  if (cond) console.log('  PASS  ' + name);
  else { console.error('  FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); fails++; }
}

// ---------- scenario ----------
check('default demo loaded (PRO cafe)', api.S.project.paths.length >= 2, api.S.project.paths.length);
check('help auto-opens on first visit', !els.get('modalHelp').classList.contains('hidden'));
check('help content present in page', html.includes('راهنمای کامل NEON CAD') && html.includes('گردش کار کلی') && html.includes('فایل برش‌دهنده'));
els.get('modalHelp').classList.add('hidden');
api.openHelp();
check('HELP button reopens guide', !els.get('modalHelp').classList.contains('hidden'));
const cutHtml0 = els.get('cutBody').innerHTML;
check('default cut list has rows', cutHtml0.includes('<tr>'));
check('materials rendered', els.get('matGrid').innerHTML.includes('TOTAL NEON'));
check('rolls panel rendered', els.get('rollPanel').innerHTML.includes('ROLL 01'));

// chain example must reproduce the spec table exactly
api.loadExample('chain');
const cutHtml = els.get('cutBody').innerHTML;
check('chain: 125 cm', cutHtml.includes('125 cm'));
check('chain: 82.5 cm', cutHtml.includes('82.5 cm'));
check('chain: 47.5 cm', cutHtml.includes('47.5 cm'));
check('chain: labels A/B/C/D', ['>A<', '>B<', '>C<', '>D<'].every(s => cutHtml.includes(s)));

api.draw();
api.showCheck();
check('CHECK DESIGN modal opened', !els.get('modalCheck').classList.contains('hidden'));
check('check list has items', els.get('checkList').innerHTML.includes('issue') || els.get('checkList').innerHTML.includes('All checks passed'),
  els.get('checkList').innerHTML.slice(0, 120));

api.buildPrint();
const pr = els.get('printArea').innerHTML;
check('print sheet has CUT LIST', pr.includes('CUT LIST'));
check('print sheet has Persian headers', pr.includes('شماره') && pr.includes('طول') && pr.includes('تعداد برش') && pr.includes('شروع') && pr.includes('پایان'));
check('print sheet has design svg', pr.includes('<svg'));

api.exportSVG();
api.exportDXF();
api.exportCSV();
api.exportJSON();
api.exportPNG();
api.exportCutSvg();
api.exportCutDxf();
check('all exports run without error', true);

// shapes example: many smooth pieces, everything on the cutting grid
api.loadExample('shapes');
check('shapes example has many paths', api.S.project.paths.length >= 10, api.S.project.paths.length);
api.recompute();
const allOnGrid = api.S.pieces.every(p => Math.abs(p.lengthCm / 2.5 - Math.round(p.lengthCm / 2.5)) < 1e-4);
check('all shape pieces snapped to 2.5 grid', allOnGrid,
  api.S.pieces.filter(p => Math.abs(p.lengthCm / 2.5 - Math.round(p.lengthCm / 2.5)) >= 1e-4).map(p => p.lengthCm).join(','));

// double-line channel around the first path
const ch = api.channelForPath(api.S.project.paths[0]);
check('channel: left/right/center built', !!(ch && ch.left.length > 1 && ch.right.length > 1 && ch.center.length > 1));
if (ch) {
  const half = (api.S.project.settings.channelMm || 10) / 20;
  let dmin = 1e9, dmax = 0;
  for (let i = 0; i < ch.left.length && i < ch.center.length; i++) {
    const d = Math.hypot(ch.left[i].x - ch.center[Math.min(i, ch.center.length - 1)].x,
      ch.left[i].y - ch.center[Math.min(i, ch.center.length - 1)].y);
    dmin = Math.min(dmin, d); dmax = Math.max(dmax, d);
  }
  check('channel half-width respected', dmax <= half * 3 + 0.01 && dmin >= half * 0.2, 'min=' + dmin + ' max=' + dmax + ' half=' + half);
}

// trace pipeline (blank stub image -> must run without errors)
api.openTraceFromImage({ width: 80, height: 60 });
api.updateTracePreview();
api.applyTrace();
check('trace pipeline runs', true);
check('trace modal closes after apply', els.get('modalTrace').classList.contains('hidden'));

api.saveProject();
api.saveProfile();
check('localStorage save works', storage.size >= 2, storage.size);

console.log('');
if (fails) { console.error(fails + ' smoke check(s) FAILED'); process.exit(1); }
console.log('DOM smoke test passed ✔');
