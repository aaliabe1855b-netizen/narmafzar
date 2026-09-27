// Verification harness for worker.js (run with: node scripts/check-worker.mjs)
// 1) Worker fetch returns HTML
// 2) Client <script> syntax-checks
// 3) Pure geometry/manufacturing core passes numeric assertions
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'worker.js'), 'utf8');

// ---- load worker module ----
const mod = await import(join(root, 'worker.js'));
const worker = mod.default;
const res = await worker.fetch(new Request('https://narmafzar.example/'));
const html = await res.text();
console.log('fetch status      :', res.status);
console.log('content-type      :', res.headers.get('content-type'));
if (res.status !== 200 || !html.includes('<!DOCTYPE html>')) throw new Error('worker did not serve HTML');

// ---- extract client script and syntax check ----
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) throw new Error('no <script> block in HTML');
const clientJS = m[1];
try {
  new Function(clientJS);
  console.log('client script     : syntax OK (' + clientJS.split('\n').length + ' lines)');
} catch (e) {
  console.error('client script SYNTAX ERROR:', e.message);
  throw e;
}

// ---- extract pure core and test ----
const bi = src.indexOf('CORE-PURE-BEGIN');
const ei = src.indexOf('CORE-PURE-END');
if (bi < 0 || ei < 0) throw new Error('pure core markers not found');
const pure = src.slice(src.lastIndexOf('/*', bi), src.indexOf('*/', ei) + 2);
const core = new Function(pure + '\nreturn NEONCORE;')();
console.log('pure core         : loaded');

