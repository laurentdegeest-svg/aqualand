/* Aqualand — animations & composants des pages */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = window.AQUALAND || {};

  /* Header clair/sombre selon la section */
  const header = $("#header");
  if (document.body.dataset.dark === "1") header.classList.add("on-dark");

  /* Flux d'eau animé (canvas) */
  const cv = $("#flow");
  if (cv && !reduce) {
    const ctx = cv.getContext("2d"); let W, H, pts = [];
    const fit = () => { W = cv.width = cv.offsetWidth * devicePixelRatio; H = cv.height = cv.offsetHeight * devicePixelRatio; };
    fit(); addEventListener("resize", fit);
    for (let i = 0; i < 70; i++) pts.push({ x: Math.random(), y: Math.random(), s: .2 + Math.random() * .8, o: Math.random() * 6.28 });
    (function draw(t) {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += .0006 * p.s; if (p.x > 1.05) { p.x = -.05; p.y = Math.random(); }
        const x = p.x * W, y = p.y * H + Math.sin(t / 1400 + p.o) * 18 * devicePixelRatio;
        const g = ctx.createLinearGradient(x - 120 * p.s * devicePixelRatio, y, x, y);
        g.addColorStop(0, "rgba(34,211,238,0)"); g.addColorStop(1, `rgba(52,245,197,${.25 + p.s * .5})`);
        ctx.strokeStyle = g; ctx.lineWidth = (1 + p.s * 1.5) * devicePixelRatio; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x - 120 * p.s * devicePixelRatio, y); ctx.lineTo(x, y); ctx.stroke();
      });
      requestAnimationFrame(draw);
    })(0);
  }

  /* Inclinaison 3D du produit (souris) */
  $$(".product-stage").forEach(st => {
    const p = $(".product-3d", st); if (!p || reduce) return;
    st.addEventListener("pointermove", e => {
      const r = st.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      p.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
    });
    st.addEventListener("pointerleave", () => p.style.transform = "");
  });

  /* Compteurs */
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, end = parseFloat(el.dataset.count), dur = 1400, t0 = performance.now();
    if (reduce) { el.textContent = fmt(end); return; }
    (function step(t) { const k = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - k, 3)); el.textContent = fmt(v); if (k < 1) requestAnimationFrame(step); })(t0);
  }), { threshold: .5 });
  $$("[data-count]").forEach(el => {
    if (el.dataset.count === "promo") el.dataset.count = (C.prixIndicatifInstallation || 1479) * (1 - (C.reduction || 0));
    io.observe(el);
  });

  /* Notes des solutions */
  const CRIT = [["Efficacité anticalcaire", 35], ["Coût sur 10 ans", 20], ["Fiabilité", 15], ["Simplicité", 10], ["Encombrement", 10], ["Liberté (sans contrat)", 10]];
  const SOL = [
    { n: "Aqualand", d: "Adoucisseur hydraulique + abonnement sel", us: true, s: [10, 9, 9, 9, 9, 10] },
    { n: "Adoucisseur électronique", d: "Achat classique avec contrat d'entretien", s: [10, 6, 6, 7, 6, 6] },
    { n: "Location tout compris", d: "Appareil loué avec engagement long", s: [10, 3, 7, 9, 6, 2] },
    { n: "Traitement CO2", d: "Stabilise le calcaire, ne l'enlève pas", s: [5, 7, 8, 7, 7, 8] },
    { n: "Anticalcaire magnétique", d: "Efficacité non démontrée", s: [1, 9, 8, 10, 10, 10] }
  ];
  const total = s => s.reduce((a, v, i) => a + v * CRIT[i][1] / 100, 0);
  $$("[data-scoreboard]").forEach(box => {
    const limit = parseInt(box.dataset.scoreboard, 10) || SOL.length;
    box.innerHTML = SOL.slice(0, limit).map(o => {
      const t = total(o.s);
      return `<div class="score-row${o.us ? " us open" : ""}" tabindex="0" data-score="${t}">
        <div><h4>${o.n}</h4><small>${o.d}</small></div>
        <div class="score-bar"><i></i></div>
        <div class="score-val">${t.toFixed(1).replace(".", ",")}<small>/10</small></div>
        <div class="score-detail">${CRIT.map(([c], i) => `<div class="crit"><span>${c}</span><b>${o.s[i]}/10</b></div>`).join("")}</div>
      </div>`;
    }).join("");
    $$(".score-row", box).forEach(r => {
      const tog = () => r.classList.toggle("open");
      r.addEventListener("click", tog); r.addEventListener("keydown", e => { if (e.key === "Enter") tog(); });
    });
    const o2 = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; o2.disconnect();
      $$(".score-row", box).forEach((r, i) => setTimeout(() => $("i", r).style.width = (parseFloat(r.dataset.score) * 10) + "%", i * 140));
    }), { threshold: .25 });
    o2.observe(box);
  });
  $$("[data-weights]").forEach(el => el.innerHTML = CRIT.map(([c, w]) => `<span>${c} · ${w} %</span>`).join(""));

  /* Récit technologique au scroll */
  const chs = $$(".chapter");
  if (chs.length) {
    const o3 = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      chs.forEach(c => c.classList.toggle("on", c === e.target));
      const ph = e.target.dataset.phase; if (ph != null) { const b = $(`.steps-tech button[data-phase="${ph}"]`); if (b) b.click(); }
    }), { rootMargin: "-45% 0px -45% 0px" });
    chs.forEach(c => o3.observe(c));
  }

  /* Prix de la formule tout-en-un */
  $$("[data-cfg-plan]").forEach(el => { const v = (C.toutEnUn || {})[el.dataset.cfgPlan]; if (v != null) el.textContent = v; });
})();

