// =============================================================================
// NEON CAD — نرم‌افزار طراحی و آماده‌سازی تابلو نئون
// Single-file Cloudflare Worker — serves the complete client-side app.
// All geometry, cut-list, power and bin-packing processing runs in the browser.
// No build step, no external dependencies. See docs/DESIGN.md and README.md.
// =============================================================================

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NEON CAD — Neon Sign Designer</title>
<style>
:root{
  --bg:#0b0f14; --panel:#121820; --panel2:#18202b; --line:#243041; --line2:#2e3d52;
  --txt:#d9e2ee; --dim:#8fa3b8; --acc:#22d3ee; --acc2:#f472b6; --ok:#34d399;
  --err:#f87171; --warn:#fbbf24; --gold:#fbbf24;
}
*{box-sizing:border-box; margin:0; padding:0;}
html,body{height:100%;}
body{
  background:var(--bg); color:var(--txt);
  font-family:"Segoe UI", Tahoma, Arial, sans-serif; font-size:13px; overflow:hidden;
}
.app{display:flex; flex-direction:column; height:100vh;}
button{font-family:inherit;}
input,select,textarea{
  background:#0e141c; color:var(--txt); border:1px solid var(--line2);
  border-radius:6px; padding:5px 8px; font-size:12px; outline:none; width:100%;
}
input:focus,select:focus{border-color:var(--acc);}
input[type=checkbox]{width:auto;}
label{color:var(--dim); font-size:11px;}

