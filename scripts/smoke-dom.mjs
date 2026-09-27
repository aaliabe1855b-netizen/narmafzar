// DOM smoke test — executes the client script against a stub DOM and
// exercises init / recompute / draw / panels / checks / print / exports.
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
  clientJS + '\n;return { S, recompute, draw, showCheck, buildPrint, exportSVG, exportDXF, exportPNG, exportCSV, exportJSON, snapAll, setTool, runChecks, pathD, doPrint, svgBody, renderCutList, saveProject, saveProfile };'
)(windowStub, documentStub, localStorageStub, function () { }, function () { }, BlobStub, urlStub, (fn) => fn());

let fails = 0;
function check(name, cond, detail) {
  if (cond) console.log('  PASS  ' + name);
  else { console.error('  FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); fails++; }
}

// ---------- scenario ----------
const cutHtml = els.get('cutBody').innerHTML;
check('cut list rendered rows', cutHtml.includes('<tr>'), cutHtml.slice(0, 80));
check('cut list shows 125 cm', cutHtml.includes('125 cm'));
check('cut list shows 82.5 cm', cutHtml.includes('82.5 cm'));
check('cut list shows 47.5 cm', cutHtml.includes('47.5 cm'));
check('cut list shows labels A/B/C/D', ['>A<', '>B<', '>C<', '>D<'].every(s => cutHtml.includes(s)));
check('materials rendered', els.get('matGrid').innerHTML.includes('TOTAL NEON'));
check('power card shows 25.5 W', els.get('matGrid').innerHTML.includes('25.5 W'), els.get('matGrid').innerHTML.match(/25\.5[^<]*/));
check('PSU card shows 40 W', els.get('matGrid').innerHTML.includes('40 W'));
check('rolls panel rendered', els.get('rollPanel').innerHTML.includes('ROLL 01'));
check('status total', els.get('stTotal').innerHTML.includes('255 cm') || els.get('stTotal').innerHTML.includes('255'), els.get('stTotal').innerHTML);

api.draw();
check('draw() runs', true);

api.showCheck();
check('CHECK DESIGN modal opened', !els.get('modalCheck').classList.contains('hidden'));
check('check list has items', els.get('checkList').innerHTML.includes('issue') || els.get('checkList').innerHTML.includes('All checks passed'),
  els.get('checkList').innerHTML.slice(0, 120));

api.buildPrint();
const pr = els.get('printArea').innerHTML;
check('print sheet has CUT LIST', pr.includes('CUT LIST'));
check('print sheet has Persian headers', pr.includes('شماره') && pr.includes('طول') && pr.includes('تعداد برش') && pr.includes('شروع') && pr.includes('پایان'));
check('print sheet has design svg', pr.includes('<svg'));
check('print sheet has power row', pr.includes('25.5'));
check('print sheet has rolls table', pr.includes('پرت') || pr.includes('WASTE'));

api.exportSVG();
api.exportDXF();
api.exportCSV();
api.exportJSON();
api.exportPNG();
check('all exports run without error', true);

api.snapAll();
check('snapAll runs', true);

api.setTool('pen');
api.S.project.paths.push({
  id: 'new1', name: '', type: 'polyline',
  points: [{ x: 10, y: 60 }, { x: 30, y: 60 }, { x: 30, y: 80 }],
  ctrl: null, lockedStart: false, lockedEnd: false, snapped: false, snapDelta: 0, origPoints: null, note: ''
});
api.recompute();
check('new path auto-numbered NEON 04', api.S.project.paths[3].name === 'NEON 04', api.S.project.paths[3].name);
const p4len = api.S.pieces.length;
check('pieces rebuilt (4 rows)', api.S.pieces.length === 4, api.S.pieces.length);
check('new piece on 2.5 grid', Math.abs(api.S.pieces[3].lengthCm / 2.5 - Math.round(api.S.pieces[3].lengthCm / 2.5)) < 1e-6,
  api.S.pieces[3].lengthCm);
api.draw();
api.showCheck();
api.buildPrint();
check('rebuild after edit works', els.get('printArea').innerHTML.includes('NEON 04'));

api.saveProject();
api.saveProfile();
check('localStorage save works', storage.size >= 2, storage.size);

console.log('');
if (fails) { console.error(fails + ' smoke check(s) FAILED'); process.exit(1); }
console.log('DOM smoke test passed ✔');