let fails = 0;
function check(name, cond, detail) {
  if (cond) console.log('  PASS  ' + name);
  else { console.error('  FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); fails++; }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps); }

// ---- demo project must reproduce the spec table exactly ----
const demo = core.demoProject();
check('demo path1 length = 125', near(core.pathLength(demo.paths[0]), 125, 1e-6), core.pathLength(demo.paths[0]));
check('demo path2 length = 82.5', near(core.pathLength(demo.paths[1]), 82.5, 1e-6), core.pathLength(demo.paths[1]));
check('demo path3 length = 47.5', near(core.pathLength(demo.paths[2]), 47.5, 1e-6), core.pathLength(demo.paths[2]));

const pieces = core.buildPieces(demo);
const nodes = core.computeNodes(pieces, demo.settings.nodeTolCm);
check('piece count = 3', pieces.length === 3, pieces.length);
const expect = [
  [125, 50, 'A', 'B'],
  [82.5, 33, 'B', 'C'],
  [47.5, 19, 'C', 'D']
];
for (let i = 0; i < expect.length && i < pieces.length; i++) {
  const p = pieces[i], e = expect[i];
  check('piece ' + (i + 1) + ' length=' + e[0], near(p.lengthCm, e[0], 1e-6), p.lengthCm);
  check('piece ' + (i + 1) + ' cuts=' + e[1], p.cuts === e[1], p.cuts);
  check('piece ' + (i + 1) + ' labels ' + e[2] + '/' + e[3], p.startLabel === e[2] && p.endLabel === e[3], p.startLabel + '/' + p.endLabel);
}

// ---- snapTarget: 83.2 -> 85 (round UP to cutting grid, matching spec) ----
check('snapTarget(83.2, 2.5) = 85', near(core.snapTarget(83.2, 2.5), 85, 1e-9), core.snapTarget(83.2, 2.5));
check('snapTarget(125, 2.5) = 125', near(core.snapTarget(125, 2.5), 125, 1e-9), core.snapTarget(125, 2.5));
check('snapTarget(0.4, 2.5) = 2.5', near(core.snapTarget(0.4, 2.5), 2.5, 1e-9), core.snapTarget(0.4, 2.5));

// ---- snapPath free path: scale about centroid, real length becomes 85 ----
const free = {
  id: 'x', name: 'x', type: 'polyline',
  points: [{ x: 0, y: 0 }, { x: 83.2, y: 0 }],
  ctrl: null, lockedStart: false, lockedEnd: false, snapped: false, snapDelta: 0, origPoints: null, note: ''
};
check('snapPath(free) ok', core.snapPath(free, 2.5) === true);
check('free path real length = 85', near(core.pathLength(free), 85, 1e-6), core.pathLength(free));

// ---- snapPath locked U-shape: endpoints fixed, length hits grid exactly ----
const locked = {
  id: 'u', name: 'u', type: 'polyline',
  points: [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 5, y: 14 }, { x: 10, y: 10 }, { x: 10, y: 0 }],
  ctrl: null, lockedStart: true, lockedEnd: true, snapped: false, snapDelta: 0, origPoints: null, note: ''
};
const L0 = core.pathLength(locked);
check('locked U length before ~ 30.7', L0 > 25 && L0 < 40, L0);
check('snapPath(locked) ok', core.snapPath(locked, 2.5) === true);
const L1 = core.pathLength(locked);
check('locked U length on grid', near(L1 / 2.5, Math.round(L1 / 2.5), 1e-6), L1);
check('locked endpoints unmoved', near(locked.points[0].x, 0, 1e-9) && near(locked.points[0].y, 0, 1e-9) &&
  near(locked.points[4].x, 10, 1e-9) && near(locked.points[4].y, 0, 1e-9));
check('locked length grew to target', L1 >= L0 - 1e-9 || near(L1, core.snapTarget(L0, 2.5), 1e-4), L1);

// ---- bezier length + split ----
const bez = {
  id: 'b', name: 'b', type: 'bezier',
  points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
  ctrl: [{ c1: { x: 3, y: 8 }, c2: { x: 7, y: 8 } }],
  lockedStart: false, lockedEnd: false
};
const LB = core.pathLength(bez);
check('bezier length ~ 16.37 (quadratic-like)', LB > 16 && LB < 17, LB);
const halves = core.pathSplitAt(bez, LB / 2);
check('bezier split lengths match', near(core.pathLength(halves[0]), core.pathLength(halves[1]), 1e-3),
  core.pathLength(halves[0]) + ' vs ' + core.pathLength(halves[1]));
check('bezier split endpoints join', near(core.pathLength(halves[0]) + core.pathLength(halves[1]), LB, 1e-3));

// ---- power: demo total 2.55 m x 10 W/m = 25.5 W -> PSU 40 W @ safety 80% ----
const totalCm = pieces.reduce((a, p) => a + p.lengthCm, 0);
const pw = core.computePower(demo, totalCm);
check('power total = 25.5 W', near(pw.totalW, 25.5, 1e-6), pw.totalW);
check('PSU recommended = 40 W', pw.psuW === 40, pw.psuW);
check('current ~1.06 A', near(pw.amps, 25.5 / 24, 1e-6), pw.amps);

// ---- bin packing: spec example roll=500, pieces 185/125/90/75 -> 1 roll, waste 25 ----
const pack = core.packRolls([185, 125, 90, 75], 500);
check('FFD rolls = 1', pack.count === 1, pack.count);
check('FFD waste = 25 (500-475)', near(pack.totalWaste, 25, 1e-9), pack.totalWaste);
const pack2 = core.packRolls([300, 300, 300], 500);
check('FFD 3x300 in 500 -> 3 rolls', pack2.count === 3, pack2.count);

// ---- long path split into pieces on the cutting grid ----
const longProj = core.demoProject();
longProj.paths = [{
  id: 'L', name: 'NEON 01', type: 'polyline',
  points: [{ x: 0, y: 0 }, { x: 1002.5, y: 0 }],
  ctrl: null, lockedStart: false, lockedEnd: false, snapped: true, snapDelta: 0, origPoints: null, note: ''
}];
longProj.settings.maxPieceLengthCm = 500;
const lp = core.buildPieces(longProj);
check('long path -> 3 pieces', lp.length === 3, lp.length);
check('piece lengths 500/500/2.5', lp.map(p => p.lengthCm).join(',') === '500,500,2.5', lp.map(p => p.lengthCm).join(','));
check('all piece lengths on 2.5 grid', lp.every(p => near(p.lengthCm / 2.5, Math.round(p.lengthCm / 2.5), 1e-6)));

console.log('');
if (fails) {
  console.error(fails + ' check(s) FAILED');
  process.exit(1);
} else {
  console.log('All checks passed ✔');
}