/* ---------- TOP BAR ---------- */
.topbar{
  display:flex; align-items:center; gap:8px; padding:8px 12px;
  background:linear-gradient(180deg,#141c26,#10161e); border-bottom:1px solid var(--line);
  flex-wrap:wrap;
}
.brand{font-size:18px; font-weight:800; letter-spacing:1px; margin-right:6px;}
.brand span{color:var(--acc);}
.brand small{display:block; font-size:9px; color:var(--dim); letter-spacing:2px; font-weight:400;}
.btn{
  background:#1a2431; color:var(--txt); border:1px solid var(--line2); border-radius:7px;
  padding:7px 12px; font-size:12px; cursor:pointer; white-space:nowrap; transition:.15s;
}
.btn:hover{background:#22304180; border-color:var(--acc); color:#fff;}
.btn.primary{background:linear-gradient(135deg,#0e7490,#155e75); border-color:#0891b2;}
.btn.primary:hover{background:linear-gradient(135deg,#0891b2,#0e7490);}
.btn.accent{background:linear-gradient(135deg,#9d174d,#831843); border-color:#db2777;}
.btn.accent:hover{background:linear-gradient(135deg,#db2777,#9d174d);}
.btn.mode-auto{background:linear-gradient(135deg,#065f46,#064e3b); border-color:#10b981; color:#d1fae5;}
.btn.mode-manual{background:linear-gradient(135deg,#7c2d12,#7c2d12); border-color:#f97316; color:#ffedd5;}
.btn.sm{padding:5px 9px; font-size:11px;}
.sep{width:1px; height:26px; background:var(--line2); margin:0 2px;}
.proj-name{width:180px; font-weight:600;}
.export-group{display:flex; gap:4px;}

/* ---------- LAYOUT ---------- */
.main{display:flex; flex:1; min-height:0;}
.tools{
  width:92px; background:var(--panel); border-right:1px solid var(--line);
  padding:10px 8px; display:flex; flex-direction:column; gap:6px; overflow-y:auto;
}
.tool{
  display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 4px;
  background:#0f1722; border:1px solid var(--line); border-radius:9px; cursor:pointer;
  color:var(--dim); font-size:10px; letter-spacing:.4px;
}
.tool .ico{font-size:17px; line-height:1;}
.tool:hover{border-color:var(--acc); color:var(--txt);}
.tool.active{background:linear-gradient(160deg,#164e63,#0e3746); border-color:var(--acc); color:#e0f7ff;}
.tool-h{font-size:9px; color:#5b6c80; letter-spacing:2px; margin:6px 2px 2px;}

.canvas-wrap{flex:1; position:relative; min-width:0; background:#080c11;}
#cv{width:100%; height:100%; display:block; cursor:crosshair; touch-action:none;}
.hud{
  position:absolute; top:10px; left:10px; background:#0f1722dd; border:1px solid var(--line2);
  border-radius:8px; padding:6px 10px; font-size:11px; color:var(--dim); pointer-events:none;
}
.hud b{color:var(--acc); font-weight:600;}

/* ---------- PROPERTIES ---------- */
.props{
  width:296px; background:var(--panel); border-left:1px solid var(--line);
  overflow-y:auto; padding:12px;
}
.p-h{font-size:10px; letter-spacing:2px; color:#5b6c80; margin:12px 0 8px; border-bottom:1px solid var(--line); padding-bottom:5px;}
.p-h:first-child{margin-top:0;}
.p-grid{display:grid; grid-template-columns:1fr 1fr; gap:8px;}
.p-row{display:flex; flex-direction:column; gap:3px; margin-bottom:8px;}
.p-row .unit{position:relative;}
.p-row .unit input{padding-right:34px;}
.p-row .unit i{
  position:absolute; right:8px; top:50%; transform:translateY(-50%);
  color:#5b6c80; font-style:normal; font-size:10px;
}
.p-actions{display:flex; gap:6px; margin:8px 0;}
.hint{font-size:10px; color:#5b6c80; line-height:1.5;}
.sel-\boxed{background:#0f1722; border:1px solid var(--line2); border-radius:8px; padding:10px;}
.kv{display:flex; justify-content:space-between; font-size:11px; padding:3px 0; border-bottom:1px dashed #1c2836;}
.kv:last-child{border-bottom:none;}
.kv b{color:var(--acc); font-weight:600;}

/* ---------- BOTTOM ---------- */
.bottom{
  height:238px; background:var(--panel); border-top:1px solid var(--line);
  display:flex; flex-direction:column;
}
.tabs{display:flex; gap:2px; padding:8px 12px 0;}
.tab{
  padding:7px 16px; font-size:11px; letter-spacing:1px; cursor:pointer;
  background:#0f1722; border:1px solid var(--line); border-bottom:none;
  border-radius:8px 8px 0 0; color:var(--dim);
}
.tab.active{background:#16202c; color:var(--acc); border-color:var(--line2);}
.tab-body{flex:1; overflow:auto; padding:10px 14px;}
table{width:100%; border-collapse:collapse; font-size:12px;}
thead th{
  position:sticky; top:0; background:#16202c; color:var(--dim); font-size:10px;
  letter-spacing:1px; text-transform:uppercase; padding:7px 10px; text-align:left;
  border-bottom:2px solid var(--line2);
}
tbody td{padding:7px 10px; border-bottom:1px solid #18222e;}
tbody tr:hover{background:#14202c;}
td.num{text-align:left; font-variant-numeric:tabular-nums;}
td.lbl b{color:var(--acc2); font-weight:600;}
tr.tot{background:#101a26; font-weight:700;}
tr.tot td{color:var(--gold); border-top:2px solid var(--line2);}
.mat-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px;}
.mat-card{
  background:#0f1722; border:1px solid var(--line2); border-radius:10px; padding:12px 14px;
}
.mat-card h4{font-size:10px; letter-spacing:2px; color:#5b6c80; margin-bottom:8px;}
.mat-card .big{font-size:22px; font-weight:800; color:var(--acc);}
.mat-card .big.gold{color:var(--gold);}
.mat-card .big.pink{color:var(--acc2);}
.mat-card p{font-size:11px; color:var(--dim); margin-top:4px; line-height:1.6;}
.roll-row{display:flex; align-items:center; gap:10px; margin-bottom:8px;}
.roll-bar{flex:1; height:18px; background:#0f1722; border:1px solid var(--line2); border-radius:9px; overflow:hidden; display:flex;}
.roll-fill{height:100%;}
.roll-tag{width:64px; font-size:10px; color:var(--dim);}

/* ---------- STATUS ---------- */
.status{
  height:28px; display:flex; align-items:center; gap:18px; padding:0 14px;
  background:#0e141c; border-top:1px solid var(--line); font-size:11px; color:var(--dim);
}
.status .ok{color:var(--ok);} .status .warn{color:var(--warn);} .status .err{color:var(--err);}

/* ---------- MODAL ---------- */
.modal{position:fixed; inset:0; background:#05080ccc; display:flex; align-items:center; justify-content:center; z-index:50;}
.modal.hidden{display:none;}
.modal-card{
  width:min(680px, 92vw); max-height:82vh; overflow:auto;
  background:var(--panel); border:1px solid var(--line2); border-radius:14px; padding:18px;
  box-shadow:0 30px 80px #000a;
}
.modal-card h2{font-size:16px; margin-bottom:4px;}
.modal-card .sub{color:var(--dim); font-size:11px; margin-bottom:14px;}
.issue{
  display:flex; gap:10px; padding:9px 12px; border-radius:8px; margin-bottom:6px;
  background:#0f1722; border:1px solid var(--line); align-items:flex-start;
}
.issue .badge{
  font-size:9px; letter-spacing:1px; padding:3px 8px; border-radius:20px; white-space:nowrap; margin-top:1px;
}
.badge.error{background:#7f1d1d; color:#fecaca;}
.badge.warn{background:#78350f; color:#fde68a;}
.badge.info{background:#1e3a5f; color:#bae6fd;}
.issue .msg{flex:1; font-size:12px; line-height:1.6;}
.issue .msg small{display:block; color:var(--dim); font-size:10px; margin-top:2px;}
.all-ok{text-align:center; padding:30px; color:var(--ok); font-size:15px;}
.modal-actions{display:flex; justify-content:flex-end; gap:8px; margin-top:14px;}

/* ---------- PRINT (PDF) ---------- */
#printArea{display:none;}
@media print{
  body{overflow:visible; background:#fff;}
  .app,.modal{display:none !important;}
  #printArea{display:block !important; color:#111; background:#fff; padding:0;}
  .pr-h{border-bottom:3px solid #111; padding-bottom:10px; margin-bottom:14px;}
  .pr-h h1{font-size:22px; letter-spacing:1px;}
  .pr-h .pr-sub{font-size:11px; color:#444; margin-top:5px; line-height:1.8;}
  .pr-sec{margin:16px 0 8px; font-size:13px; border-bottom:1px solid #111; padding-bottom:4px;}
  .pr-h2{font-size:12px; font-weight:700; margin:12px 0 6px;}
  #printArea table{width:100%; border-collapse:collapse; font-size:12px;}
  #printArea th{border:1px solid #111; padding:6px 8px; background:#eee; text-transform:none;}
  #printArea td{border:1px solid #111; padding:5px 8px;}
  #printArea .pr-kv td{border:1px solid #111; padding:5px 8px; width:50%;}
  #printArea .pr-flex{display:flex; gap:18px;}
  #printArea .pr-flex>div{flex:1;}
  #printArea .pr-svg{border:1px solid #111; margin:8px 0;}
  #printArea .pr-svg svg{width:100%; height:auto;}
  #printArea .pr-sign{display:flex; gap:30px; margin-top:30px;}
  #printArea .pr-sign div{flex:1; border-top:1px solid #111; padding-top:6px; font-size:11px;}
  #printArea .pr-foot{margin-top:14px; font-size:9px; color:#666;}
}
</style>
</head>
<body>
<div class="app">

  <!-- ============ TOP BAR ============ -->
  <header class="topbar">
    <div class="brand">NEON<span>CAD</span><small>NEON SIGN FABRICATION</small></div>
    <input id="projName" class="proj-name" value="DEMO — Chain ABCD" title="Project name">
    <button id="btnMode" class="btn mode-auto">AUTO MODE</button>
    <div class="sep"></div>
    <button id="btnUndo" class="btn sm" title="Ctrl+Z">Undo</button>
    <button id="btnRedo" class="btn sm" title="Ctrl+Y">Redo</button>
    <div class="sep"></div>
    <button id="btnCheck" class="btn primary">CHECK DESIGN</button>
    <button id="btnPrint" class="btn accent">PRINT / PDF</button>
    <div class="sep"></div>
    <div class="export-group">
      <button id="expSvg" class="btn sm" title="Export SVG (real scale)">SVG</button>
      <button id="expDxf" class="btn sm" title="Export DXF (R12, cm)">DXF</button>
      <button id="expPng" class="btn sm" title="Export PNG (3x)">PNG</button>
      <button id="expCsv" class="btn sm" title="Export cut list CSV">CSV</button>
      <button id="expJson" class="btn sm" title="Export project JSON">JSON</button>
    </div>
    <div class="sep"></div>
    <button id="btnSave" class="btn sm" title="Save project in browser">SAVE</button>
    <button id="btnOpen" class="btn sm" title="Open saved project">OPEN</button>
    <button id="btnImport" class="btn sm" title="Import SVG / JSON file">IMPORT</button>
    <button id="btnNew" class="btn sm" title="New empty project">NEW</button>
  </header>

  <div class="main">
    <!-- ============ TOOLS ============ -->
    <aside class="tools">
      <div class="tool-h">TOOLS</div>
      <div class="tool active" data-tool="select"><span class="ico">&#9658;</span>Select</div>
      <div class="tool" data-tool="pen"><span class="ico">&#9998;</span>Pen</div>
      <div class="tool" data-tool="line"><span class="ico">&#9585;</span>Line</div>
      <div class="tool" data-tool="bezier"><span class="ico">&#8767;</span>Bezier</div>
      <div class="tool" data-tool="text"><span class="ico">T</span>Text</div>
      <div class="tool" data-tool="split"><span class="ico">&#9986;</span>Split</div>
      <div class="tool" data-tool="measure"><span class="ico">&#8646;</span>Measure</div>
      <div class="tool-h">EDIT</div>
      <div class="tool" id="toolSnap"><span class="ico">&#8862;</span>Snap Grid</div>
      <div class="tool" id="toolSnapLen"><span class="ico">&#8776;</span>Snap Lengths</div>
      <div class="tool" id="toolReverse"><span class="ico">&#8644;</span>Reverse</div>
      <div class="tool" id="toolDelete"><span class="ico">&#10006;</span>Delete</div>
    </aside>

    <!-- ============ CANVAS ============ -->
    <section class="canvas-wrap">
      <canvas id="cv"></canvas>
      <div class="hud" id="hud"><b>CANVAS</b> &nbsp;|&nbsp; tool: <b>SELECT</b> &nbsp;|&nbsp; wheel = zoom &nbsp;|&nbsp; drag with space/middle = pan</div>
    </section>

    <!-- ============ PROPERTIES ============ -->
    <aside class="props">
      <div class="p-h">PROPERTIES</div>
      <div class="p-grid">
        <div class="p-row"><label>Width (board)</label>
          <div class="unit"><input id="propWidth" type="number" min="1" step="1" value="200"><i>cm</i></div></div>
        <div class="p-row"><label>Height (board)</label>
          <div class="unit"><input id="propHeight" type="number" min="1" step="1" value="100"><i>cm</i></div></div>
      </div>

      <div class="p-h">NEON PROFILE</div>
      <div class="p-row"><label>Saved profiles</label>
        <select id="profSel"><option value="">— select profile —</option></select>
      </div>
      <div class="p-row"><label>Profile name</label><input id="profName" value="Neon Flex 8mm"></div>
      <div class="p-grid">
        <div class="p-row"><label>Neon Width</label>
          <div class="unit"><input id="propNeonW" type="number" min="0.5" step="0.5" value="8"><i>mm</i></div></div>
        <div class="p-row"><label>Cutting Interval</label>
          <div class="unit"><input id="propInterval" type="number" min="0.1" step="0.1" value="2.5"><i>cm</i></div></div>
        <div class="p-row"><label>Minimum Bend Radius</label>
          <div class="unit"><input id="propBend" type="number" min="0" step="1" value="30"><i>mm</i></div></div>
        <div class="p-row"><label>Voltage</label>
          <div class="unit"><input id="propVolt" type="number" min="1" step="1" value="24"><i>V</i></div></div>
        <div class="p-row"><label>Power per meter</label>
          <div class="unit"><input id="propPower" type="number" min="0.1" step="0.1" value="10"><i>W/m</i></div></div>
        <div class="p-row"><label>Roll Length</label>
          <div class="unit"><input id="propRoll" type="number" min="10" step="10" value="500"><i>cm</i></div></div>
      </div>
      <div class="p-actions">
        <button id="btnSaveProf" class="btn sm">Save Profile</button>
        <button id="btnDelProf" class="btn sm">Delete Profile</button>
      </div>

      <div class="p-h">CUTTING / POWER SETTINGS</div>
      <div class="p-grid">
        <div class="p-row"><label>Max Piece Length</label>
          <div class="unit"><input id="propMaxPiece" type="number" min="10" step="10" value="500"><i>cm</i></div></div>
        <div class="p-row"><label>Min Path Spacing</label>
          <div class="unit"><input id="propSpacing" type="number" min="0" step="0.1" value="1.5"><i>cm</i></div></div>
        <div class="p-row"><label>PSU Safety Factor</label>
          <div class="unit"><input id="propSafety" type="number" min="40" max="100" step="5" value="80"><i>%</i></div></div>
        <div class="p-row"><label>PSU Capacity (0=auto)</label>
          <div class="unit"><input id="propPsu" type="number" min="0" step="10" value="0"><i>W</i></div></div>
        <div class="p-row"><label>Grid Snap</label>
          <div class="unit"><input id="propGrid" type="number" min="0.1" step="0.1" value="0.5"><i>cm</i></div></div>
        <div class="p-row"><label>Node Tolerance</label>
          <div class="unit"><input id="propNodeTol" type="number" min="0.05" step="0.05" value="0.5"><i>cm</i></div></div>
      </div>
      <div class="p-actions">
        <button id="btnAutoAll" class="btn sm primary">AUTO: Snap + Build Cut List</button>
      </div>
      <p class="hint">In AUTO MODE lengths are corrected geometrically so every START/END lands on a real cutting point of the neon (multiples of the cutting interval). Rounding is never used alone.</p>

      <div class="p-h">SELECTED PATH</div>
      <div class="sel-box" id="selBox">
        <div class="hint" id="selNone">Nothing selected — use Select tool and click a path.</div>
        <div id="selInfo" style="display:none">
          <div class="kv"><span>Name</span><b id="selName">—</b></div>
          <div class="kv"><span>Length (geometry)</span><b id="selLen">—</b></div>
          <div class="kv"><span>Length (snapped)</span><b id="selLen2">—</b></div>
          <div class="kv"><span>Pieces / cuts</span><b id="selPieces">—</b></div>
          <div class="kv"><span>Start / End</span><b id="selSE">—</b></div>
          <div class="p-actions">
            <button id="selReverse" class="btn sm">Reverse</button>
            <button id="selLockS" class="btn sm">Lock Start</button>
            <button id="selLockE" class="btn sm">Lock End</button>
          </div>
          <div class="p-actions">
            <button id="selSnap" class="btn sm primary">Snap Length</button>
            <button id="selDel" class="btn sm accent">Delete Path</button>
          </div>
          <div class="p-row"><label>Path name</label><input id="selNameIn"></div>
          <div class="p-row"><label>Note</label><input id="selNote"></div>
        </div>
      </div>
    </aside>
  </div>

  <!-- ============ CUT LIST / MATERIALS ============ -->
  <section class="bottom">
    <div class="tabs">
      <div class="tab active" data-tab="cut">CUT LIST</div>
      <div class="tab" data-tab="mat">MATERIALS &amp; POWER</div>
      <div class="tab" data-tab="roll">ROLLS &amp; WASTE</div>
      <div style="flex:1"></div>
      <button id="btnPrint2" class="btn sm accent" style="margin:0 0 6px">PRINT / PDF this table</button>
    </div>
    <div class="tab-body" id="tabCut">
      <table>
        <thead><tr>
          <th>No. (شماره)</th><th>Length (طول)</th><th>Cuts 2.5cm (تعداد برش)</th>
          <th>Start (شروع)</th><th>End (پایان)</th><th>Path</th>
        </tr></thead>
        <tbody id="cutBody"></tbody>
      </table>
    </div>
    <div class="tab-body" id="tabMat" style="display:none">
      <div class="mat-grid" id="matGrid"></div>
    </div>
    <div class="tab-body" id="tabRoll" style="display:none">
      <div id="rollPanel"></div>
    </div>
  </section>

  <!-- ============ STATUS ============ -->
  <footer class="status">
    <span id="stCoords">x: — &nbsp; y: —</span>
    <span id="stZoom">zoom: 100%</span>
    <span id="stHint">Ready. Draw with Pen / Line / Bezier.</span>
    <span style="flex:1"></span>
    <span id="stTotal">Total: —</span>
    <span id="stIssues">CHECK: —</span>
  </footer>
</div>

<!-- ============ CHECK DESIGN MODAL ============ -->
<div class="modal hidden" id="modalCheck">
  <div class="modal-card">
    <h2>CHECK DESIGN</h2>
    <div class="sub" id="checkSub">Pre-export validation — geometry, cutting, power, connections.</div>
    <div id="checkList"></div>
    <div class="modal-actions">
      <button id="btnRecheck" class="btn">Re-check</button>
      <button id="btnPrint3" class="btn accent">PRINT / PDF</button>
      <button id="btnCloseCheck" class="btn primary">Close</button>
    </div>
  </div>
</div>

<!-- ============ OPEN PROJECT MODAL ============ -->
<div class="modal hidden" id="modalOpen">
  <div class="modal-card">
    <h2>Open Project</h2>
    <div class="sub">Projects saved in this browser (localStorage).</div>
    <div id="openList"></div>
    <div class="modal-actions">
      <button id="btnCloseOpen" class="btn">Close</button>
    </div>
  </div>
</div>

<div id="printArea"></div>
<input type="file" id="fileInput" accept=".svg,.json,.txt" style="display:none">

<script>
/* =========================================================================
   CORE-PURE-BEGIN  (no DOM — geometry & manufacturing algorithms)
   Extractable for automated tests (see scripts/check-worker.mjs).
   ========================================================================= */

var EPS = 1e-9;

function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function lerp2(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  var r = Math.round(n * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return String(r);
}

/* ---- Gauss-Legendre 16-point quadrature on [a,b] ---- */
var GL_X = [
  -0.0950125098376374, 0.0950125098376374, -0.2816035507792589, 0.2816035507792589,
  -0.4580167776572274, 0.4580167776572274, -0.6178762444026438, 0.6178762444026438,
  -0.7554044083550030, 0.7554044083550030, -0.8656312023878318, 0.8656312023878318,
  -0.9445750230732326, 0.9445750230732326, -0.9894009349916499, 0.9894009349916499
];
var GL_W = [
  0.1894506104550685, 0.1894506104550685, 0.1826034150449236, 0.1826034150449236,
  0.1691565193950025, 0.1691565193950025, 0.1495959888165767, 0.1495959888165767,
  0.1246289712555339, 0.1246289712555339, 0.0951585116824928, 0.0951585116824928,
  0.0622535239386479, 0.0622535239386479, 0.0271524594117541, 0.0271524594117541
];
function gauss16(f, a, b) {
  var c1 = (b - a) / 2, c2 = (b + a) / 2, s = 0;
  for (var i = 0; i < 16; i++) s += GL_W[i] * f(c1 * GL_X[i] + c2);
  return c1 * s;
}

/* ---- segments of a path: {a,b,c1,c2} (c1/c2 null => straight) ---- */
function pathSegs(path) {
  var segs = [], n = path.points.length;
  for (var i = 0; i < n - 1; i++) {
    var c = (path.type === 'bezier' && path.ctrl && path.ctrl[i]) ? path.ctrl[i] : null;
    if (c && c.c1 && c.c2) segs.push({ a: path.points[i], b: path.points[i + 1], c1: c.c1, c2: c.c2 });
    else segs.push({ a: path.points[i], b: path.points[i + 1] });
  }
  return segs;
}
function segPoint(seg, t) {
  if (!seg.c1) return lerp2(seg.a, seg.b, t);
  var mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2 * mt * seg.a.x + 3 * mt2 * t * seg.c1.x + 3 * mt * t2 * seg.c2.x + t2 * t * seg.b.x,
    y: mt2 * mt * seg.a.y + 3 * mt2 * t * seg.c1.y + 3 * mt * t2 * seg.c2.y + t2 * t * seg.b.y
  };
}
function segDeriv(seg, t) {
  if (!seg.c1) return { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y };
  var mt = 1 - t, a = 3 * mt * mt, b = 6 * mt * t, c = 3 * t * t;
  return {
    x: a * (seg.c1.x - seg.a.x) + b * (seg.c2.x - seg.c1.x) + c * (seg.b.x - seg.c2.x),
    y: a * (seg.c1.y - seg.a.y) + b * (seg.c2.y - seg.c1.y) + c * (seg.b.y - seg.c2.y)
  };
}
function segLength(seg) {
  if (!seg.c1) return dist(seg.a, seg.b);
  return gauss16(function (t) {
    var d = segDeriv(seg, t);
    return Math.sqrt(d.x * d.x + d.y * d.y);
  }, 0, 1);
}
function pathLength(path) {
  var segs = pathSegs(path), L = 0;
  for (var i = 0; i < segs.length; i++) L += segLength(segs[i]);
  return L;
}
/* cumulative lengths at every vertex: cum[0]=0 ... cum[n-1]=L */
function pathCum(path) {
  var segs = pathSegs(path), cum = [0];
  for (var i = 0; i < segs.length; i++) cum.push(cum[i] + segLength(segs[i]));
  return cum;
}
/* point at arc-length s from start */
function pathPointAt(path, s) {
  var segs = pathSegs(path), cum = pathCum(path), L = cum[cum.length - 1];
  s = clamp(s, 0, L);
  var i = 0;
  while (i < segs.length - 1 && cum[i + 1] < s - EPS) i++;
  var seg = segs[i], segLen = cum[i + 1] - cum[i];
  if (segLen < EPS) return { x: seg.a.x, y: seg.a.y };
  if (!seg.c1) return lerp2(seg.a, seg.b, (s - cum[i]) / segLen);
  /* sample table + binary search on t */
  var N = 64, ts = [], ls = [0], acc = 0, prev = seg.a, j;
  for (j = 1; j <= N; j++) {
    var t = j / N, p = segPoint(seg, t);
    acc += dist(prev, p); ts.push(t); ls.push(acc); prev = p;
  }
  var target = (s - cum[i]) / segLen * acc, lo = 0, hi = N, mid;
  while (hi - lo > 1) { mid = (lo + hi) >> 1; if (ls[mid] < target) lo = mid; else hi = mid; }
  var f = (target - ls[lo]) / Math.max(ls[hi] - ls[lo], EPS);
  return segPoint(seg, ts[lo] + (ts[hi] - ts[lo]) * f);
}
/* de Casteljau split of a cubic segment at t */
function splitSeg(seg, t) {
  if (!seg.c1) {
    var p = lerp2(seg.a, seg.b, t);
    return { left: { a: seg.a, b: p }, right: { a: p, b: seg.b } };
  }
  var p01 = lerp2(seg.a, seg.c1, t), p12 = lerp2(seg.c1, seg.c2, t), p23 = lerp2(seg.c2, seg.b, t);
  var p012 = lerp2(p01, p12, t), p123 = lerp2(p12, p23, t), p = lerp2(p012, p123, t);
  return {
    left: { a: seg.a, b: p, c1: p01, c2: p012 },
    right: { a: p, b: seg.b, c1: p123, c2: p23 }
  };
}
function clonePath(path) {
  return JSON.parse(JSON.stringify(path));
}
/* split path at arc-length s -> [left, right] */
function pathSplitAt(path, s) {
  var segs = pathSegs(path), cum = pathCum(path), L = cum[cum.length - 1];
  s = clamp(s, 0, L);
  if (s <= EPS) return [null, clonePath(path)];
  if (s >= L - EPS) return [clonePath(path), null];
  var i = 0;
  while (i < segs.length - 1 && cum[i + 1] < s - EPS) i++;
  var seg = segs[i], segLen = cum[i + 1] - cum[i], t = (s - cum[i]) / Math.max(segLen, EPS);
  if (!seg.c1) {
    var p = { x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t };
    t = dist(seg.a, p) / Math.max(segLen, EPS);
  }
  var parts = splitSeg(seg, clamp(t, 0, 1));
  var Lp = clonePath(path), Rp = clonePath(path);
  Lp.points = []; Lp.ctrl = [];
  Rp.points = []; Rp.ctrl = [];
  for (var k = 0; k < i; k++) {
    Lp.points.push(clonePath({ v: path.points[k] }).v);
    Lp.ctrl.push(path.ctrl && path.ctrl[k] ? JSON.parse(JSON.stringify(path.ctrl[k])) : null);
  }
  Lp.points.push({ x: parts.left.a.x, y: parts.left.a.y });
  Lp.points.push({ x: parts.left.b.x, y: parts.left.b.y });
  Lp.ctrl.push(parts.left.c1 ? { c1: parts.left.c1, c2: parts.left.c2 } : null);
  Rp.points.push({ x: parts.right.a.x, y: parts.right.a.y });
  Rp.points.push({ x: parts.right.b.x, y: parts.right.b.y });
  Rp.ctrl.push(parts.right.c1 ? { c1: parts.right.c1, c2: parts.right.c2 } : null);
  for (var k2 = i + 1; k2 < segs.length; k2++) {
    Rp.points.push(clonePath({ v: path.points[k2 + 1] }).v);
    Rp.ctrl.push(path.ctrl && path.ctrl[k2] ? JSON.parse(JSON.stringify(path.ctrl[k2])) : null);
  }
  return [Lp, Rp];
}
/* slice a path between arc-lengths s0..s1 -> new path */
function pathSlice(path, s0, s1) {
  var parts = pathSplitAt(path, s1);
  var mid = parts[0] ? parts[0] : clonePath(path);
  if (s0 > EPS) {
    var pr = pathSplitAt(mid, s0);
    mid = pr[1] ? pr[1] : mid;
  }
  return mid;
}

/* ---- length snapping: REAL geometry correction (never bare rounding) ---- */
function snapTarget(L, I) {
  var n = Math.max(1, Math.ceil(L / I - 1e-9));
  return n * I;
}
function centroid(pts) {
  var x = 0, y = 0;
  for (var i = 0; i < pts.length; i++) { x += pts[i].x; y += pts[i].y; }
  return { x: x / pts.length, y: y / pts.length };
}
function scaleAbout(path, c, s) {
  for (var i = 0; i < path.points.length; i++) {
    path.points[i].x = c.x + (path.points[i].x - c.x) * s;
    path.points[i].y = c.y + (path.points[i].y - c.y) * s;
  }
  if (path.ctrl) for (var j = 0; j < path.ctrl.length; j++) {
    var cc = path.ctrl[j];
    if (!cc) continue;
    cc.c1.x = c.x + (cc.c1.x - c.x) * s; cc.c1.y = c.y + (cc.c1.y - c.y) * s;
    cc.c2.x = c.x + (cc.c2.x - c.x) * s; cc.c2.y = c.y + (cc.c2.y - c.y) * s;
  }
}
/* perpendicular scale of every point about the chord line (fixed endpoints) */
function perpScale(path, k) {
  var n = path.points.length, a = path.points[0], b = path.points[n - 1];
  var vx = b.x - a.x, vy = b.y - a.y, vv = vx * vx + vy * vy;
  if (vv < EPS) return;
  function apply(p) {
    var t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / vv;
    var px = a.x + vx * t, py = a.y + vy * t;
    p.x = px + (p.x - px) * k;
    p.y = py + (p.y - py) * k;
  }
  for (var i = 1; i < n - 1; i++) apply(path.points[i]);
  if (path.ctrl) for (var j = 0; j < path.ctrl.length; j++) {
    var cc = path.ctrl[j];
    if (!cc) continue;
    apply(cc.c1); apply(cc.c2);
  }
}
/*
  Snap a path so its REAL arc length becomes a multiple of the cutting interval.
  - both ends free  : uniform scale about centroid (shape kept, size tweaked)
  - one end locked  : uniform scale about the locked endpoint
  - both locked     : perpendicular scale about the chord, bisect on factor k
  Returns true if the geometry was corrected (or already exact), false if
  geometrically impossible (reported by CHECK DESIGN).
*/
function snapPath(path, I) {
  var L = pathLength(path);
  var target = snapTarget(L, I);
  if (Math.abs(L - target) < 1e-7) {
    path.snapped = true; path.snapDelta = 0;
    return true;
  }
  if (!path.origPoints) path.origPoints = JSON.parse(JSON.stringify(path.points));
  var freeS = !path.lockedStart, freeE = !path.lockedEnd;
  if (freeS && freeE) {
    scaleAbout(path, centroid(path.points), target / L);
    path.snapped = true; path.snapDelta = target - L;
    return true;
  }
  if (freeS !== freeE) {
    var anchor = freeS ? path.points[path.points.length - 1] : path.points[0];
    scaleAbout(path, { x: anchor.x, y: anchor.y }, target / L);
    path.snapped = true; path.snapDelta = target - L;
    return true;
  }
  /* both locked */
  var a = path.points[0], b = path.points[path.points.length - 1];
  var chord = dist(a, b);
  if (target < chord - 1e-7) return false;                 /* impossible */
  if (L - chord < 1e-9) return false;                      /* straight & fixed */
  /* length(k) with k=0 -> chord, grows with k (bisection on [0,8]) */
  var saved = JSON.parse(JSON.stringify(path.points));
  var savedCtrl = path.ctrl ? JSON.parse(JSON.stringify(path.ctrl)) : null;
  var lo = 0, hi = 8, mid = 0, ok = false;
  for (var it = 0; it < 60; it++) {
    mid = (lo + hi) / 2;
    path.points = JSON.parse(JSON.stringify(saved));
    if (savedCtrl) path.ctrl = JSON.parse(JSON.stringify(savedCtrl));
    perpScale(path, mid);
    var Lm = pathLength(path);
    if (Math.abs(Lm - target) < 1e-7) { ok = true; break; }
    if (Lm < target) lo = mid; else hi = mid;
  }
  if (!ok) {
    path.points = saved;
    if (savedCtrl) path.ctrl = savedCtrl;
    /* verify residual */
    if (Math.abs(pathLength(path) - target) > 1e-4) return false;
    ok = true;
  }
  path.snapped = true; path.snapDelta = target - L;
  return true;
}

/* ---- pieces + nodes + cut list ---- */
function buildPieces(project) {
  var I = project.profile.intervalCm, maxP = project.settings.maxPieceLengthCm;
  var step = Math.floor(maxP / I + 1e-9) * I;
  if (step < I) step = I;
  var pieces = [], pn = 0;
  for (var i = 0; i < project.paths.length; i++) {
    var path = project.paths[i];
    if (!path.points || path.points.length < 2) continue;
    var L = pathLength(path);
    if (L < I - EPS) {
      pn++;
      pieces.push({
        n: pn, pathId: path.id, pathName: path.name,
        startS: 0, endS: L, lengthCm: L, cuts: 0,
        points: JSON.parse(JSON.stringify(path.points)),
        isSub: false, full: true, pathIndex: i
      });
      continue;
    }
    var pos = 0;
    while (pos < L - EPS) {
      var end = Math.min(pos + step, L);
      if (end < L - EPS) end = Math.round(end / I) * I;
      if (end <= pos + EPS) end = pos + I;
      if (end > L - EPS) end = L;
      var sub = (pos > EPS || end < L - EPS);
      var slice = sub ? pathSlice(path, pos, end) : clonePath(path);
      pn++;
      pieces.push({
        n: pn, pathId: path.id, pathName: path.name,
        startS: pos, endS: end, lengthCm: end - pos,
        cuts: Math.round((end - pos) / I),
        points: JSON.parse(JSON.stringify(slice.points)),
        isSub: sub, full: !sub, pathIndex: i
      });
      pos = end;
    }
  }
  return pieces;
}
/* cluster piece endpoints into nodes; labels A, B, C ... in order of appearance */
function computeNodes(pieces, tol) {
  var nodes = [];
  function letter(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(65 + Math.floor(idx / 26) - 1) + String.fromCharCode(65 + (idx % 26));
  }
  function add(pt, piece, which) {
    for (var i = 0; i < nodes.length; i++) {
      if (dist(nodes[i], pt) <= tol + EPS) {
        nodes[i].refs.push({ n: piece.n, which: which });
        if (nodes[i].refs.length > nodes[i].count) nodes[i].count = nodes[i].refs.length;
        return nodes[i];
      }
    }
    var node = {
      x: pt.x, y: pt.y, label: letter(nodes.length),
      refs: [{ n: piece.n, which: which }]
    };
    nodes.push(node);
    return node;
  }
  for (var p = 0; p < pieces.length; p++) {
    var pts = pieces[p].points;
    if (!pts || pts.length < 1) continue;
    pieces[p].startNode = add(pts[0], pieces[p], 'start');
    pieces[p].endNode = add(pts[pts.length - 1], pieces[p], 'end');
    pieces[p].startLabel = pieces[p].startNode.label;
    pieces[p].endLabel = pieces[p].endNode.label;
  }
  return nodes;
}

/* ---- power supply ---- */
var STD_PSU = [30, 40, 60, 75, 100, 120, 150, 200, 240, 320, 350, 400, 500, 600, 750, 1000, 1500];
function computePower(project, totalCm) {
  var m = totalCm / 100;
  var wPerM = project.profile.powerPerMeterW;
  var totalW = m * wPerM;
  var safe = clamp(project.settings.safetyFactor, 40, 100) / 100;
  var need = totalW / safe;
  var psu = STD_PSU[STD_PSU.length - 1];
  for (var i = 0; i < STD_PSU.length; i++) {
    if (STD_PSU[i] + EPS >= need) { psu = STD_PSU[i]; break; }
  }
  if (need > STD_PSU[STD_PSU.length - 1]) psu = Math.ceil(need / 50) * 50;
  var amps = project.profile.voltageV > 0 ? totalW / project.profile.voltageV : 0;
  return {
    meters: m, wPerM: wPerM, totalW: totalW,
    safetyPct: project.settings.safetyFactor, needW: need,
    psuW: psu, amps: amps, voltage: project.profile.voltageV,
    capacityW: project.settings.psuCapacityW || 0
  };
}

/* ---- Cutting Stock / Bin Packing: First-Fit-Decreasing ---- */
function packRolls(pieceLens, rollCm) {
  var items = [];
  for (var i = 0; i < pieceLens.length; i++) items.push({ len: pieceLens[i], idx: i });
  items.sort(function (a, b) { return b.len - a.len; });
  var bins = [];
  for (var k = 0; k < items.length; k++) {
    var it = items[k], placed = false;
    for (var b = 0; b < bins.length; b++) {
      if (bins[b].rem + EPS >= it.len) {
        bins[b].rem -= it.len; bins[b].items.push(it); placed = true; break;
      }
    }
    if (!placed) {
      if (it.len > rollCm + EPS) {
        bins.push({ rem: 0, items: [it], overflow: true });
      } else {
        bins.push({ rem: rollCm - it.len, items: [it] });
      }
    }
  }
  var totalWaste = 0, totalUsed = 0;
  for (var j = 0; j < bins.length; j++) {
    bins[j].waste = bins[j].overflow ? 0 : bins[j].rem;
    totalWaste += bins[j].waste;
    totalUsed += rollCm - bins[j].rem;
  }
  return {
    bins: bins, rollCm: rollCm, count: bins.length,
    totalWaste: totalWaste, totalUsed: totalUsed,
    wastePct: totalUsed + totalWaste > 0 ? totalWaste / (totalUsed + totalWaste) * 100 : 0
  };
}

/* ---- demo project: cut list matches the spec example exactly ---- */
function demoProject() {
  var d = 82.5 / Math.SQRT2;
  function P(id, name, pts) {
    return {
      id: id, name: name, type: 'polyline', points: pts,
      ctrl: null, lockedStart: false, lockedEnd: false,
      snapped: true, snapDelta: 0, origPoints: null, note: ''
    };
  }
  var project = {
    version: 1,
    name: "DEMO — Chain ABCD",
    board: { widthCm: 200, heightCm: 100 },
    settings: {
      intervalCm: 2.5, maxPieceLengthCm: 500, minSpacingCm: 1.5,
      safetyFactor: 80, psuCapacityW: 0, nodeTolCm: 0.5, joinGapCm: 1.0, gridCm: 0.5
    },
    profile: {
      name: "Neon Flex 8mm", widthMm: 8, voltageV: 24,
      intervalCm: 2.5, minBendRadiusMm: 30, powerPerMeterW: 10, rollLengthCm: 500
    },
    paths: [
      P('p1', 'NEON 01', [{ x: 15, y: 22 }, { x: 140, y: 22 }]),
      P('p2', 'NEON 02', [{ x: 140, y: 22 }, { x: 140 - d, y: 22 + d }]),
      P('p3', 'NEON 03', [{ x: 140 - d, y: 22 + d }, { x: 140 - d + 47.5, y: 22 + d }])
    ],
    texts: [{ id: 't1', x: 15, y: 12, text: 'DEMO CHAIN A-B-C-D', sizeCm: 4 }],
    mode: 'auto'
  };
  /* mark junction locks: p2 shares B with p1.end and C with p3.start */
  project.paths[1].lockedStart = true;
  project.paths[1].lockedEnd = true;
  project.paths[2].lockedStart = true;
  project.paths[0].lockedEnd = true;
  return project;
}

/* export the pure core for tests / console */
var NEONCORE = {
  dist: dist, fmt: fmt, pathLength: pathLength, pathCum: pathCum,
  pathPointAt: pathPointAt, pathSplitAt: pathSplitAt, pathSlice: pathSlice,
  snapTarget: snapTarget, snapPath: snapPath,
  buildPieces: buildPieces, computeNodes: computeNodes,
  computePower: computePower, packRolls: packRolls,
  demoProject: demoProject, segLength: segLength, splitSeg: splitSeg
};

/* =========================================================================
   CORE-PURE-END
   ========================================================================= */

/* =========================================================================
   UI STATE & PIPELINE
   ========================================================================= */
function $(id) { return document.getElementById(id); }

var S = {
  project: demoProject(),
  tool: 'select',
  sel: [],
  nodes: [], pieces: [], power: null, pack: null, issues: [],
  view: { x: -8, y: -6, zoom: 7.5 },
  gridOn: true,
  spaceDown: false,
  drag: null, hoverW: null, draft: null, measure: null,
  undo: [], redo: [],
  dpr: window.devicePixelRatio || 1
};

var PALETTE = ['#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#fb7185', '#4ade80', '#e879f9', '#f97316'];

function pushUndo() {
  try {
    S.undo.push(JSON.stringify(S.project));
    if (S.undo.length > 60) S.undo.shift();
    S.redo.length = 0;
  } catch (e) { }
}
function doUndo() {
  if (!S.undo.length) return;
  S.redo.push(JSON.stringify(S.project));
  S.project = JSON.parse(S.undo.pop());
  S.sel = []; syncPropsFromProject(); recompute();
}
function doRedo() {
  if (!S.redo.length) return;
  S.undo.push(JSON.stringify(S.project));
  S.project = JSON.parse(S.redo.pop());
  S.sel = []; syncPropsFromProject(); recompute();
}

function newId() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

/* ---- main recompute: numbering, pieces, nodes, power, packing, issues ---- */
function recompute() {
  var pr = S.project;
  pr.profile.intervalCm = pr.profile.intervalCm || 2.5;
  var I = pr.profile.intervalCm;

  /* auto numbering of paths */
  for (var i = 0; i < pr.paths.length; i++) {
    if (pr.mode === 'auto' || !pr.paths[i].name) {
      pr.paths[i].name = 'NEON ' + (i + 1 < 10 ? '0' : '') + (i + 1);
    }
    /* auto lock endpoints that touch other paths (junctions) */
    if (pr.mode === 'auto') {
      var pth = pr.paths[i];
      pth.lockedStart = touchesOther(pth, 0, pr);
      pth.lockedEnd = touchesOther(pth, 1, pr);
    }
  }
  /* auto snap lengths */
  if (pr.mode === 'auto') {
    for (var s = 0; s < pr.paths.length; s++) {
      try { snapPath(pr.paths[s], I); } catch (e) { }
    }
  }
  S.pieces = buildPieces(pr);
  S.nodes = computeNodes(S.pieces, pr.settings.nodeTolCm);
  var total = 0;
  for (var t = 0; t < S.pieces.length; t++) total += S.pieces[t].lengthCm;
  S.power = computePower(pr, total);
  S.totalCm = total;
  var lens = [];
  for (var l = 0; l < S.pieces.length; l++) lens.push(S.pieces[l].lengthCm);
  S.pack = packRolls(lens, pr.profile.rollLengthCm);
  S.issues = runChecks();
  renderCutList(); renderMaterials(); renderRolls(); renderSel(); renderStatus();
  draw();
}
function touchesOther(path, which, pr) {
  var pt = which === 0 ? path.points[0] : path.points[path.points.length - 1];
  var tol = pr.settings.nodeTolCm;
  for (var i = 0; i < pr.paths.length; i++) {
    var o = pr.paths[i];
    if (o.id === path.id) continue;
    if (dist(pt, o.points[0]) <= tol + EPS) return true;
    if (dist(pt, o.points[o.points.length - 1]) <= tol + EPS) return true;
  }
  return false;
}

/* =========================================================================
   CANVAS RENDERING
   ========================================================================= */
function toWorld(ev) {
  var r = $('cv').getBoundingClientRect();
  return {
    x: S.view.x + (ev.clientX - r.left) / S.view.zoom,
    y: S.view.y + (ev.clientY - r.top) / S.view.zoom
  };
}
function snapGridPt(p) {
  if (!S.gridOn) return { x: p.x, y: p.y };
  var g = S.project.settings.gridCm || 0.5;
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
}

function draw() {
  var cv = $('cv');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var w = cv.clientWidth, h = cv.clientHeight;
  var dpr = S.dpr;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#080c11';
  ctx.fillRect(0, 0, w, h);
  var z = S.view.zoom;
  ctx.save();
  ctx.translate(-S.view.x * z, -S.view.y * z);
  ctx.scale(z, z);

  /* grid */
  var pr = S.project, B = pr.board;
  var x0 = S.view.x, y0 = S.view.y, x1 = x0 + w / z, y1 = y0 + h / z;
  var g = 1;
  if (z < 3.5) g = 5;
  if (z < 1.2) g = 10;
  ctx.lineWidth = 1 / z;
  for (var gx = Math.floor(x0 / g) * g; gx <= x1; gx += g) {
    var major = Math.abs(gx / (g * 10) - Math.round(gx / (g * 10))) < 1e-6;
    ctx.strokeStyle = major ? '#152232' : '#0e1724';
    ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke();
  }
  for (var gy = Math.floor(y0 / g) * g; gy <= y1; gy += g) {
    var majorY = Math.abs(gy / (g * 10) - Math.round(gy / (g * 10))) < 1e-6;
    ctx.strokeStyle = majorY ? '#152232' : '#0e1724';
    ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
  }
  /* board */
  ctx.strokeStyle = '#3b5268'; ctx.lineWidth = 2 / z;
  ctx.strokeRect(0, 0, B.widthCm, B.heightCm);
  ctx.fillStyle = '#0c121855'; ctx.fillRect(0, 0, B.widthCm, B.heightCm);
  /* board size badge */
  ctx.fillStyle = '#5b7591'; ctx.font = 'bold ' + (2.2) + 'px sans-serif';
  ctx.fillText(fmt(B.widthCm) + ' x ' + fmt(B.heightCm) + ' cm', 1.5, -1.8);

  var neonCm = (pr.profile.widthMm || 8) / 10;

  /* texts */
  for (var ti = 0; ti < pr.texts.length; ti++) {
    var tx = pr.texts[ti];
    ctx.fillStyle = '#8fa3b8';
    ctx.font = 'bold ' + (tx.sizeCm || 3) + 'px sans-serif';
    ctx.fillText(tx.text, tx.x, tx.y);
  }

  /* paths — neon look */
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2) continue;
    var color = PALETTE[i % PALETTE.length];
    tracePath(ctx, path);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = color; ctx.globalAlpha = 0.10; ctx.lineWidth = neonCm * 3.2; ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.lineWidth = neonCm * 1.9; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = neonCm * 0.9; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.75; ctx.lineWidth = neonCm * 0.28; ctx.stroke();
    ctx.globalAlpha = 1;

    /* name label at middle */
    var L = pathLength(path);
    var mid = pathPointAt(path, L / 2);
    var mid2 = pathPointAt(path, Math.min(L / 2 + 0.5, L));
    var nx = -(mid2.y - mid.y), ny = (mid2.x - mid.x);
    var nl = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= nl; ny /= nl;
    ctx.font = 'bold 2.1px sans-serif';
    var lw = ctx.measureText(path.name).width;
    ctx.fillStyle = '#0b0f14cc';
    ctx.fillRect(mid.x + nx * 1.6 - lw / 2 - 0.5, mid.y + ny * 1.6 - 1.7, lw + 1, 2.6);
    ctx.fillStyle = color;
    ctx.fillText(path.name, mid.x + nx * 1.6 - lw / 2, mid.y + ny * 1.6);
  }

  /* pieces: START / END marks + nodes */
  for (var pi = 0; pi < S.pieces.length; pi++) {
    var pc = S.pieces[pi], pts = pc.points;
    if (!pts || !pts.length) continue;
    var a = pts[0], b = pts[pts.length - 1];
    drawMark(ctx, a, 'START ' + pad2(pc.n), '#34d399');
    drawMark(ctx, b, 'END ' + pad2(pc.n), '#f87171');
  }
  ctx.font = 'bold 1.9px sans-serif';
  for (var ni = 0; ni < S.nodes.length; ni++) {
    var nd = S.nodes[ni];
    ctx.save();
    ctx.translate(nd.x, nd.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-0.9, -0.9, 1.8, 1.8);
    ctx.restore();
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(nd.x + 1.1, nd.y - 2.4, 1.6, 2.2);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(nd.label, nd.x + 1.2, nd.y - 0.7);
  }

  /* selection + vertices */
  for (var si = 0; si < S.sel.length; si++) {
    var sp = findPath(S.sel[si]);
    if (!sp) continue;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.25;
    ctx.setLineDash([1, 0.6]);
    tracePath(ctx, sp); ctx.stroke();
    ctx.setLineDash([]);
    for (var vi = 0; vi < sp.points.length; vi++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sp.points[vi].x - 0.7, sp.points[vi].y - 0.7, 1.4, 1.4);
    }
    if (sp.type === 'bezier' && sp.ctrl) {
      ctx.strokeStyle = '#22d3ee88'; ctx.lineWidth = 0.18;
      for (var ci = 0; ci < sp.ctrl.length; ci++) {
        var c = sp.ctrl[ci];
        if (!c) continue;
        ctx.beginPath();
        ctx.moveTo(sp.points[ci].x, sp.points[ci].y);
        ctx.lineTo(c.c1.x, c.c1.y);
        ctx.moveTo(sp.points[ci + 1].x, sp.points[ci + 1].y);
        ctx.lineTo(c.c2.x, c.c2.y);
        ctx.stroke();
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(c.c1.x - 0.5, c.c1.y - 0.5, 1, 1);
        ctx.fillRect(c.c2.x - 0.5, c.c2.y - 0.5, 1, 1);
      }
    }
  }

  /* draft */
  if (S.draft && S.draft.points.length) {
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 0.35; ctx.setLineDash([0.8, 0.5]);
    ctx.beginPath();
    ctx.moveTo(S.draft.points[0].x, S.draft.points[0].y);
    for (var di = 1; di < S.draft.points.length; di++) ctx.lineTo(S.draft.points[di].x, S.draft.points[di].y);
    if (S.draft.preview) ctx.lineTo(S.draft.preview.x, S.draft.preview.y);
    ctx.stroke(); ctx.setLineDash([]);
    for (var dpi = 0; dpi < S.draft.points.length; dpi++) {
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(S.draft.points[dpi].x - 0.5, S.draft.points[dpi].y - 0.5, 1, 1);
    }
  }

  /* measure */
  if (S.measure && S.measure.a) {
    var mb = S.measure.b || S.measure.hover || S.measure.a;
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.3; ctx.setLineDash([1, 0.5]);
    ctx.beginPath(); ctx.moveTo(S.measure.a.x, S.measure.a.y); ctx.lineTo(mb.x, mb.y); ctx.stroke();
    ctx.setLineDash([]);
    var md = dist(S.measure.a, mb);
    var mm = { x: (S.measure.a.x + mb.x) / 2, y: (S.measure.a.y + mb.y) / 2 };
    ctx.font = 'bold 2px sans-serif';
    var mtxt = fmt(Math.round(md * 100) / 100) + ' cm';
    var mw = ctx.measureText(mtxt).width;
    ctx.fillStyle = '#0b0f14dd';
    ctx.fillRect(mm.x - mw / 2 - 0.5, mm.y - 3, mw + 1, 2.6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(mtxt, mm.x - mw / 2, mm.y - 1);
  }

  /* hover highlight */
  if (S.hoverId && S.tool === 'select') {
    var hp = findPath(S.hoverId);
    if (hp) {
      ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = neonCm * 2.4;
      tracePath(ctx, hp); ctx.stroke();
    }
  }

  ctx.restore();
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function tracePath(ctx, path) {
  var segs = pathSegs(path);
  ctx.beginPath();
  if (!segs.length) return;
  ctx.moveTo(segs[0].a.x, segs[0].a.y);
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    if (s.c1) ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.b.x, s.b.y);
    else ctx.lineTo(s.b.x, s.b.y);
  }
}
function drawMark(ctx, p, label, color) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x, p.y, 1.75, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = 0.22; ctx.stroke();
  ctx.font = 'bold 1.7px sans-serif';
  var w = ctx.measureText(label).width;
  ctx.fillStyle = '#0b0f14cc';
  ctx.fillRect(p.x - w / 2 - 0.4, p.y + 2, w + 0.8, 2.2);
  ctx.fillStyle = color;
  ctx.fillText(label, p.x - w / 2, p.y + 3.7);
}
function findPath(id) {
  for (var i = 0; i < S.project.paths.length; i++) if (S.project.paths[i].id === id) return S.project.paths[i];
  return null;
}

/* ---- hit testing ---- */
function hitPath(w, tolPx) {
  var tol = (tolPx || 8) / S.view.zoom;
  var best = null, bestD = tol;
  for (var i = 0; i < S.project.paths.length; i++) {
    var path = S.project.paths[i], segs = pathSegs(path);
    for (var j = 0; j < segs.length; j++) {
      var seg = segs[j], N = 16;
      for (var k = 0; k <= N; k++) {
        var p = segPoint(seg, k / N), d = dist(p, w);
        if (d < bestD) { bestD = d; best = { path: path, pathIndex: i }; }
      }
    }
  }
  return best;
}
function hitVertex(w) {
  var tol = 9 / S.view.zoom;
  for (var i = 0; i < S.project.paths.length; i++) {
    var path = S.project.paths[i];
    for (var j = 0; j < path.points.length; j++) {
      if (dist(path.points[j], w) < tol) return { path: path, index: j, kind: 'pt' };
    }
    if (path.type === 'bezier' && path.ctrl) {
      for (var c = 0; c < path.ctrl.length; c++) {
        if (!path.ctrl[c]) continue;
        if (dist(path.ctrl[c].c1, w) < tol) return { path: path, seg: c, which: 'c1', kind: 'ctrl' };
        if (dist(path.ctrl[c].c2, w) < tol) return { path: path, seg: c, which: 'c2', kind: 'ctrl' };
      }
    }
  }
  return null;
}

/* ---- tools & pointer input ---- */
function setTool(t) {
  S.tool = t;
  S.draft = null;
  if (t !== 'measure') S.measure = null;
  var els = document.querySelectorAll('.tool[data-tool]');
  for (var i = 0; i < els.length; i++) {
    els[i].classList.toggle('active', els[i].getAttribute('data-tool') === t);
  }
  $('hud').innerHTML = '<b>CANVAS</b> &nbsp;|&nbsp; tool: <b>' + t.toUpperCase() + '</b> &nbsp;|&nbsp; wheel = zoom &nbsp;|&nbsp; space+drag = pan';
  $('cv').style.cursor = (t === 'select') ? 'default' : 'crosshair';
  draw();
}
function finishDraft() {
  if (!S.draft || S.draft.points.length < 2) { S.draft = null; draw(); return; }
  pushUndo();
  var path;
  if (S.draft.type === 'bezier') {
    path = catmullToBezier(S.draft.points);
  } else {
    path = {
      id: newId(), name: '', type: 'polyline',
      points: S.draft.points.slice(), ctrl: null,
      lockedStart: false, lockedEnd: false,
      snapped: true, snapDelta: 0, origPoints: null, note: ''
    };
  }
  S.project.paths.push(path);
  S.draft = null;
  recompute();
}
function catmullToBezier(pts) {
  var n = pts.length, ctrl = [];
  for (var i = 0; i < n - 1; i++) {
    var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    ctrl.push({
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    });
  }
  return {
    id: newId(), name: '', type: 'bezier',
    points: pts.slice(), ctrl: ctrl,
    lockedStart: false, lockedEnd: false,
    snapped: true, snapDelta: 0, origPoints: null, note: ''
  };
}
function splitAtPoint(w) {
  var hit = hitPath(w, 12);
  if (!hit) { setStatus('Split: click on a neon path.', 'warn'); return; }
  var path = hit.path, L = pathLength(path), I = S.project.profile.intervalCm;
  /* nearest arc-length to click */
  var bestS = 0, bestD = 1e9;
  for (var s = 0; s <= L; s += I / 10) {
    var p = pathPointAt(path, s), d = dist(p, w);
    if (d < bestD) { bestD = d; bestS = s; }
  }
  /* snap split position to real cutting point */
  var cutS = Math.round(bestS / I) * I;
  cutS = clamp(cutS, I, Math.floor(L / I - EPS) * I);
  if (cutS <= EPS || cutS >= L - EPS) { setStatus('Split: cannot split here (too close to an end).', 'warn'); return; }
  pushUndo();
  var parts = pathSplitAt(path, cutS);
  if (!parts[0] || !parts[1]) return;
  var idx = S.project.paths.indexOf(path);
  var b = parts[1], a = parts[0];
  a.id = newId(); b.id = newId();
  a.lockedEnd = true; b.lockedStart = true;
  a.origPoints = null; b.origPoints = null;
  a.snapped = true; b.snapped = true;
  S.project.paths.splice(idx, 1, a, b);
  recompute();
  setStatus('Split at ' + fmt(cutS) + ' cm (cutting point).', 'ok');
}

function onPointerDown(ev) {
  var cv = $('cv');
  cv.setPointerCapture(ev.pointerId);
  var w = toWorld(ev);
  if (ev.button === 1 || S.spaceDown) {
    S.drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: S.view.x, vy: S.view.y };
    return;
  }
  if (S.tool === 'select') {
    var v = hitVertex(w);
    if (v) {
      pushUndo();
      S.drag = { kind: 'vertex', hit: v };
      if (S.sel.indexOf(v.path.id) < 0) { S.sel = [v.path.id]; renderSel(); }
      return;
    }
    var hit = hitPath(w);
    if (hit) {
      if (S.sel.indexOf(hit.path.id) < 0) {
        S.sel = (ev.shiftKey) ? S.sel.concat([hit.path.id]) : [hit.path.id];
        renderSel();
      }
      pushUndo();
      S.drag = { kind: 'move', last: w, start: w, moved: false };
    } else {
      S.sel = []; renderSel();
    }
    draw();
    return;
  }
  if (S.tool === 'pen' || S.tool === 'line' || S.tool === 'bezier') {
    var sp = snapGridPt(w);
    if (!S.draft) S.draft = { type: (S.tool === 'bezier') ? 'bezier' : (S.tool === 'line' ? 'line' : 'pen'), points: [] };
    S.draft.points.push(sp);
    if (S.tool === 'line' && S.draft.points.length >= 2) finishDraft();
    draw();
    return;
  }
  if (S.tool === 'text') {
    var txt = window.prompt('Text to place on the design:', '');
    if (txt) {
      pushUndo();
      S.project.texts.push({ id: newId(), x: w.x, y: w.y, text: txt, sizeCm: 3 });
      recompute();
    }
    return;
  }
  if (S.tool === 'split') { splitAtPoint(w); return; }
  if (S.tool === 'measure') {
    if (!S.measure || S.measure.b) S.measure = { a: snapGridPt(w), b: null };
    else {
      S.measure.b = snapGridPt(w);
      setStatus('Distance: ' + fmt(dist(S.measure.a, S.measure.b)) + ' cm', 'ok');
    }
    draw();
    return;
  }
}
function onPointerMove(ev) {
  var w = toWorld(ev);
  S.hoverW = w;
  $('stCoords').innerHTML = 'x: ' + fmt(Math.round(w.x * 100) / 100) + ' &nbsp; y: ' + fmt(Math.round(w.y * 100) / 100);
  if (S.drag && S.drag.kind === 'pan') {
    S.view.x = S.drag.vx - (ev.clientX - S.drag.sx) / S.view.zoom;
    S.view.y = S.drag.vy - (ev.clientY - S.drag.sy) / S.view.zoom;
    draw(); return;
  }
  if (S.drag && S.drag.kind === 'vertex') {
    var v = S.drag.hit, sp = snapGridPt(w);
    if (v.kind === 'pt') {
      v.path.points[v.index].x = sp.x; v.path.points[v.index].y = sp.y;
      v.path.snapped = false;
    } else {
      v.path.ctrl[v.seg][v.which].x = sp.x; v.path.ctrl[v.seg][v.which].y = sp.y;
    }
    draw(); return;
  }
  if (S.drag && S.drag.kind === 'move') {
    var dx = w.x - S.drag.last.x, dy = w.y - S.drag.last.y;
    if (Math.abs(w.x - S.drag.start.x) + Math.abs(w.y - S.drag.start.y) > 0.2) S.drag.moved = true;
    for (var i = 0; i < S.sel.length; i++) {
      var path = findPath(S.sel[i]);
      if (!path) continue;
      for (var j = 0; j < path.points.length; j++) { path.points[j].x += dx; path.points[j].y += dy; }
      if (path.ctrl) for (var c = 0; c < path.ctrl.length; c++) {
        if (!path.ctrl[c]) continue;
        path.ctrl[c].c1.x += dx; path.ctrl[c].c1.y += dy;
        path.ctrl[c].c2.x += dx; path.ctrl[c].c2.y += dy;
      }
    }
    S.drag.last = w;
    draw(); return;
  }
  if (S.draft && S.draft.points.length) {
    S.draft.preview = snapGridPt(w);
    draw();
    return;
  }
  if (S.measure && S.measure.a && !S.measure.b) { S.measure.b = null; S.measure.hover = snapGridPt(w); draw(); }
  if (S.tool === 'select') {
    var hit = hitPath(w, 7);
    var id = hit ? hit.path.id : null;
    if (id !== S.hoverId) { S.hoverId = id; draw(); }
  }
}
function onPointerUp(ev) {
  if (S.drag && S.drag.kind === 'move' && !S.drag.moved) {
    /* simple click on path — no recompute needed */
  } else if (S.drag && (S.drag.kind === 'vertex' || S.drag.kind === 'move')) {
    recompute();
  }
  S.drag = null;
}
function onWheel(ev) {
  ev.preventDefault();
  var r = $('cv').getBoundingClientRect();
  var mx = ev.clientX - r.left, my = ev.clientY - r.top;
  var wx = S.view.x + mx / S.view.zoom, wy = S.view.y + my / S.view.zoom;
  var f = (ev.deltaY < 0) ? 1.12 : 1 / 1.12;
  S.view.zoom = clamp(S.view.zoom * f, 0.25, 80);
  S.view.x = wx - mx / S.view.zoom;
  S.view.y = wy - my / S.view.zoom;
  $('stZoom').innerHTML = 'zoom: ' + Math.round(S.view.zoom / 7.5 * 100) + '%';
  draw();
}

/* =========================================================================
   PANELS: CUT LIST / MATERIALS & POWER / ROLLS & WASTE / STATUS
   ========================================================================= */
function renderCutList() {
  var tb = $('cutBody');
  if (!tb) return;
  var html = '';
  for (var i = 0; i < S.pieces.length; i++) {
    var p = S.pieces[i];
    html += '<tr>' +
      '<td class="num">' + p.n + '</td>' +
      '<td class="num"><b>' + fmt(Math.round(p.lengthCm * 1000) / 1000) + ' cm</b></td>' +
      '<td class="num">' + p.cuts + '</td>' +
      '<td class="lbl"><b>' + (p.startLabel || '-') + '</b></td>' +
      '<td class="lbl"><b>' + (p.endLabel || '-') + '</b></td>' +
      '<td>' + esc(p.pathName || '') + (p.isSub ? ' <small style="color:#8fa3b8">(split)</small>' : '') + '</td>' +
      '</tr>';
  }
  if (S.pieces.length) {
    html += '<tr class="tot"><td>TOTAL</td><td>' + fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm</td>' +
      '<td>' + Math.round(S.totalCm / S.project.profile.intervalCm) + '</td><td></td><td></td><td></td></tr>';
  }
  tb.innerHTML = html;
}
function renderMaterials() {
  var g = $('matGrid');
  if (!g) return;
  var pw = S.power, pr = S.project;
  var cap = pw.capacityW || pw.psuW;
  var psuTxt = pw.capacityW
    ? fmt(pw.capacityW) + ' W (user)'
    : fmt(pw.psuW) + ' W (recommended)';
  var wPerM = fmt(pw.wPerM), total = Math.round(pw.totalW * 10) / 10;
  g.innerHTML =
    card('TOTAL NEON', fmt(Math.round(pw.meters * 1000) / 1000) + ' m', 'pink',
      fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm of neon in ' + S.pieces.length + ' piece(s)') +
    card('POWER @ ' + wPerM + ' W/m', total + ' W', 'gold',
      'Total Power = ' + fmt(Math.round(pw.meters * 1000) / 1000) + ' m x ' + wPerM + ' W/m = ' + total + ' W') +
    card('POWER SUPPLY', psuTxt, '',
      'Safety factor ' + fmt(pw.safetyPct) + '% -> need ' + fmt(Math.round(pw.needW * 10) / 10) +
      ' W available. Current at ' + fmt(pw.voltage) + 'V: ' + fmt(Math.round(pw.amps * 100) / 100) + ' A') +
    card('ROLLS & WASTE', S.pack.count + ' roll(s)', 'gold',
      'Roll length ' + fmt(S.pack.rollCm) + ' cm. Waste ' + fmt(Math.round(S.pack.totalWaste * 10) / 10) +
      ' cm (' + fmt(Math.round(S.pack.wastePct * 10) / 10) + '%)') +
    card('CUTTING INTERVAL', fmt(pr.profile.intervalCm) + ' cm', '',
      'Every START/END lies on a real cutting point. Max piece ' + fmt(pr.settings.maxPieceLengthCm) + ' cm.') +
    card('BEND / SPACING', fmt(pr.profile.minBendRadiusMm) + ' mm / ' + fmt(pr.settings.minSpacingCm) + ' cm', '',
      'Neon width ' + fmt(pr.profile.widthMm) + ' mm, ' + fmt(pr.profile.voltageV) + ' V. Profile: ' + esc(pr.profile.name));
}
function card(title, big, cls, p) {
  return '<div class="mat-card"><h4>' + title + '</h4><div class="big ' + (cls || '') + '">' + big + '</div><p>' + p + '</p></div>';
}
function renderRolls() {
  var g = $('rollPanel');
  if (!g) return;
  var html = '', colors = ['#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#fb7185'];
  for (var b = 0; b < S.pack.bins.length; b++) {
    var bin = S.pack.bins[b];
    html += '<div class="roll-row"><div class="roll-tag">ROLL ' + pad2(b + 1) + '</div><div class="roll-bar">';
    for (var i = 0; i < bin.items.length; i++) {
      var pct = bin.items[i].len / S.pack.rollCm * 100;
      html += '<div class="roll-fill" style="width:' + pct + '%;background:' + colors[i % colors.length] +
        '" title="' + fmt(bin.items[i].len) + ' cm"></div>';
    }
    var wastePct = bin.waste / S.pack.rollCm * 100;
    html += '<div class="roll-fill" style="width:' + wastePct + '%;background:#243041"></div>';
    html += '</div><div class="roll-tag" style="width:150px">used ' +
      fmt(Math.round((S.pack.rollCm - bin.waste) * 10) / 10) + ' / ' + fmt(S.pack.rollCm) +
      ' cm &nbsp; waste ' + fmt(Math.round(bin.waste * 10) / 10) + ' cm</div></div>';
    html += '<div class="hint" style="margin:-4px 0 10px 74px">pieces: ';
    var names = [];
    for (var k = 0; k < bin.items.length; k++) names.push(fmt(bin.items[k].len) + ' cm');
    html += bin.items.length ? names.join(' + ') : '(empty)';
    html += '</div>';
  }
  html += '<div class="mat-card" style="margin-top:12px"><h4>CUTTING STOCK SUMMARY (FFD)</h4>' +
    '<p>Roll length: <b>' + fmt(S.pack.rollCm) + ' cm</b> &nbsp;|&nbsp; Rolls needed: <b>' + S.pack.count +
    '</b> &nbsp;|&nbsp; Total waste: <b>' + fmt(Math.round(S.pack.totalWaste * 10) / 10) + ' cm (' +
    fmt(Math.round(S.pack.wastePct * 10) / 10) + '%)</b><br>Algorithm: First-Fit-Decreasing on piece lengths. ' +
    'Reduce waste by reordering or combining pieces per roll in the table above.</p></div>';
  g.innerHTML = html;
}
function renderSel() {
  if (!$('selNone')) return;
  var ids = S.sel;
  if (!ids.length) {
    $('selNone').style.display = 'block';
    $('selInfo').style.display = 'none';
    return;
  }
  var path = findPath(ids[0]);
  if (!path) return;
  $('selNone').style.display = 'none';
  $('selInfo').style.display = 'block';
  var L = pathLength(path);
  var I = S.project.profile.intervalCm;
  $('selName').textContent = path.name;
  $('selLen').textContent = fmt(Math.round(L * 1000) / 1000) + ' cm';
  $('selLen2').textContent = (path.snapped ? fmt(Math.round(snapTarget(L, I) * 1000) / 1000) + ' cm' : 'not snapped');
  var pcs = [];
  for (var i = 0; i < S.pieces.length; i++) if (S.pieces[i].pathId === path.id) pcs.push(S.pieces[i]);
  $('selPieces').textContent = pcs.length + ' / ' + pcs.reduce(function (a, p) { return a + p.cuts; }, 0);
  $('selSE').textContent = (pcs.length ? pcs[0].startLabel + ' / ' + pcs[pcs.length - 1].endLabel : '-');
  $('selNameIn').value = path.name;
  $('selNote').value = path.note || '';
  $('selLockS').classList.toggle('primary', !!path.lockedStart);
  $('selLockE').classList.toggle('primary', !!path.lockedEnd);
}
function renderStatus() {
  if (!$('stTotal')) return;
  $('stTotal').innerHTML = 'Total: <b style="color:#22d3ee">' +
    fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm</b> = ' +
    fmt(Math.round(S.power.meters * 1000) / 1000) + ' m &nbsp;|&nbsp; ' +
    fmt(Math.round(S.power.totalW * 10) / 10) + ' W';
  var err = 0, warn = 0;
  for (var i = 0; i < S.issues.length; i++) {
    if (S.issues[i].level === 'error') err++;
    else if (S.issues[i].level === 'warn') warn++;
  }
  $('stIssues').innerHTML = 'CHECK: ' + (err ? '<span class="err">' + err + ' error(s)</span>' : '<span class="ok">0 errors</span>') +
    ' ' + (warn ? '<span class="warn">' + warn + ' warning(s)</span>' : '<span class="ok">0 warnings</span>');
}
function setStatus(msg, cls) {
  var el = $('stHint');
  if (!el) return;
  el.textContent = msg;
  el.className = cls || '';
}
function esc(s) {
  return String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
}

/* =========================================================================
   CHECK DESIGN
   ========================================================================= */
function runChecks() {
  var out = [], pr = S.project, I = pr.profile.intervalCm;
  var minR = (pr.profile.minBendRadiusMm || 0) / 10; /* cm */

  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    /* 4. open / incomplete */
    if (!path.points || path.points.length < 2) {
      out.push({ level: 'error', code: 'OPEN', msg: path.name + ': path is incomplete (needs at least 2 points).', pathId: path.id });
      continue;
    }
    var L = pathLength(path);
    if (L < I - EPS) {
      out.push({ level: 'error', code: 'SHORT', msg: path.name + ': length ' + fmt(L) + ' cm is shorter than one cutting interval (' + fmt(I) + ' cm).', pathId: path.id });
    }
    /* 1. length not cuttable / snap failed */
    var target = snapTarget(L, I);
    if (Math.abs(L - target) > 1e-4) {
      out.push({
        level: 'error', code: 'LEN',
        msg: path.name + ': geometry length ' + fmt(Math.round(L * 1000) / 1000) + ' cm is not a multiple of ' + fmt(I) +
          ' cm and could not be corrected geometrically (target ' + fmt(target) + ' cm).',
        pathId: path.id
      });
    } else if (path.snapped === false) {
      out.push({ level: 'warn', code: 'SNAP', msg: path.name + ': length not yet corrected. Run Snap Lengths.', pathId: path.id });
    }
    /* 7. piece too long */
    if (L > pr.settings.maxPieceLengthCm + EPS) {
      out.push({
        level: 'warn', code: 'LONG',
        msg: path.name + ': total length ' + fmt(L) + ' cm exceeds max piece length ' +
          fmt(pr.settings.maxPieceLengthCm) + ' cm — it is split into multiple pieces (check joints).',
        pathId: path.id
      });
    }
    /* 3a. bend radius at vertices (circumradius of 3 consecutive points) */
    for (var v = 1; v < path.points.length - 1; v++) {
      var a = path.points[v - 1], b = path.points[v], c = path.points[v + 1];
      var ab = dist(a, b), bc = dist(b, c), ca = dist(c, a);
      var area2 = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y));
      if (area2 < 1e-9) continue; /* collinear */
      var R = ab * bc * ca / (2 * area2);
      if (R < minR - 1e-6) {
        out.push({
          level: 'warn', code: 'BEND',
          msg: path.name + ': bend radius at vertex ' + (v + 1) + ' is ' + fmt(Math.round(R * 10) / 10) +
            ' cm — smaller than minimum ' + fmt(Math.round(minR * 10) / 10) + ' cm.',
          pathId: path.id
        });
      }
    }
    /* 3b. curvature of bezier segments */
    if (path.type === 'bezier' && path.ctrl) {
      var segs = pathSegs(path);
      for (var si = 0; si < segs.length; si++) {
        if (!segs[si].c1) continue;
        for (var tt = 0.05; tt < 1; tt += 0.05) {
          var d1 = segDeriv(segs[si], tt), d2 = segDeriv2(segs[si], tt);
          var speed = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
          if (speed < 1e-6) continue;
          var cross = Math.abs(d1.x * d2.y - d1.y * d2.x);
          if (cross < 1e-9) continue;
          var R2 = speed * speed * speed / cross;
          if (R2 < minR - 1e-6) {
            out.push({
              level: 'warn', code: 'BEND',
              msg: path.name + ': curve radius ~' + fmt(Math.round(R2 * 10) / 10) + ' cm at t=' +
                fmt(Math.round(tt * 100) / 100) + ' is below minimum ' + fmt(Math.round(minR * 10) / 10) + ' cm.',
              pathId: path.id
            });
            tt = 1;
          }
        }
      }
    }
    /* 8. almost-joined endpoints */
    for (var j = i + 1; j < pr.paths.length; j++) {
      var o = pr.paths[j];
      if (!o.points || o.points.length < 2) continue;
      var pairs = [
        [path.points[0], o.points[0]], [path.points[0], o.points[o.points.length - 1]],
        [path.points[path.points.length - 1], o.points[0]],
        [path.points[path.points.length - 1], o.points[o.points.length - 1]]
      ];
      for (var pi = 0; pi < pairs.length; pi++) {
        var dd = dist(pairs[pi][0], pairs[pi][1]);
        if (dd > pr.settings.nodeTolCm + EPS && dd < pr.settings.joinGapCm + EPS) {
          out.push({
            level: 'warn', code: 'JOIN',
            msg: 'Endpoints of ' + path.name + ' and ' + o.name + ' are ' + fmt(Math.round(dd * 100) / 100) +
              ' cm apart — they probably need to be connected (or snapped apart).'
          });
        }
      }
    }
    /* 2. spacing between paths (sampled) */
  }
  /* 2. min spacing between distinct paths */
  for (var p1 = 0; p1 < pr.paths.length; p1++) {
    for (var p2 = p1 + 1; p2 < pr.paths.length; p2++) {
      var A = pr.paths[p1], B = pr.paths[p2];
      if (!A.points || A.points.length < 2 || !B.points || B.points.length < 2) continue;
      var minD = 1e9;
      var sA = pathSegs(A), sB = pathSegs(B);
      for (var qa = 0; qa < sA.length; qa++) {
        for (var ia = 0; ia <= 20; ia++) {
          var pa = segPoint(sA[qa], ia / 20);
          for (var qb = 0; qb < sB.length; qb++) {
            for (var ib = 0; ib <= 20; ib++) {
              var pb = segPoint(sB[qb], ib / 20);
              var d2 = dist(pa, pb);
              if (d2 < minD) minD = d2;
            }
          }
        }
      }
      if (minD < pr.settings.minSpacingCm - 1e-6) {
        out.push({
          level: 'error', code: 'SPACE',
          msg: A.name + ' and ' + B.name + ' come as close as ' + fmt(Math.round(minD * 100) / 100) +
            ' cm — below minimum spacing ' + fmt(pr.settings.minSpacingCm) + ' cm.'
        });
      }
    }
  }
  /* 5. pieces without valid start/end labels */
  for (var pc = 0; pc < S.pieces.length; pc++) {
    if (!S.pieces[pc].startLabel || !S.pieces[pc].endLabel) {
      out.push({ level: 'warn', code: 'LBL', msg: 'Piece ' + S.pieces[pc].n + ' has no start/end label.' });
    }
  }
  /* 6. power vs capacity */
  if (S.power.capacityW > 0 && S.power.totalW > S.power.capacityW + EPS) {
    out.push({
      level: 'error', code: 'PSU',
      msg: 'Total power ' + fmt(Math.round(S.power.totalW * 10) / 10) + ' W exceeds PSU capacity ' +
        fmt(S.power.capacityW) + ' W. Recommended supply: ' + fmt(S.power.psuW) + ' W.'
    });
  }
  /* 9. split/END positions must sit on cutting points (verified on pieces) */
  for (var pi2 = 0; pi2 < S.pieces.length; pi2++) {
    var pc2 = S.pieces[pi2];
    var cutsExact = pc2.lengthCm / I;
    if (Math.abs(cutsExact - Math.round(cutsExact)) > 1e-4) {
      out.push({
        level: 'error', code: 'GRID',
        msg: 'Piece ' + pc2.n + ' (' + pc2.pathName + '): length ' + fmt(pc2.lengthCm) +
          ' cm is not on the ' + fmt(I) + ' cm cutting grid — START/END would miss real cut marks.'
      });
    }
  }
  if (!out.length) out.push({ level: 'info', code: 'OK', msg: 'All checks passed. Design is ready for export and fabrication.' });
  return out;
}
function segDeriv2(seg, t) {
  if (!seg.c1) return { x: 0, y: 0 };
  var mt = 1 - t;
  return {
    x: 6 * mt * (seg.c2.x - 2 * seg.c1.x + seg.a.x) + 6 * t * (seg.b.x - 2 * seg.c2.x + seg.c1.x),
    y: 6 * mt * (seg.c2.y - 2 * seg.c1.y + seg.a.y) + 6 * t * (seg.b.y - 2 * seg.c2.y + seg.c1.y)
  };
}
function showCheck() {
  recompute();
  var list = $('checkList');
  var html = '';
  for (var i = 0; i < S.issues.length; i++) {
    var is = S.issues[i];
    html += '<div class="issue"><span class="badge ' + is.level + '">' + is.level.toUpperCase() + '</span>' +
      '<div class="msg">' + esc(is.msg) + '</div></div>';
  }
  list.innerHTML = html;
  $('checkSub').textContent = 'Pre-export validation — ' + S.pieces.length + ' piece(s), ' +
    fmt(Math.round(S.totalCm * 10) / 10) + ' cm total, ' + S.power.totalW.toFixed(1) + ' W.';
  $('modalCheck').classList.remove('hidden');
}

/* =========================================================================
   EXPORTS / PRINT / IMPORT / PERSISTENCE
   ========================================================================= */
function fnum(n) { return (Math.round(n * 10000) / 10000).toString(); }
function pathD(path) {
  var segs = pathSegs(path);
  if (!segs.length) return '';
  var d = 'M ' + fnum(segs[0].a.x) + ' ' + fnum(segs[0].a.y);
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    if (s.c1) d += ' C ' + fnum(s.c1.x) + ' ' + fnum(s.c1.y) + ' ' + fnum(s.c2.x) + ' ' + fnum(s.c2.y) + ' ' + fnum(s.b.x) + ' ' + fnum(s.b.y);
    else d += ' L ' + fnum(s.b.x) + ' ' + fnum(s.b.y);
  }
  return d;
}
function svgBody() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm, a = [];
  a.push('<rect x="0" y="0" width="' + fnum(W) + '" height="' + fnum(H) + '" fill="#ffffff" stroke="#333333" stroke-width="0.25"/>');
  var neonCm = (pr.profile.widthMm || 8) / 10;
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2) continue;
    var color = PALETTE[i % PALETTE.length];
    a.push('<path d="' + pathD(path) + '" fill="none" stroke="' + color + '" stroke-width="' + fnum(neonCm * 0.9) +
      '" stroke-linecap="round" stroke-linejoin="round"/>');
    var L = pathLength(path), mid = pathPointAt(path, L / 2);
    a.push('<text x="' + fnum(mid.x) + '" y="' + fnum(mid.y - 1.4) + '" font-size="2.1" font-weight="bold" fill="' + color +
      '" text-anchor="middle" font-family="sans-serif">' + esc(path.name) + '</text>');
  }
  for (var p = 0; p < S.pieces.length; p++) {
    var pc = S.pieces[p], pts = pc.points;
    if (!pts || !pts.length) continue;
    var s0 = pts[0], e0 = pts[pts.length - 1];
    a.push('<circle cx="' + fnum(s0.x) + '" cy="' + fnum(s0.y) + '" r="1.1" fill="#16a34a"/>' +
      '<text x="' + fnum(s0.x - 1) + '" y="' + fnum(s0.y - 1.8) + '" font-size="1.7" font-weight="bold" fill="#166534" font-family="sans-serif">START ' + pad2(pc.n) + '</text>');
    a.push('<circle cx="' + fnum(e0.x) + '" cy="' + fnum(e0.y) + '" r="1.1" fill="#dc2626"/>' +
      '<text x="' + fnum(e0.x - 1) + '" y="' + fnum(e0.y + 3.2) + '" font-size="1.7" font-weight="bold" fill="#991b1b" font-family="sans-serif">END ' + pad2(pc.n) + '</text>');
  }
  for (var n = 0; n < S.nodes.length; n++) {
    var nd = S.nodes[n];
    a.push('<rect x="' + fnum(nd.x - 0.8) + '" y="' + fnum(nd.y - 0.8) + '" width="1.6" height="1.6" fill="#d97706" transform="rotate(45 ' + fnum(nd.x) + ' ' + fnum(nd.y) + ')"/>' +
      '<text x="' + fnum(nd.x + 1.2) + '" y="' + fnum(nd.y - 0.8) + '" font-size="1.8" font-weight="bold" fill="#b45309" font-family="sans-serif">' + nd.label + '</text>');
  }
  for (var t = 0; t < pr.texts.length; t++) {
    var tx = pr.texts[t];
    a.push('<text x="' + fnum(tx.x) + '" y="' + fnum(tx.y) + '" font-size="' + fnum(tx.sizeCm || 3) +
      '" fill="#444" font-family="sans-serif">' + esc(tx.text) + '</text>');
  }
  a.push('<text x="2" y="' + fnum(H - 2) + '" font-size="2" fill="#888" font-family="sans-serif">NEON CAD — ' +
    esc(pr.name) + ' — ' + fnum(W) + ' x ' + fnum(H) + ' cm</text>');
  return a.join('');
}
function exportSVG() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + fnum(W) + 'cm" height="' + fnum(H) + 'cm" viewBox="0 0 ' +
    fnum(W) + ' ' + fnum(H) + '">' + svgBody() + '</svg>';
  download(safeName() + '.svg', svg, 'image/svg+xml');
  setStatus('SVG exported (real scale 1:1).', 'ok');
}
function safeName() {
  return (S.project.name || 'neon-project').split(' ').join('_');
}
function exportDXF() {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var o = [];
  function push(s) { o.push(s); }
  function yflip(y) { return H - y; }
  push('0'); push('SECTION'); push('2'); push('HEADER');
  push('9'); push('$INSUNITS'); push('70'); push('4');
  push('9'); push('$MEASUREMENT'); push('70'); push('1');
  push('0'); push('ENDSEC');
  push('0'); push('SECTION'); push('2'); push('ENTITIES');
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2) continue;
    var segs = pathSegs(path), layer = 'NEON';
    for (var j = 0; j < segs.length; j++) {
      var seg = segs[j], steps = seg.c1 ? 12 : 1, prev = seg.a;
      for (var k = 1; k <= steps; k++) {
        var p = segPoint(seg, k / steps);
        push('0'); push('LINE'); push('8'); push(layer);
        push('10'); push(fnum(prev.x)); push('20'); push(fnum(yflip(prev.y))); push('30'); push('0');
        push('11'); push(fnum(p.x)); push('21'); push(fnum(yflip(p.y))); push('31'); push('0');
        prev = p;
      }
    }
    var L = pathLength(path), mid = pathPointAt(path, L / 2);
    push('0'); push('TEXT'); push('8'); push('LABELS');
    push('10'); push(fnum(mid.x)); push('20'); push(fnum(yflip(mid.y))); push('30'); push('0');
    push('40'); push('2.0'); push('1'); push(path.name);
  }
  for (var pi = 0; pi < S.pieces.length; pi++) {
    var pc = S.pieces[pi], pts = pc.points;
    if (!pts || !pts.length) continue;
    var s0 = pts[0], e0 = pts[pts.length - 1];
    push('0'); push('CIRCLE'); push('8'); push('POINTS');
    push('10'); push(fnum(s0.x)); push('20'); push(fnum(yflip(s0.y))); push('30'); push('0'); push('40'); push('1.0');
    push('0'); push('TEXT'); push('8'); push('POINTS');
    push('10'); push(fnum(s0.x)); push('20'); push(fnum(yflip(s0.y) + 1.5)); push('30'); push('0');
    push('40'); push('1.7'); push('1'); push('START ' + pad2(pc.n));
    push('0'); push('CIRCLE'); push('8'); push('POINTS');
    push('10'); push(fnum(e0.x)); push('20'); push(fnum(yflip(e0.y))); push('30'); push('0'); push('40'); push('1.0');
    push('0'); push('TEXT'); push('8'); push('POINTS');
    push('10'); push(fnum(e0.x)); push('20'); push(fnum(yflip(e0.y) - 2.5)); push('30'); push('0');
    push('40'); push('1.7'); push('1'); push('END ' + pad2(pc.n));
  }
  for (var ni = 0; ni < S.nodes.length; ni++) {
    var nd = S.nodes[ni];
    push('0'); push('TEXT'); push('8'); push('NODES');
    push('10'); push(fnum(nd.x)); push('20'); push(fnum(yflip(nd.y) - 1.5)); push('30'); push('0');
    push('40'); push('1.8'); push('1'); push(nd.label);
  }
  push('0'); push('ENDSEC');
  push('0'); push('EOF');
  download(safeName() + '.dxf', o.join(String.fromCharCode(13, 10)), 'application/dxf');
  setStatus('DXF exported (R12, units = cm, Y-up).', 'ok');
}
function renderStandalone(scale) {
  var pr = S.project, W = pr.board.widthCm, H = pr.board.heightCm;
  var cv = document.createElement('canvas');
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  var neonCm = (pr.profile.widthMm || 8) / 10;
  for (var i = 0; i < pr.paths.length; i++) {
    var path = pr.paths[i];
    if (!path.points || path.points.length < 2) continue;
    var color = PALETTE[i % PALETTE.length];
    tracePath(ctx, path);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = color; ctx.lineWidth = neonCm * 1.6; ctx.globalAlpha = 0.25; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = neonCm * 0.9; ctx.stroke();
  }
  ctx.fillStyle = '#333'; ctx.font = 'bold ' + 2.2 + 'px sans-serif';
  for (var n = 0; n < pr.paths.length; n++) {
    var pth = pr.paths[n], L = pathLength(pth), mid = pathPointAt(pth, L / 2);
    ctx.fillText(pth.name, mid.x - 2, mid.y - 1.2);
  }
  for (var pi = 0; pi < S.pieces.length; pi++) {
    var pc = S.pieces[pi], pts = pc.points;
    if (!pts || !pts.length) continue;
    ctx.fillStyle = '#16a34a'; ctx.fillRect(pts[0].x - 0.8, pts[0].y - 0.8, 1.6, 1.6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(pts[pts.length - 1].x - 0.8, pts[pts.length - 1].y - 0.8, 1.6, 1.6);
    ctx.font = 'bold 1.7px sans-serif';
    ctx.fillStyle = '#166534'; ctx.fillText('START ' + pad2(pc.n), pts[0].x + 1, pts[0].y - 1);
    ctx.fillStyle = '#991b1b'; ctx.fillText('END ' + pad2(pc.n), pts[pts.length - 1].x + 1, pts[pts.length - 1].y + 2.4);
  }
  ctx.strokeStyle = '#333'; ctx.lineWidth = 0.25;
  ctx.strokeRect(0, 0, W, H);
  return cv;
}
function exportPNG() {
  var cv = renderStandalone(113.4); /* px per cm ~= 300 dpi */
  cv.toBlob(function (blob) {
    downloadBlob(safeName() + '.png', blob);
    setStatus('PNG exported (high resolution).', 'ok');
  });
}
function exportCSV() {
  var crlf = String.fromCharCode(13, 10);
  var rows = [];
  rows.push('No,Length_cm,Cuts_2.5cm,Start,End,Path');
  for (var i = 0; i < S.pieces.length; i++) {
    var p = S.pieces[i];
    rows.push([p.n, fmt(Math.round(p.lengthCm * 1000) / 1000), p.cuts, p.startLabel || '', p.endLabel || '', '"' + (p.pathName || '') + '"'].join(','));
  }
  rows.push('');
  rows.push('TOTAL_cm,' + fmt(Math.round(S.totalCm * 1000) / 1000));
  rows.push('TOTAL_m,' + fmt(Math.round(S.power.meters * 1000) / 1000));
  rows.push('POWER_W_per_m,' + fmt(S.power.wPerM));
  rows.push('TOTAL_POWER_W,' + fmt(Math.round(S.power.totalW * 10) / 10));
  rows.push('PSU_RECOMMENDED_W,' + fmt(S.power.psuW));
  rows.push('ROLLS,' + S.pack.count);
  rows.push('WASTE_cm,' + fmt(Math.round(S.pack.totalWaste * 10) / 10));
  var bom = String.fromCharCode(0xFEFF);
  download(safeName() + '-cutlist.csv', bom + rows.join(crlf), 'text/csv');
  setStatus('CSV cut list exported.', 'ok');
}
function exportJSON() {
  download(safeName() + '.json', JSON.stringify(S.project, null, 2), 'application/json');
  setStatus('Project JSON exported.', 'ok');
}
function download(filename, content, mime) {
  var blob = new Blob([content], { type: (mime || 'application/octet-stream') + ';charset=utf-8' });
  downloadBlob(filename, blob);
}
function downloadBlob(filename, blob) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
}

/* ---- PRINT / PDF sheet ---- */
function buildPrint() {
  recompute();
  var pr = S.project, pw = S.power;
  var dateStr = new Date().toLocaleDateString('fa-IR') + ' — ' + new Date().toLocaleDateString('en-CA');
  var rows = '';
  for (var i = 0; i < S.pieces.length; i++) {
    var p = S.pieces[i];
    rows += '<tr><td>' + p.n + '</td><td>' + fmt(Math.round(p.lengthCm * 1000) / 1000) + ' cm</td><td>' + p.cuts +
      '</td><td>' + (p.startLabel || '-') + '</td><td>' + (p.endLabel || '-') + '</td><td>' + esc(p.pathName || '') + '</td></tr>';
  }
  rows += '<tr><td><b>مجموع / TOTAL</b></td><td><b>' + fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm</b></td><td><b>' +
    Math.round(S.totalCm / pr.profile.intervalCm) + '</b></td><td></td><td></td><td></td></tr>';
  var rollRows = '';
  for (var b = 0; b < S.pack.bins.length; b++) {
    var bin = S.pack.bins[b], lens = [];
    for (var k = 0; k < bin.items.length; k++) lens.push(fmt(bin.items[k].len));
    rollRows += '<tr><td>' + (b + 1) + '</td><td>' + (lens.join(' + ') || '—') + '</td><td>' +
      fmt(Math.round((S.pack.rollCm - bin.waste) * 10) / 10) + ' cm</td><td>' + fmt(Math.round(bin.waste * 10) / 10) + ' cm</td></tr>';
  }
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + fnum(pr.board.widthCm) + ' ' + fnum(pr.board.heightCm) + '">' +
    svgBody() + '</svg>';
  $('printArea').innerHTML =
    '<div class="pr-h"><h1>NEON CAD — برگه ساخت / FABRICATION SHEET</h1>' +
    '<div class="pr-sub">پروژه / Project: <b>' + esc(pr.name) + '</b> &nbsp;|&nbsp; تاریخ / Date: ' + dateStr +
    ' &nbsp;|&nbsp; ابعاد تابلو / Board: ' + fmt(pr.board.widthCm) + ' x ' + fmt(pr.board.heightCm) + ' cm' +
    ' &nbsp;|&nbsp; پروفایل / Profile: ' + esc(pr.profile.name) + ' (' + fmt(pr.profile.widthMm) + 'mm, ' +
    fmt(pr.profile.voltageV) + 'V, cut every ' + fmt(pr.profile.intervalCm) + ' cm)</div></div>' +
    '<div class="pr-h2">جدول برش / CUT LIST</div>' +
    '<table><thead><tr><th>شماره</th><th>طول</th><th>تعداد برش ' + fmt(pr.profile.intervalCm) + 'cm</th><th>شروع</th><th>پایان</th><th>مسیر</th></tr></thead><tbody>' +
    rows + '</tbody></table>' +
    '<div class="pr-h2">مواد و برق / MATERIALS &amp; POWER</div>' +
    '<table class="pr-kv">' +
    '<tr><td>متراژ کل نئون / Total neon</td><td><b>' + fmt(Math.round(pw.meters * 1000) / 1000) + ' m</b> (' +
    fmt(Math.round(S.totalCm * 1000) / 1000) + ' cm)</td></tr>' +
    '<tr><td>توان واحد / Power per meter</td><td><b>' + fmt(pw.wPerM) + ' W/m</b></td></tr>' +
    '<tr><td>توان کل / Total power</td><td><b>' + fmt(Math.round(pw.totalW * 10) / 10) + ' W</b></td></tr>' +
    '<tr><td>ضریب اطمینان / Safety factor</td><td>' + fmt(pw.safetyPct) + '% → required ' + fmt(Math.round(pw.needW * 10) / 10) + ' W</td></tr>' +
    '<tr><td>منبع تغذیه پیشنهادی / PSU</td><td><b>' + fmt(pw.psuW) + ' W @ ' + fmt(pw.voltage) + ' V</b> (' +
    fmt(Math.round(pw.amps * 100) / 100) + ' A)</td></tr>' +
    '<tr><td>حداقل شعاع خم / Min bend radius</td><td>' + fmt(pr.profile.minBendRadiusMm) + ' mm</td></tr>' +
    '<tr><td>حداقل فاصله مسیرها / Min spacing</td><td>' + fmt(pr.settings.minSpacingCm) + ' cm</td></tr>' +
    '</table>' +
    '<div class="pr-h2">بهینه‌سازی رول / ROLLS &amp; WASTE (FFD)</div>' +
    '<table><thead><tr><th>رول</th><th>قطعات (cm)</th><th>مصرف</th><th>پرت</th></tr></thead><tbody>' + rollRows +
    '<tr><td colspan="2"><b>مجموع / TOTAL</b></td><td><b>' + fmt(Math.round(S.pack.totalUsed * 10) / 10) + ' cm</b></td><td><b>' +
    fmt(Math.round(S.pack.totalWaste * 10) / 10) + ' cm (' + fmt(Math.round(S.pack.wastePct * 10) / 10) + '%)</b></td></tr>' +
    '</tbody></table>' +
    '<div class="pr-h2">طرح / DESIGN (real scale ' + fmt(pr.board.widthCm) + ' x ' + fmt(pr.board.heightCm) + ' cm)</div>' +
    '<div class="pr-svg">' + svg + '</div>' +
    '<div class="pr-sign"><div>سازنده / Fabricated by</div><div>کنترل / Checked by</div><div>تاریخ / Date</div></div>' +
    '<div class="pr-foot">Generated by NEON CAD — all START/END points lie on real ' + fmt(pr.profile.intervalCm) +
    ' cm cutting points. Geometry was corrected (not just rounded) to match cuttable lengths.</div>';
}
function doPrint() {
  buildPrint();
  setTimeout(function () { window.print(); }, 120);
}

/* ---- SVG / JSON import ---- */
var NUMRE = /[-+]?[0-9]*[.]?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
function parsePathD(d) {
  var tk = d.match(/[a-zA-Z]|[-+]?[0-9]*[.]?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];
  var i = 0, cmd = '', cur = { x: 0, y: 0 }, startPt = { x: 0, y: 0 };
  var subs = [], pts = null, ctrl = null, sawCurve = false, lastC = null, lastQ = null;
  function n() { return parseFloat(tk[i++]); }
  function pushSeg(to, c1, c2) {
    if (!pts) { pts = [{ x: cur.x, y: cur.y }]; ctrl = []; }
    if (c1) sawCurve = true;
    ctrl.push(c1 ? { c1: c1, c2: c2 } : null);
    pts.push({ x: to.x, y: to.y });
    cur = { x: to.x, y: to.y };
  }
  function finishSub() {
    if (pts && pts.length >= 2) subs.push({ points: pts, ctrl: ctrl, curve: sawCurve });
    pts = null; ctrl = null; sawCurve = false;
  }
  while (i < tk.length) {
    var t = tk[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; }
    if (!cmd) { i++; continue; }
    var up = cmd.toUpperCase(), rel = (cmd !== up);
    if (up === 'M') {
      var x = n(), y = n();
      if (rel) { x += cur.x; y += cur.y; }
      finishSub();
      cur = { x: x, y: y }; startPt = { x: x, y: y };
      pts = [{ x: x, y: y }]; ctrl = []; sawCurve = false;
      cmd = rel ? 'l' : 'L';
      continue;
    }
    if (up === 'Z') {
      if (pts) pushSeg({ x: startPt.x, y: startPt.y }, null, null);
      cur = { x: startPt.x, y: startPt.y };
      finishSub();
      continue;
    }
    if (up === 'L') {
      var x2 = n(), y2 = n();
      if (rel) { x2 += cur.x; y2 += cur.y; }
      pushSeg({ x: x2, y: y2 }, null, null); continue;
    }
    if (up === 'H') {
      var xh = n(); if (rel) xh += cur.x;
      pushSeg({ x: xh, y: cur.y }, null, null); continue;
    }
    if (up === 'V') {
      var yh = n(); if (rel) yh += cur.y;
      pushSeg({ x: cur.x, y: yh }, null, null); continue;
    }
    if (up === 'C') {
      var ax = n(), ay = n(), bx = n(), by = n(), x3 = n(), y3 = n();
      if (rel) { ax += cur.x; ay += cur.y; bx += cur.x; by += cur.y; x3 += cur.x; y3 += cur.y; }
      lastC = { x: bx, y: by };
      pushSeg({ x: x3, y: y3 }, { x: ax, y: ay }, { x: bx, y: by }); continue;
    }
    if (up === 'S') {
      var ex = n(), ey = n(), x4 = n(), y4 = n();
      if (rel) { ex += cur.x; ey += cur.y; x4 += cur.x; y4 += cur.y; }
      var c1x = lastC ? 2 * cur.x - lastC.x : cur.x, c1y = lastC ? 2 * cur.y - lastC.y : cur.y;
      lastC = { x: ex, y: ey };
      pushSeg({ x: x4, y: y4 }, { x: c1x, y: c1y }, { x: ex, y: ey }); continue;
    }
    if (up === 'Q') {
      var qx = n(), qy = n(), x5 = n(), y5 = n();
      if (rel) { qx += cur.x; qy += cur.y; x5 += cur.x; y5 += cur.y; }
      var q1 = { x: cur.x + 2 / 3 * (qx - cur.x), y: cur.y + 2 / 3 * (qy - cur.y) };
      var q2 = { x: x5 + 2 / 3 * (qx - x5), y: y5 + 2 / 3 * (qy - y5) };
      lastQ = { x: qx, y: qy }; lastC = null;
      pushSeg({ x: x5, y: y5 }, q1, q2); continue;
    }
    if (up === 'T') {
      var x6 = n(), y6 = n();
      if (rel) { x6 += cur.x; y6 += cur.y; }
      var qq = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : { x: cur.x, y: cur.y };
      var t1 = { x: cur.x + 2 / 3 * (qq.x - cur.x), y: cur.y + 2 / 3 * (qq.y - cur.y) };
      var t2 = { x: x6 + 2 / 3 * (qq.x - x6), y: y6 + 2 / 3 * (qq.y - y6) };
      lastQ = qq;
      pushSeg({ x: x6, y: y6 }, t1, t2); continue;
    }
    if (i < tk.length && !/[a-zA-Z]/.test(tk[i])) i++;
  }
  finishSub();
  return subs;
}
function importSvgText(text) {
  var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  var root = doc.documentElement;
  if (!root) { setStatus('SVG import failed.', 'err'); return; }
  var els = root.querySelectorAll('path, polyline, polygon, line, rect, circle');
  var built = [];
  for (var e = 0; e < els.length; e++) {
    var el = els[e], tag = el.tagName.toLowerCase();
    if (tag === 'path') {
      var subs = parsePathD(el.getAttribute('d') || '');
      for (var s = 0; s < subs.length; s++) {
        built.push({
          type: subs[s].curve ? 'bezier' : 'polyline',
          points: subs[s].points,
          ctrl: subs[s].curve ? subs[s].ctrl : null
        });
      }
    } else if (tag === 'polyline' || tag === 'polygon') {
      var nums = (el.getAttribute('points') || '').match(NUMRE) || [];
      var parr = [];
      for (var k = 0; k + 1 < nums.length; k += 2) parr.push({ x: parseFloat(nums[k]), y: parseFloat(nums[k + 1]) });
      if (tag === 'polygon' && parr.length) parr.push({ x: parr[0].x, y: parr[0].y });
      if (parr.length >= 2) built.push({ type: 'polyline', points: parr, ctrl: null });
    } else if (tag === 'line') {
      built.push({
        type: 'polyline', ctrl: null,
        points: [
          { x: parseFloat(el.getAttribute('x1') || 0), y: parseFloat(el.getAttribute('y1') || 0) },
          { x: parseFloat(el.getAttribute('x2') || 0), y: parseFloat(el.getAttribute('y2') || 0) }
        ]
      });
    } else if (tag === 'rect') {
      var rx = parseFloat(el.getAttribute('x') || 0), ry = parseFloat(el.getAttribute('y') || 0);
      var rw = parseFloat(el.getAttribute('width') || 0), rh = parseFloat(el.getAttribute('height') || 0);
      if (rw > 0 && rh > 0) built.push({
        type: 'polyline', ctrl: null,
        points: [{ x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }, { x: rx, y: ry }]
      });
    } else if (tag === 'circle') {
      var cx = parseFloat(el.getAttribute('cx') || 0), cy = parseFloat(el.getAttribute('cy') || 0);
      var rr = parseFloat(el.getAttribute('r') || 0);
      if (rr > 0) {
        var cp = [];
        for (var a = 0; a <= 32; a++) {
          var ang = a / 32 * Math.PI * 2;
          cp.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
        }
        built.push({ type: 'polyline', points: cp, ctrl: null });
      }
    }
  }
  if (!built.length) { setStatus('SVG import: no geometry found.', 'warn'); return; }
  /* bbox of all */
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (var b = 0; b < built.length; b++) {
    for (var pi = 0; pi < built[b].points.length; pi++) {
      var p = built[b].points[pi];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  var bw = Math.max(maxX - minX, 0.001), bh = Math.max(maxY - minY, 0.001);
  var B = S.project.board;
  var sc = Math.min(B.widthCm * 0.92 / bw, B.heightCm * 0.92 / bh);
  var offX = (B.widthCm - bw * sc) / 2 - minX * sc, offY = (B.heightCm - bh * sc) / 2 - minY * sc;
  pushUndo();
  for (var q = 0; q < built.length; q++) {
    var pts2 = built[q].points.map(function (p) {
      return { x: Math.round((p.x * sc + offX) * 1000) / 1000, y: Math.round((p.y * sc + offY) * 1000) / 1000 };
    });
    var ctrl2 = null;
    if (built[q].type === 'bezier' && built[q].ctrl) {
      ctrl2 = built[q].ctrl.map(function (c) {
        if (!c) return null;
        return {
          c1: { x: c.c1.x * sc + offX, y: c.c1.y * sc + offY },
          c2: { x: c.c2.x * sc + offX, y: c.c2.y * sc + offY }
        };
      });
    }
    S.project.paths.push({
      id: newId(), name: '', type: built[q].type, points: pts2, ctrl: ctrl2,
      lockedStart: false, lockedEnd: false, snapped: false, snapDelta: 0, origPoints: null,
      note: 'imported'
    });
  }
  recompute();
  setStatus('SVG imported: ' + built.length + ' path(s), scaled to board.', 'ok');
}
function importJsonText(text) {
  try {
    var obj = JSON.parse(text);
    if (!obj || !obj.paths) throw new Error('bad');
    pushUndo();
    obj.settings = obj.settings || demoProject().settings;
    obj.profile = obj.profile || demoProject().profile;
    obj.texts = obj.texts || [];
    obj.mode = obj.mode || 'auto';
    S.project = obj;
    syncPropsFromProject();
    recompute();
    setStatus('Project JSON loaded.', 'ok');
  } catch (e) {
    setStatus('JSON import failed: ' + e.message, 'err');
  }
}

/* ---- persistence: projects + neon profiles ---- */
function lsProjects() {
  var out = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf('narmafzar:proj:') === 0) out.push(k.substring('narmafzar:proj:'.length));
  }
  return out;
}
function saveProject() {
  var name = $('projName').value || 'Untitled';
  S.project.name = name;
  try {
    localStorage.setItem('narmafzar:proj:' + name, JSON.stringify(S.project));
    setStatus('Project saved in browser: ' + name, 'ok');
  } catch (e) {
    setStatus('Save failed (localStorage): ' + e.message, 'err');
  }
}
function openProject(name) {
  try {
    var raw = localStorage.getItem('narmafzar:proj:' + name);
    if (!raw) return;
    S.project = JSON.parse(raw);
    S.sel = []; S.undo.length = 0; S.redo.length = 0;
    syncPropsFromProject(); recompute();
    setStatus('Project opened: ' + name, 'ok');
  } catch (e) { setStatus('Open failed: ' + e.message, 'err'); }
}
function showOpenList() {
  var names = lsProjects();
  var html = '';
  for (var i = 0; i < names.length; i++) {
    html += '<div class="issue"><div class="msg"><b>' + esc(names[i]) + '</b></div>' +
      '<button class="btn sm open-proj" data-name="' + esc(names[i]) + '">Open</button>' +
      '<button class="btn sm del-proj" data-name="' + esc(names[i]) + '">Delete</button></div>';
  }
  if (!names.length) html = '<div class="hint">No saved projects yet. Use SAVE in the top bar.</div>';
  $('openList').innerHTML = html;
  $('modalOpen').classList.remove('hidden');
}
function loadProfiles() {
  try { return JSON.parse(localStorage.getItem('narmafzar:profiles') || '[]'); } catch (e) { return []; }
}
function refreshProfileSel() {
  var sel = $('profSel'), list = loadProfiles();
  var html = '<option value="">— select profile —</option>';
  for (var i = 0; i < list.length; i++) {
    html += '<option value="' + esc(list[i].name) + '">' + esc(list[i].name) + '</option>';
  }
  sel.innerHTML = html;
  sel.value = S.project.profile.name || '';
}
function saveProfile() {
  var p = {
    name: $('profName').value || 'Custom',
    widthMm: num($('propNeonW').value, 8),
    voltageV: num($('propVolt').value, 24),
    intervalCm: num($('propInterval').value, 2.5),
    minBendRadiusMm: num($('propBend').value, 30),
    powerPerMeterW: num($('propPower').value, 10),
    rollLengthCm: num($('propRoll').value, 500)
  };
  var list = loadProfiles(), found = false;
  for (var i = 0; i < list.length; i++) if (list[i].name === p.name) { list[i] = p; found = true; }
  if (!found) list.push(p);
  try {
    localStorage.setItem('narmafzar:profiles', JSON.stringify(list));
    S.project.profile = p;
    refreshProfileSel();
    recompute();
    setStatus('Profile saved: ' + p.name, 'ok');
  } catch (e) { setStatus('Profile save failed.', 'err'); }
}
function deleteProfile() {
  var name = $('profName').value;
  var list = loadProfiles(), out = [];
  for (var i = 0; i < list.length; i++) if (list[i].name !== name) out.push(list[i]);
  localStorage.setItem('narmafzar:profiles', JSON.stringify(out));
  refreshProfileSel();
  setStatus('Profile deleted: ' + name, 'ok');
}
function num(v, dflt) {
  var n = parseFloat(v);
  return isNaN(n) ? dflt : n;
}

/* ---- props <-> project ---- */
function syncPropsFromProject() {
  var pr = S.project;
  $('projName').value = pr.name || 'Untitled';
  $('propWidth').value = pr.board.widthCm;
  $('propHeight').value = pr.board.heightCm;
  $('propNeonW').value = pr.profile.widthMm;
  $('propInterval').value = pr.profile.intervalCm;
  $('propBend').value = pr.profile.minBendRadiusMm;
  $('propVolt').value = pr.profile.voltageV;
  $('propPower').value = pr.profile.powerPerMeterW;
  $('propRoll').value = pr.profile.rollLengthCm;
  $('propMaxPiece').value = pr.settings.maxPieceLengthCm;
  $('propSpacing').value = pr.settings.minSpacingCm;
  $('propSafety').value = pr.settings.safetyFactor;
  $('propPsu').value = pr.settings.psuCapacityW;
  $('propGrid').value = pr.settings.gridCm;
  $('propNodeTol').value = pr.settings.nodeTolCm;
  $('profName').value = pr.profile.name || '';
  refreshProfileSel();
}
function readProps() {
  var pr = S.project;
  pr.name = $('projName').value || 'Untitled';
  pr.board.widthCm = Math.max(1, num($('propWidth').value, 200));
  pr.board.heightCm = Math.max(1, num($('propHeight').value, 100));
  pr.profile.name = $('profName').value || 'Custom';
  pr.profile.widthMm = num($('propNeonW').value, 8);
  pr.profile.intervalCm = Math.max(0.1, num($('propInterval').value, 2.5));
  pr.profile.minBendRadiusMm = num($('propBend').value, 30);
  pr.profile.voltageV = num($('propVolt').value, 24);
  pr.profile.powerPerMeterW = Math.max(0.01, num($('propPower').value, 10));
  pr.profile.rollLengthCm = Math.max(10, num($('propRoll').value, 500));
  pr.settings.maxPieceLengthCm = Math.max(10, num($('propMaxPiece').value, 500));
  pr.settings.minSpacingCm = num($('propSpacing').value, 1.5);
  pr.settings.safetyFactor = clamp(num($('propSafety').value, 80), 40, 100);
  pr.settings.psuCapacityW = Math.max(0, num($('propPsu').value, 0));
  pr.settings.gridCm = Math.max(0.05, num($('propGrid').value, 0.5));
  pr.settings.nodeTolCm = Math.max(0.05, num($('propNodeTol').value, 0.5));
}

/* ---- path edit helpers ---- */
function reversePath(path) {
  path.points.reverse();
  if (path.ctrl && path.ctrl.length) {
    var nc = [];
    for (var i = path.ctrl.length - 1; i >= 0; i--) {
      var c = path.ctrl[i];
      nc.push(c ? { c1: { x: c.c2.x, y: c.c2.y }, c2: { x: c.c1.x, y: c.c1.y } } : null);
    }
    path.ctrl = nc;
  }
  var t = path.lockedStart;
  path.lockedStart = path.lockedEnd;
  path.lockedEnd = t;
}
function deleteSelected() {
  if (!S.sel.length) return;
  pushUndo();
  S.project.paths = S.project.paths.filter(function (p) { return S.sel.indexOf(p.id) < 0; });
  S.sel = [];
  recompute();
}
function snapAll() {
  pushUndo();
  var I = S.project.profile.intervalCm, ok = 0, fail = 0;
  for (var i = 0; i < S.project.paths.length; i++) {
    if (snapPath(S.project.paths[i], I)) ok++; else fail++;
  }
  recompute();
  setStatus('Snap lengths: ' + ok + ' corrected, ' + fail + ' could not be corrected geometrically.', fail ? 'warn' : 'ok');
}

/* ---- keyboard / tabs / init ---- */
function bindEvents() {
  /* tools */
  var toolEls = document.querySelectorAll('.tool[data-tool]');
  for (var i = 0; i < toolEls.length; i++) {
    (function (el) {
      el.addEventListener('click', function () { setTool(el.getAttribute('data-tool')); });
    })(toolEls[i]);
  }
  $('toolSnap').addEventListener('click', function () {
    S.gridOn = !S.gridOn;
    $('toolSnap').classList.toggle('active', S.gridOn);
    setStatus('Grid snap: ' + (S.gridOn ? 'ON' : 'OFF'), '');
    draw();
  });
  $('toolSnapLen').addEventListener('click', snapAll);
  $('toolReverse').addEventListener('click', function () {
    if (!S.sel.length) { setStatus('Select a path first.', 'warn'); return; }
    pushUndo();
    for (var i = 0; i < S.sel.length; i++) {
      var p = findPath(S.sel[i]);
      if (p) reversePath(p);
    }
    recompute();
    setStatus('Path direction reversed.', 'ok');
  });
  $('toolDelete').addEventListener('click', deleteSelected);

  /* topbar */
  $('btnMode').addEventListener('click', function () {
    var pr = S.project;
    pr.mode = (pr.mode === 'auto') ? 'manual' : 'auto';
    var b = $('btnMode');
    b.textContent = (pr.mode === 'auto') ? 'AUTO MODE' : 'MANUAL MODE';
    b.className = 'btn ' + (pr.mode === 'auto' ? 'mode-auto' : 'mode-manual');
    recompute();
    setStatus('Mode: ' + pr.mode.toUpperCase() + (pr.mode === 'auto' ? ' — lengths, numbering and cuts are managed automatically.' : ' — full manual control.'), '');
  });
  $('btnUndo').addEventListener('click', doUndo);
  $('btnRedo').addEventListener('click', doRedo);
  $('btnCheck').addEventListener('click', showCheck);
  $('btnPrint').addEventListener('click', doPrint);
  $('btnPrint2').addEventListener('click', doPrint);
  $('btnPrint3').addEventListener('click', doPrint);
  $('expSvg').addEventListener('click', exportSVG);
  $('expDxf').addEventListener('click', exportDXF);
  $('expPng').addEventListener('click', exportPNG);
  $('expCsv').addEventListener('click', exportCSV);
  $('expJson').addEventListener('click', exportJSON);
  $('btnSave').addEventListener('click', saveProject);
  $('btnOpen').addEventListener('click', showOpenList);
  $('btnNew').addEventListener('click', function () {
    if (!window.confirm('Start a new empty project? (unsaved changes are kept in undo)')) return;
    pushUndo();
    var d = demoProject();
    d.paths = []; d.texts = []; d.name = 'New Project';
    S.project = d; S.sel = [];
    syncPropsFromProject(); recompute();
    setTool('pen');
  });
  $('btnImport').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var txt = String(reader.result);
      if (file.name.toLowerCase().lastIndexOf('.json') === file.name.length - 5) importJsonText(txt);
      else importSvgText(txt);
    };
    reader.readAsText(file);
    ev.target.value = '';
  });

  /* props */
  var propIds = ['projName', 'propWidth', 'propHeight', 'propNeonW', 'propInterval', 'propBend', 'propVolt',
    'propPower', 'propRoll', 'propMaxPiece', 'propSpacing', 'propSafety', 'propPsu', 'propGrid', 'propNodeTol', 'profName'];
  for (var p = 0; p < propIds.length; p++) {
    $(propIds[p]).addEventListener('change', function () {
      pushUndo(); readProps(); recompute();
    });
  }
  $('profSel').addEventListener('change', function () {
    var name = $('profSel').value;
    if (!name) return;
    var list = loadProfiles();
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) {
        pushUndo();
        S.project.profile = JSON.parse(JSON.stringify(list[i]));
        S.project.profile.intervalCm = list[i].intervalCm || 2.5;
        S.project.settings.intervalCm = S.project.profile.intervalCm;
        syncPropsFromProject();
        recompute();
        setStatus('Profile applied: ' + name, 'ok');
      }
    }
  });
  $('btnSaveProf').addEventListener('click', saveProfile);
  $('btnDelProf').addEventListener('click', deleteProfile);
  $('btnAutoAll').addEventListener('click', snapAll);

  /* selected path panel */
  $('selReverse').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); reversePath(path); recompute();
  });
  $('selLockS').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.lockedStart = !path.lockedStart; recompute();
  });
  $('selLockE').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.lockedEnd = !path.lockedEnd; recompute();
  });
  $('selSnap').addEventListener('click', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo();
    if (snapPath(path, S.project.profile.intervalCm)) setStatus('Length corrected geometrically.', 'ok');
    else setStatus('Cannot correct geometry — see CHECK DESIGN.', 'warn');
    recompute();
  });
  $('selDel').addEventListener('click', deleteSelected);
  $('selNameIn').addEventListener('change', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.name = $('selNameIn').value; recompute();
  });
  $('selNote').addEventListener('change', function () {
    var path = findPath(S.sel[0]);
    if (!path) return;
    pushUndo(); path.note = $('selNote').value;
  });

  /* tabs */
  var tabEls = document.querySelectorAll('.tab');
  for (var t = 0; t < tabEls.length; t++) {
    (function (el) {
      el.addEventListener('click', function () {
        for (var j = 0; j < tabEls.length; j++) tabEls[j].classList.remove('active');
        el.classList.add('active');
        $('tabCut').style.display = el.getAttribute('data-tab') === 'cut' ? '' : 'none';
        $('tabMat').style.display = el.getAttribute('data-tab') === 'mat' ? '' : 'none';
        $('tabRoll').style.display = el.getAttribute('data-tab') === 'roll' ? '' : 'none';
      });
    })(tabEls[t]);
  }

  /* modals */
  $('btnCloseCheck').addEventListener('click', function () { $('modalCheck').classList.add('hidden'); });
  $('btnRecheck').addEventListener('click', showCheck);
  $('btnCloseOpen').addEventListener('click', function () { $('modalOpen').classList.add('hidden'); });
  $('openList').addEventListener('click', function (ev) {
    var b = ev.target;
    if (b.classList && b.classList.contains('open-proj')) {
      openProject(b.getAttribute('data-name'));
      $('modalOpen').classList.add('hidden');
    }
    if (b.classList && b.classList.contains('del-proj')) {
      localStorage.removeItem('narmafzar:proj:' + b.getAttribute('data-name'));
      showOpenList();
    }
  });

  /* canvas */
  var cv = $('cv');
  cv.addEventListener('pointerdown', onPointerDown);
  cv.addEventListener('pointermove', onPointerMove);
  cv.addEventListener('pointerup', onPointerUp);
  cv.addEventListener('pointercancel', onPointerUp);
  cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('dblclick', function () {
    if (S.draft) finishDraft();
    if (S.tool === 'pen' || S.tool === 'bezier') setTool('select');
  });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* keyboard */
  window.addEventListener('keydown', function (ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT')) return;
    if (ev.code === 'Space') { S.spaceDown = true; ev.preventDefault(); }
    if (ev.key === 'Escape') {
      if (!$('modalCheck').classList.contains('hidden')) { $('modalCheck').classList.add('hidden'); return; }
      if (!$('modalOpen').classList.contains('hidden')) { $('modalOpen').classList.add('hidden'); return; }
      S.draft = null; S.measure = null;
      setTool('select');
    }
    if (ev.key === 'Enter' && S.draft) finishDraft();
    if (ev.key === 'Delete' || ev.key === 'Backspace') deleteSelected();
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); doUndo(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); doRedo(); }
    if (!ev.ctrlKey && !ev.metaKey) {
      var map = { v: 'select', p: 'pen', l: 'line', b: 'bezier', t: 'text', s: 'split', m: 'measure' };
      var tk = map[ev.key.toLowerCase()];
      if (tk) setTool(tk);
    }
  });
  window.addEventListener('keyup', function (ev) {
    if (ev.code === 'Space') S.spaceDown = false;
  });
  window.addEventListener('resize', draw);
}

function init() {
  syncPropsFromProject();
  bindEvents();
  var b = $('btnMode');
  b.textContent = S.project.mode === 'auto' ? 'AUTO MODE' : 'MANUAL MODE';
  b.className = 'btn ' + (S.project.mode === 'auto' ? 'mode-auto' : 'mode-manual');
  $('toolSnap').classList.add('active');
  recompute();
  setStatus('Ready — demo project loaded. Try Pen / Line / Bezier, then CHECK DESIGN and PRINT.', 'ok');
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') {
      return new Response('ok', { headers: { 'content-type': 'text/plain' } });
    }
    return new Response(HTML_PAGE, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache'
      }
    });
  }
};
