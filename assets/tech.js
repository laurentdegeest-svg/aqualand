/* Aqualand — animation « comment ça marche » (canvas) */
(function () {
  "use strict";
  const root = document.getElementById("techX");
  if (!root) return;
  const cv = root.querySelector("canvas"), ctx = cv.getContext("2d");
  const cap = document.getElementById("techCaption"), satBar = document.getElementById("txSat"), satTxt = document.getElementById("txSatV");
  const chipA = document.getElementById("txA"), chipB = document.getElementById("txB");
  const btns = [...document.querySelectorAll(".steps-tech button")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COL = { ca: "#ff7a59", mg: "#c58cff", na: "#5fe3ff", hard: "#ffb08a", soft: "#7ef0cf", brine: "#ffffff", drain: "#c9a48f" };
  const TXT = [
    "L'eau dure traverse des milliers de billes de résine. Chaque ion de calcium ou de magnésium prend la place de deux ions de sodium : l'eau qui sort est douce.",
    "La résine est saturée : la vanne hydraulique envoie un peu d'eau salée. Le sodium chasse le calcaire, qui part à l'égout. Environ 300 g de sel par cycle.",
    "La résine est rechargée en sodium, prête pour un nouveau cycle. Tout est actionné par la pression de l'eau : 0 W, aucune électronique."
  ];
  const CHIPS = [["Entrée 32 °f", "Sortie 8 °f"], ["Saumure", "≈ 300 g de sel"], ["Résine régénérée", "0 W consommé"]];

  let W = 0, H = 0, dpr = 1, L = {}, sprites = {};
  let phase = 0, phaseT = 0, manual = false, running = false, last = 0, visible = false;

  /* ---------- Lens model (coordonnées normalisées, rayon = 1) ---------- */
  const BEADS = [
    { x: -0.06, y: 0.04, r: 0.38, n: 16 },
    { x: 0.66, y: -0.6, r: 0.3, n: 12 },
    { x: -0.66, y: 0.66, r: 0.27, n: 11 },
    { x: 0.78, y: 0.58, r: 0.22, n: 9 },
    { x: -0.72, y: -0.62, r: 0.2, n: 8 }
  ];
  const BG = [{ x: 0.25, y: -0.2, r: 0.5 }, { x: -0.5, y: -0.1, r: 0.35 }, { x: 0.45, y: 0.3, r: 0.3 }];
  BEADS.forEach(b => {
    b.sites = [];
    for (let i = 0; i < b.n; i++) b.sites.push({ a: (i / b.n) * Math.PI * 2 + Math.random() * 0.2, type: "na", t: 9, hits: 0, w: Math.random() * 6 });
  });
  const allSites = BEADS.flatMap(b => b.sites);
  let ions = [];
  const dots = Array.from({ length: 70 }, () => ({ x: Math.random() * 2.4 - 1.2, y: Math.random() * 2 - 1, s: 0.4 + Math.random() * 0.8 }));
  let spawnAcc = 0;

  /* ---------- Pipes ---------- */
  const pipes = {};
  function mkPipe(name, pts) {
    let len = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; }
    const old = pipes[name];
    pipes[name] = { pts, seg, len, parts: old ? old.parts : Array.from({ length: 14 }, (_, i) => ({ u: i / 14 + Math.random() * 0.03 })) };
  }
  function at(p, u) {
    let d = ((u % 1) + 1) % 1 * p.len;
    for (let i = 0; i < p.seg.length; i++) {
      if (d <= p.seg[i]) { const k = d / p.seg[i], a = p.pts[i], b = p.pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
      d -= p.seg[i];
    }
    const e = p.pts[p.pts.length - 1]; return [e[0], e[1], 0];
  }

  /* ---------- Layout ---------- */
  function layout() {
    const w = cv.parentElement.clientWidth;
    W = w; H = Math.round(w * (w < 560 ? 0.92 : 0.68));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = W < 560;
    const cab = { x: W * 0.05, y: H * (narrow ? 0.3 : 0.2), w: W * (narrow ? 0.3 : 0.26), h: H * (narrow ? 0.54 : 0.62) };
    const valve = { w: cab.w * 0.52, h: H * 0.075 }; valve.x = cab.x + cab.w / 2 - valve.w / 2; valve.y = cab.y - valve.h * 0.82;
    const col = { x: cab.x + cab.w * 0.1, y: cab.y + cab.h * 0.1, w: cab.w * 0.44, h: cab.h * 0.82 };
    const salt = { x: cab.x + cab.w * 0.62, y: cab.y + cab.h * 0.3, w: cab.w * 0.3, h: cab.h * 0.62 };
    const R = Math.min(W * (narrow ? 0.31 : 0.29), H * 0.4);
    const lens = { x: W * (narrow ? 0.66 : 0.665), y: H * (narrow ? 0.53 : 0.47), r: R };
    const zoom = { x: col.x + col.w / 2, y: col.y + col.h * 0.42 };
    const outX = cab.x + cab.w + W * 0.022, botY = H * 0.94;
    L = { cab, valve, col, salt, lens, zoom, R };
    mkPipe("in", [[0, valve.y + valve.h * 0.45], [valve.x, valve.y + valve.h * 0.45]]);
    mkPipe("out", [[valve.x + valve.w, valve.y + valve.h * 0.45], [outX, valve.y + valve.h * 0.45], [outX, botY], [W, botY]]);
    mkPipe("drain", [[col.x + col.w * 0.5, cab.y + cab.h], [col.x + col.w * 0.5, botY], [0, botY]]);
    mkPipe("brine", [[salt.x + salt.w * 0.3, salt.y + salt.h * 0.88], [col.x + col.w, salt.y + salt.h * 0.88]]);
    mkPipe("down", [[cab.x + cab.w / 2, valve.y + valve.h], [cab.x + cab.w / 2, col.y + 4]]);
    // sprites
    sprites = {};
    for (const k of ["ca", "mg", "na"]) sprites[k] = sprite(COL[k], k === "na" ? R * 0.034 : R * 0.05);
    sprites.dot = sprite("#ffffff", R * 0.012, 0.5);
    resinGrains = Array.from({ length: Math.round(col.w * col.h / 34) }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 1.6 }));
    saltCubes = Array.from({ length: 9 }, (_, i) => ({ x: 0.12 + (i % 3) * 0.28 + Math.random() * 0.06, y: 0.5 + Math.floor(i / 3) * 0.15 + Math.random() * 0.04, s: 0.2 + Math.random() * 0.06, r: (Math.random() - 0.5) * 0.6 }));
  }
  let resinGrains = [], saltCubes = [];
  function sprite(color, r, a = 1) {
    const s = Math.ceil(r * 4 * dpr), c = document.createElement("canvas"); c.width = c.height = s;
    const g = c.getContext("2d"), m = s / 2;
    const glow = g.createRadialGradient(m, m, 0, m, m, m);
    glow.addColorStop(0, hexA(color, 0.55 * a)); glow.addColorStop(0.45, hexA(color, 0.18 * a)); glow.addColorStop(1, hexA(color, 0));
    g.fillStyle = glow; g.fillRect(0, 0, s, s);
    const cr = r * dpr, core = g.createRadialGradient(m - cr * 0.35, m - cr * 0.35, cr * 0.1, m, m, cr);
    core.addColorStop(0, hexA("#ffffff", a)); core.addColorStop(0.35, hexA(color, a)); core.addColorStop(1, hexA(shade(color, -0.35), a));
    g.fillStyle = core; g.beginPath(); g.arc(m, m, cr, 0, 7); g.fill();
    return { c, s: s / dpr };
  }
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function shade(h, k) { const n = parseInt(h.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k)))); return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, "0")).join(""); }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

  /* ---------- Phase control ---------- */
  function setPhase(p, user) {
    if (user) manual = true;
    if (p === 0 && (phase !== 0 || user)) { allSites.forEach(s => { if (s.type !== "na") { s.type = "na"; s.t = 0; } }); ions = ions.filter(i => i.type === "na" && i.free); }
    if (p === 1 && sat() < 0.6) allSites.forEach(s => { if (Math.random() < 0.9 && s.type === "na") { s.type = Math.random() < 0.7 ? "ca" : "mg"; s.t = 0; } });
    if (p === 2) { allSites.forEach(s => { if (s.type !== "na") { s.type = "na"; s.t = 0; } }); ions = ions.filter(i => i.type !== "na"); }
    phase = p; phaseT = 0;
    btns.forEach(b => b.classList.toggle("active", +b.dataset.phase === p));
    if (cap) cap.textContent = TXT[p];
    if (chipA) { chipA.textContent = CHIPS[p][0]; chipB.textContent = CHIPS[p][1]; }
    root.dataset.phase = p;
  }
  const sat = () => allSites.filter(s => s.type !== "na").length / allSites.length;
  btns.forEach(b => b.addEventListener("click", e => setPhase(+b.dataset.phase, e.isTrusted)));

  /* ---------- Simulation ---------- */
  function step(dt) {
    phaseT += dt;
    const flow = [0.32, -0.34, 0.14][phase];
    // spawn
    spawnAcc += dt;
    const rate = phase === 0 ? 0.075 : phase === 1 ? 0.05 : 0.6;
    while (spawnAcc > rate) {
      spawnAcc -= rate;
      if (phase === 0) ions.push({ type: Math.random() < 0.68 ? "ca" : "mg", x: -1.15, y: Math.random() * 1.9 - 0.95, vx: flow, vy: 0, free: false });
      else if (phase === 1) ions.push({ type: "na", x: 1.15, y: Math.random() * 1.9 - 0.95, vx: flow, vy: 0, free: false });
    }
    for (const d of dots) { d.x += flow * d.s * dt * 1.4; if (d.x > 1.25) d.x = -1.25; if (d.x < -1.25) d.x = 1.25; }
    for (const s of allSites) s.t += dt;

    for (const io of ions) {
      // flow + drift
      io.vx += (flow - io.vx) * dt * 1.6;
      io.vy += (Math.sin((io.x * 3 + phaseT) * 1.7 + io.y * 4) * 0.08 - io.vy) * dt * 1.2;
      // attraction to a free site of the opposite kind
      const wants = phase === 0 ? (io.type !== "na" && !io.free) : phase === 1 ? (io.type === "na" && !io.free) : false;
      if (wants) {
        let best = null, bd = 0.55;
        for (const b of BEADS) {
          const db = Math.hypot(io.x - b.x, io.y - b.y) - b.r;
          if (db > 0.5) continue;
          for (const s of b.sites) {
            if (phase === 0 ? s.type !== "na" : s.type === "na") continue;
            const sx = b.x + Math.cos(s.a) * (b.r + 0.04), sy = b.y + Math.sin(s.a) * (b.r + 0.04), d = Math.hypot(io.x - sx, io.y - sy);
            if (d < bd) { bd = d; best = { b, s, sx, sy }; }
          }
        }
        if (best) {
          const k = 2.4 / Math.max(bd, 0.08);
          io.vx += (best.sx - io.x) * k * dt; io.vy += (best.sy - io.y) * k * dt;
          if (bd < 0.045) {
            const nx = Math.cos(best.s.a), ny = Math.sin(best.s.a);
            if (phase === 0) {
              // 1 Ca²⁺/Mg²⁺ remplace 2 Na⁺
              best.s.type = io.type; best.s.t = 0; io.dead = true;
              for (const o of [-0.5, 0.5]) ions.push({ type: "na", free: true, x: best.sx + nx * 0.03, y: best.sy + ny * 0.03, vx: nx * 0.5 + flow - ny * o * 0.4, vy: ny * 0.5 + nx * o * 0.4 });
            } else {
              io.dead = true; best.s.hits++;
              if (best.s.hits >= 2) { ions.push({ type: best.s.type, free: true, x: best.sx + nx * 0.03, y: best.sy + ny * 0.03, vx: nx * 0.5 + flow, vy: ny * 0.5 }); best.s.type = "na"; best.s.t = 0; best.s.hits = 0; }
            }
          }
        }
      }
      io.x += io.vx * dt; io.y += io.vy * dt;
      // collisions with beads
      for (const b of BEADS) {
        const dx = io.x - b.x, dy = io.y - b.y, d = Math.hypot(dx, dy), min = b.r + (io.type === "na" ? 0.035 : 0.05);
        if (d < min && d > 0) { const nx = dx / d, ny = dy / d; io.x = b.x + nx * min; io.y = b.y + ny * min; const vn = io.vx * nx + io.vy * ny; if (vn < 0) { io.vx -= vn * nx; io.vy -= vn * ny; } }
      }
      if (io.y > 1.05) io.vy -= 0.4 * dt; if (io.y < -1.05) io.vy += 0.4 * dt;
    }
    ions = ions.filter(i => !i.dead && i.x > -1.3 && i.x < 1.3);
    if (ions.length > 220) ions.splice(0, ions.length - 220);

    // pipes
    const speed = { in: [0.22, 0.12, 0.1][phase], out: [0.22, 0.05, 0.1][phase], drain: phase === 1 ? 0.2 : 0, brine: phase === 1 ? 0.16 : 0, down: [0.3, 0.2, 0.14][phase] };
    for (const k in pipes) for (const p of pipes[k].parts) p.u += (speed[k] || 0) * dt * (220 / Math.max(120, pipes[k].len));

    // auto-avance
    const s = sat();
    if (phase === 0 && (s > 0.9 || phaseT > 16)) setPhase(1);
    else if (phase === 1 && (s < 0.02 || phaseT > 14)) setPhase(2);
    else if (phase === 2 && phaseT > 4.5) setPhase(0);
    if (satBar) { satBar.style.width = Math.round(s * 100) + "%"; }
    if (satTxt) satTxt.textContent = Math.round(s * 100) + " %";
  }

  /* ---------- Rendu ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const { cab, valve, col, salt, lens, zoom, R } = L;
    const s = sat();

    // pipes
    const pipeStyle = { in: COL.hard, out: COL.soft, drain: COL.drain, brine: COL.brine, down: COL.hard };
    const active = { in: true, out: phase !== 1, drain: phase === 1, brine: phase === 1, down: true };
    for (const k of ["drain", "out", "in"]) {
      const p = pipes[k];
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); p.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 14; ctx.stroke();
      ctx.strokeStyle = hexA(pipeStyle[k], active[k] ? 0.28 : 0.08); ctx.lineWidth = 8; ctx.stroke();
      if (active[k]) for (const pt of p.parts) { const [x, y, a] = at(p, pt.u); capsule(x, y, a, pipeStyle[k]); }
    }

    // zoom lines
    const dx = zoom.x - lens.x, dy = zoom.y - lens.y, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx), al = Math.acos(Math.min(1, lens.r / d));
    for (const sg of [1, -1]) {
      const tx = lens.x + lens.r * Math.cos(th + sg * al), ty = lens.y + lens.r * Math.sin(th + sg * al);
      const g = ctx.createLinearGradient(zoom.x, zoom.y, tx, ty); g.addColorStop(0, "rgba(126,240,207,.55)"); g.addColorStop(1, "rgba(126,240,207,.05)");
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(zoom.x, zoom.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    }

    // cabinet
    const cg = ctx.createLinearGradient(cab.x, cab.y, cab.x + cab.w, cab.y + cab.h);
    cg.addColorStop(0, "#26315f"); cg.addColorStop(1, "#141b3d");
    rr(cab.x, cab.y, cab.w, cab.h, Math.min(22, cab.w * 0.12)); ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 1.2; ctx.stroke();
    // inner down tube
    { const p = pipes.down; ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); ctx.lineTo(p.pts[1][0], p.pts[1][1]); ctx.stroke(); }
    // resin column
    rr(col.x, col.y, col.w, col.h, col.w * 0.3);
    const rg = ctx.createLinearGradient(col.x, 0, col.x + col.w, 0);
    rg.addColorStop(0, "rgba(242,180,90,.18)"); rg.addColorStop(0.5, "rgba(242,180,90,.32)"); rg.addColorStop(1, "rgba(242,180,90,.14)");
    ctx.fillStyle = rg; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.stroke();
    ctx.save(); rr(col.x, col.y, col.w, col.h, col.w * 0.3); ctx.clip();
    const front = col.y + col.h * s;
    for (const g of resinGrains) {
      const x = col.x + g.x * col.w, y = col.y + g.y * col.h, used = y < front;
      ctx.fillStyle = used ? "rgba(255,122,89,.75)" : (phase === 2 ? "rgba(126,240,207,.65)" : "rgba(255,206,130,.6)");
      ctx.beginPath(); ctx.arc(x, y, g.r, 0, 7); ctx.fill();
    }
    if (s > 0.01) { const fg = ctx.createLinearGradient(0, front - 14, 0, front + 6); fg.addColorStop(0, "rgba(255,122,89,0)"); fg.addColorStop(0.7, "rgba(255,122,89,.35)"); fg.addColorStop(1, "rgba(255,122,89,0)"); ctx.fillStyle = fg; ctx.fillRect(col.x, front - 14, col.w, 20); }
    const sh = ctx.createLinearGradient(col.x, 0, col.x + col.w, 0); sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.22, "rgba(255,255,255,.18)"); sh.addColorStop(0.35, "rgba(255,255,255,0)");
    ctx.fillStyle = sh; ctx.fillRect(col.x, col.y, col.w, col.h);
    ctx.restore();
    // salt tank
    rr(salt.x, salt.y, salt.w, salt.h, 10); ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.stroke();
    ctx.save(); rr(salt.x, salt.y, salt.w, salt.h, 10); ctx.clip();
    const bl = salt.y + salt.h * (phase === 1 ? 0.62 - Math.min(0.2, phaseT * 0.02) : 0.62);
    const wg = ctx.createLinearGradient(0, bl, 0, salt.y + salt.h); wg.addColorStop(0, "rgba(95,227,255,.28)"); wg.addColorStop(1, "rgba(95,227,255,.08)");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(salt.x, bl);
    for (let x = 0; x <= salt.w; x += 4) ctx.lineTo(salt.x + x, bl + Math.sin(x * 0.15 + t * 2) * 1.5);
    ctx.lineTo(salt.x + salt.w, salt.y + salt.h); ctx.lineTo(salt.x, salt.y + salt.h); ctx.fill();
    for (const c of saltCubes) {
      const sz = c.s * salt.w; ctx.save(); ctx.translate(salt.x + c.x * salt.w + sz / 2, salt.y + c.y * salt.h); ctx.rotate(c.r);
      ctx.fillStyle = "rgba(255,255,255,.85)"; rr(-sz / 2, -sz / 2, sz, sz, 3); ctx.fill(); ctx.fillStyle = "rgba(200,220,255,.5)"; ctx.fillRect(-sz / 2, sz / 6, sz, sz / 3); ctx.restore();
    }
    ctx.restore();
    // brine link
    if (phase === 1) { const p = pipes.brine; ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); ctx.lineTo(p.pts[1][0], p.pts[1][1]); ctx.stroke(); for (const pt of p.parts) { const [x, y, a] = at(p, -pt.u); capsule(x, y, a, "#ffffff", 0.7); } }
    // valve
    const vg = ctx.createLinearGradient(0, valve.y, 0, valve.y + valve.h); vg.addColorStop(0, "#3a4683"); vg.addColorStop(1, "#1d2550");
    rr(valve.x, valve.y, valve.w, valve.h, 10); ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.stroke();
    const dc = { x: valve.x + valve.w / 2, y: valve.y + valve.h / 2, r: valve.h * 0.28 };
    ctx.beginPath(); ctx.arc(dc.x, dc.y, dc.r, 0, 7); ctx.fillStyle = "#0e1433"; ctx.fill(); ctx.strokeStyle = "rgba(126,240,207,.6)"; ctx.stroke();
    const ang = t * (phase === 1 ? 2.4 : 0.6); ctx.beginPath(); ctx.moveTo(dc.x, dc.y); ctx.lineTo(dc.x + Math.cos(ang) * dc.r * 0.8, dc.y + Math.sin(ang) * dc.r * 0.8); ctx.strokeStyle = "#7ef0cf"; ctx.lineWidth = 1.6; ctx.stroke();
    // zoom ring
    ctx.beginPath(); ctx.arc(zoom.x, zoom.y, 9 + Math.sin(t * 3) * 1.5, 0, 7); ctx.strokeStyle = "rgba(126,240,207,.9)"; ctx.lineWidth = 1.5; ctx.stroke();

    // labels
    const fs = Math.max(11, Math.min(13, W / 60));
    ctx.font = `700 ${fs}px Lato, sans-serif`; ctx.textBaseline = "alphabetic";
    label("Eau dure", 2, pipes.in.pts[0][1] - 12, COL.hard, "left");
    label("Eau douce", W - 2, pipes.out.pts[3][1] - 10, COL.soft, "right", phase === 1 ? 0.35 : 1);
    label("Égout", 2, pipes.drain.pts[2][1] - 10, COL.drain, "left", phase === 1 ? 1 : 0.35);
    ctx.font = `600 ${fs - 1}px Lato, sans-serif`;
    const nar = W < 420;
    if (!nar) label("Résine", col.x + col.w / 2, cab.y + cab.h + fs + 6, "rgba(255,255,255,.65)", "center");
    label("Sel", salt.x + salt.w / 2, salt.y - 8, phase === 1 ? "#fff" : "rgba(255,255,255,.65)", "center");
    if (!nar) label("Vanne hydraulique", valve.x + valve.w / 2, valve.y - 8, "rgba(255,255,255,.55)", "center");

    drawLens(t);
  }
  function label(txt, x, y, color, align, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(txt, x, y); ctx.globalAlpha = 1; }
  function capsule(x, y, a, color, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, hexA(color, 0)); g.addColorStop(1, hexA(color, 0.95));
    ctx.fillStyle = g; rr(-9, -2, 18, 4, 2); ctx.fill(); ctx.restore();
  }

  function drawLens(t) {
    const { lens } = L, R = lens.r, X = v => lens.x + v * R, Y = v => lens.y + v * R;
    // shadow + rim
    ctx.save();
    ctx.beginPath(); ctx.arc(lens.x, lens.y, R + 10, 0, 7); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fill();
    ctx.beginPath(); ctx.arc(lens.x, lens.y, R, 0, 7); ctx.clip();
    const bg = ctx.createRadialGradient(lens.x - R * 0.3, lens.y - R * 0.4, R * 0.1, lens.x, lens.y, R * 1.05);
    bg.addColorStop(0, phase === 1 ? "#1d4a74" : "#16406b"); bg.addColorStop(1, "#071631");
    ctx.fillStyle = bg; ctx.fillRect(lens.x - R, lens.y - R, R * 2, R * 2);
    // caustiques
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const cx = X(Math.sin(t * 0.25 + i * 1.7) * 0.6), cy = Y(Math.cos(t * 0.2 + i * 2.3) * 0.6), cr = R * (0.35 + 0.1 * Math.sin(t * 0.5 + i));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr); g.addColorStop(0, "rgba(120,200,255,.07)"); g.addColorStop(1, "rgba(120,200,255,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    // billes floues en arrière-plan
    for (const b of BG) { ctx.globalAlpha = 0.13; bead(X(b.x + Math.sin(t * 0.2 + b.x) * 0.02), Y(b.y), b.r * R, 0); }
    ctx.globalAlpha = 1;
    // particules d'eau
    for (const d of dots) ctx.drawImage(sprites.dot.c, X(d.x) - sprites.dot.s / 2, Y(d.y) - sprites.dot.s / 2, sprites.dot.s, sprites.dot.s);
    // billes + sites
    for (const b of BEADS) {
      bead(X(b.x), Y(b.y), b.r * R, phase === 2 ? 0.5 + 0.5 * Math.sin(t * 3) : 0);
      for (const s of b.sites) {
        const big = s.type !== "na", wob = Math.sin(t * 2 + s.w) * 0.008;
        const rad = b.r + (big ? 0.05 : 0.036) * 0.7 + wob;
        const sx = X(b.x + Math.cos(s.a) * rad), sy = Y(b.y + Math.sin(s.a) * rad);
        const pop = 1 + 0.7 * Math.exp(-s.t * 7);
        const sp = sprites[s.type], sz = sp.s * pop;
        ctx.drawImage(sp.c, sx - sz / 2, sy - sz / 2, sz, sz);
      }
    }
    // ions libres
    for (const io of ions) { const sp = sprites[io.type]; ctx.drawImage(sp.c, X(io.x) - sp.s / 2, Y(io.y) - sp.s / 2, sp.s, sp.s); }
    // vignette
    const vg = ctx.createRadialGradient(lens.x, lens.y, R * 0.7, lens.x, lens.y, R);
    vg.addColorStop(0, "rgba(4,10,30,0)"); vg.addColorStop(1, "rgba(4,10,30,.65)");
    ctx.fillStyle = vg; ctx.fillRect(lens.x - R, lens.y - R, R * 2, R * 2);
    ctx.restore();
    // bord de lentille
    ctx.beginPath(); ctx.arc(lens.x, lens.y, R, 0, 7);
    const rim = ctx.createLinearGradient(lens.x - R, lens.y - R, lens.x + R, lens.y + R);
    rim.addColorStop(0, "rgba(255,255,255,.55)"); rim.addColorStop(0.5, "rgba(255,255,255,.08)"); rim.addColorStop(1, "rgba(126,240,207,.4)");
    ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(lens.x, lens.y, R - 6, Math.PI * 1.1, Math.PI * 1.45); ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
    // étiquette
    if (W < 420) return;
    const fs = Math.max(10, Math.min(12, W / 70)); ctx.font = `700 ${fs}px Lato, sans-serif`;
    const tag = "VUE MICROSCOPIQUE · RÉSINE", tw = ctx.measureText(tag).width + 22, ty = lens.y + R + 8;
    rr(lens.x - tw / 2, ty, tw, fs + 12, 999); ctx.fillStyle = "rgba(10,16,40,.9)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.textAlign = "center"; ctx.fillText(tag, lens.x, ty + fs + 4);
  }
  function bead(x, y, r, glow) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, "#fff3d6"); g.addColorStop(0.18, "#f7c56c"); g.addColorStop(0.65, "#c77b1d"); g.addColorStop(1, "#6e3a08");
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill();
    const ig = ctx.createRadialGradient(x + r * 0.25, y + r * 0.35, 0, x + r * 0.25, y + r * 0.35, r * 0.7);
    ig.addColorStop(0, "rgba(255,200,120,.45)"); ig.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = ig; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill();
    if (glow > 0) { ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.strokeStyle = `rgba(126,240,207,${0.25 + glow * 0.5})`; ctx.lineWidth = 3; ctx.stroke(); }
  }

  /* ---------- Boucle ---------- */
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000) * (reduce ? 0.4 : 1); last = ts;
    step(dt); draw(ts / 1000);
    requestAnimationFrame(loop);
  }
  function start() { if (running) return; running = true; last = 0; requestAnimationFrame(loop); }
  function stop() { running = false; }
  layout(); setPhase(0);
  // pré-remplissage pour une première image vivante
  for (let i = 0; i < 90; i++) step(1 / 30);
  draw(0);
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; visible ? start() : stop(); }), { threshold: 0.05 }).observe(root);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(performance.now() / 1000); }, 120); });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : visible && start());
})();