/* ===== v8 : graphiques du comparatif ===== */
(function () {
  const $ = s => document.querySelector(s);
  const C = window.AQUALAND || {}, S = C.simulateur || {};
  const CRIT = ["Efficacité", "Coût 10 ans", "Fiabilité", "Simplicité", "Encombrement", "Liberté"];
  const SOL = {
    aq: { n: "Aqualand", s: [10, 9, 9, 9, 9, 10] },
    el: { n: "Adoucisseur électronique", s: [10, 6, 6, 7, 6, 6], why: ["Même efficacité : il retire le calcaire.", "Plus cher : appareil, contrat et électricité.", "Carte électronique et programmateur peuvent tomber en panne.", "Réglages et horloge à reprogrammer.", "Souvent plus volumineux.", "Contrat d'entretien souvent exigé pour la garantie."] },
    lo: { n: "Location tout compris", s: [10, 3, 7, 9, 6, 2], why: ["Même efficacité : c'est un adoucisseur.", "Le loyer cumulé dépasse largement l'achat.", "Entretenu par le loueur.", "Tout est géré pour vous.", "Appareil classique, souvent volumineux.", "Engagement de plusieurs années, pénalités de sortie."] },
    co: { n: "Traitement CO2", s: [5, 7, 8, 7, 7, 8], why: ["Stabilise le calcaire sans l'enlever.", "Bouteilles à racheter chaque année.", "Peu de pièces mobiles.", "Bouteilles à changer.", "Encombrement moyen.", "Peu d'engagement."] },
    ma: { n: "Anticalcaire magnétique", s: [1, 9, 8, 10, 10, 10], why: ["Efficacité non démontrée.", "Bon marché.", "Peu de pièces.", "Rien à faire.", "Très petit.", "Aucun engagement."] }
  };
  const AQWHY = ["Retire réellement le calcaire.", "Prix fixe, sel sobre, 0 € d'électricité.", "100 % hydraulique : rien d'électronique.", "Le sel arrive tout seul.", "48 × 54 × 24 cm.", "Abonnement sel sans engagement."];
  const radar = $("#radar");
  if (radar) {
    const cx = 220, cy = 200, R = 150, N = CRIT.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * R * v / 10, cy + Math.sin(a) * R * v / 10]; };
    const poly = s => s.map((v, i) => pt(i, v).join(",")).join(" ");
    let grid = "";
    [2, 4, 6, 8, 10].forEach(l => grid += `<polygon points="${poly(Array(N).fill(l))}" fill="none" stroke="#e3e5ee"/>`);
    CRIT.forEach((c, i) => { const [x, y] = pt(i, 10), [lx, ly] = pt(i, 11.9); grid += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e3e5ee"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#4a4f66">${c}</text>`; });
    radar.innerHTML = grid + `<polygon id="rThem" points="${poly(Array(N).fill(0))}" fill="rgba(138,143,166,.25)" stroke="#8a8fa6" stroke-width="2"/><polygon id="rUs" points="${poly(Array(N).fill(0))}" fill="rgba(44,62,158,.18)" stroke="#2c3e9e" stroke-width="2.5"/>`;
    const pick = $("#radarPick");
    pick.innerHTML = Object.entries(SOL).filter(([k]) => k !== "aq").map(([k, o], i) => `<button data-k="${k}" class="${i ? "" : "active"}">${o.n}</button>`).join("");
    const anim = (el, from, to) => { const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.setAttribute("points", poly(from.map((v, i) => v + (to[i] - v) * e))); if (k < 1) requestAnimationFrame(f); })(t0); };
    let cur = Array(N).fill(0);
    function show(k) {
      const o = SOL[k];
      anim($("#rThem"), cur, o.s); cur = o.s.slice();
      $("#radarName").textContent = o.n;
      pick.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.k === k));
      $("#radarWhy").innerHTML = CRIT.map((c, i) => `<div class="why-row"><b>${c}</b><span class="sc us">${SOL.aq.s[i]}</span><span class="sc">${o.s[i]}</span><p><strong>Aqualand :</strong> ${AQWHY[i]}<br><strong>${o.n} :</strong> ${o.why[i]}</p></div>`).join("");
    }
    pick.addEventListener("click", e => { const b = e.target.closest("button"); if (b) show(b.dataset.k); });
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); anim($("#rUs"), Array(N).fill(0), SOL.aq.s); show("el"); } }, { threshold: .3 });
    io.observe(radar);
  }

  /* Courbes de coût cumulé */
  const cc = $("#costChart");
  if (cc) {
    const pers = 4, hard = 32, salt = Math.max(0, pers * 45 * (hard - 10) * 0.02) * (S.prixSelKg || 0.75);
    const inst = (C.prixIndicatifInstallation || 1479) * (1 - (C.reduction || 0));
    const L = [
      { n: "Aqualand", c: "#2c3e9e", w: 3.5, y0: inst, a: salt + (S.entretienAnAqualand || 60), below: true },
      { n: "Électronique", c: "#8a8fa6", w: 2, y0: S.electroniqueAppareilPose, a: salt + S.electroniqueEntretienAn + S.electroniqueElecAn },
      { n: "Location", c: "#c2554f", w: 2, y0: 0, a: S.locationMois * 12 },
      { n: "CO2*", c: "#c9a227", w: 2, y0: S.co2AppareilPose, a: S.co2An }
    ];
    const yr = n => L.map(l => l.y0 + l.a * (n - 1));
    const max = Math.ceil(Math.max(...L.map(l => l.y0 + l.a * 10)) / 1000) * 1000;
    const X = n => 70 + (n - 1) * (800 / 9), Y = v => 370 - v / max * 330;
    let g = "";
    for (let v = 0; v <= max; v += 1000) g += `<line x1="70" x2="870" y1="${Y(v)}" y2="${Y(v)}" stroke="#eceef4"/><text x="60" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#8a8fa6">${(v / 1000)}k €</text>`;
    for (let n = 1; n <= 10; n++) g += `<text x="${X(n)}" y="395" text-anchor="middle" font-size="12" fill="#8a8fa6">An ${n}</text>`;
    L.forEach((l, i) => {
      const pts = Array.from({ length: 10 }, (_, k) => `${X(k + 1)},${Y(l.y0 + l.a * (k + 1))}`).join(" ");
      const last = l.y0 + l.a * 10;
      g += `<polyline class="cline" style="--d:${i * 0.15}s" points="${pts}" fill="none" stroke="${l.c}" stroke-width="${l.w}" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>`;
      g += `<circle cx="${X(10)}" cy="${Y(last)}" r="5" fill="${l.c}"/><text x="${X(10) - 10}" y="${Y(last) + (l.below ? 24 : -12)}" text-anchor="end" font-size="13" font-weight="700" fill="${l.c}">${Math.round(last).toLocaleString("fr-BE")} €</text>`;
    });
    cc.innerHTML = g;
    $("#costLegend").innerHTML = L.map(l => `<span class="lg" style="--c:${l.c}">${l.n}</span>`).join("") + '<small>*Le CO2 n\'adoucit pas l\'eau.</small>';
    const io2 = new IntersectionObserver(es => { if (es[0].isIntersecting) { io2.disconnect(); cc.classList.add("go"); } }, { threshold: .3 });
    io2.observe(cc);
  }

  /* Formulaires devis / rendez-vous */
  document.querySelectorAll("form[data-lead]").forEach(f => f.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = f.querySelector(".form-msg"), btn = f.querySelector("button[type=submit]");
    if (!f.checkValidity()) { f.reportValidity(); return; }
    btn.disabled = true; btn.textContent = "Envoi…";
    const fd = new FormData(f);
    fd.append("_subject", `Aqualand — ${f.dataset.lead} — ${fd.get("nom")} — ${fd.get("code_postal") || ""}`);
    fd.append("_template", "table"); fd.append("_captcha", "false");
    try {
      if (C.emailReception) await fetch("https://formsubmit.co/" + encodeURIComponent(C.emailReception), { method: "POST", body: fd, mode: "no-cors" });
      f.innerHTML = `<div class="form-ok"><h3>Merci, c'est envoyé.</h3><p>${f.dataset.lead === "Rendez-vous" ? "Nous vous rappelons pour confirmer le créneau." : "Vous recevez votre devis par e-mail très prochainement."}</p></div>`;
    } catch (_) { msg.textContent = "L'envoi a échoué. Réessayez ou appelez-nous."; btn.disabled = false; btn.textContent = "Envoyer"; }
  }));
  const tabs = document.querySelectorAll(".tabs button");
  function tab(k) { tabs.forEach(b => b.classList.toggle("active", b.dataset.tab === k)); document.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== k); }
  if (tabs.length) { tabs.forEach(b => b.addEventListener("click", () => { tab(b.dataset.tab); history.replaceState(null, "", "#" + b.dataset.tab); })); tab(location.hash === "#rdv" ? "rdv" : "devis"); addEventListener("hashchange", () => tab(location.hash === "#rdv" ? "rdv" : "devis")); }
})();
