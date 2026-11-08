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
    { n: "Aqualand", d: "Adoucisseur hydraulique + abonnement", us: true, s: [10, 9, 9, 9, 9, 10] },
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
