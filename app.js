(function () {
  "use strict";
  const C = window.AQUALAND || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const eur = n => Math.round(n).toLocaleString("fr-BE") + " €";

  /* ---------- Header + sticky CTA ---------- */
  const header = $("#header"), sticky = $("#stickyCta");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 40);
    if (sticky) sticky.classList.toggle("show", y > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    $$(".reveal").forEach(el => io.observe(el));
  } else $$(".reveal").forEach(el => el.classList.add("in"));

  /* ---------- Bubbles ---------- */
  const bub = $("#bubbles");
  if (bub) for (let i = 0; i < 14; i++) {
    const b = document.createElement("span");
    const s = 6 + Math.random() * 22;
    b.className = "bubble";
    b.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;bottom:-40px;animation-duration:${10 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s`;
    bub.appendChild(b);
  }

  /* ---------- Contact + prices ---------- */
  const ct = C.contact || {};
  $$("[data-contact]").forEach(el => {
    const k = el.dataset.contact, v = ct[k] || "";
    if (k === "email" && v) el.innerHTML = `<a href="mailto:${v}">${v}</a>`;
    else if (k === "phone" && v && !v.includes(".")) el.innerHTML = `<a href="tel:${v.replace(/\s/g, "")}">${v}</a>`;
    else el.textContent = v;
  });
  $$("[data-price]").forEach(el => el.textContent = (C.prixAbonnements || {})[el.dataset.price] || "");

  /* ---------- Technology animation ---------- */
  const resin = $("#resin"), tank = $("#saltTank"), cap = $("#techCaption");
  const beads = [];
  if (resin) {
    const NS = "http://www.w3.org/2000/svg";
    for (let r = 0; r < 9; r++) for (let c = 0; c < 5; c++) {
      const g = document.createElementNS(NS, "g");
      const cx = 165 + c * 23 + (r % 2 ? 11 : 0), cy = 58 + r * 23;
      if (cx > 262) continue;
      const bead = document.createElementNS(NS, "circle");
      bead.setAttribute("cx", cx); bead.setAttribute("cy", cy); bead.setAttribute("r", 9);
      bead.setAttribute("fill", "#9ff3ff"); bead.setAttribute("opacity", ".9");
      const ca = document.createElementNS(NS, "circle");
      ca.setAttribute("cx", cx + 4); ca.setAttribute("cy", cy - 4); ca.setAttribute("r", 4);
      ca.setAttribute("fill", "#ff9a6b"); ca.setAttribute("class", "ca"); ca.style.opacity = 0;
      g.appendChild(bead); g.appendChild(ca); resin.appendChild(g);
      beads.push({ bead, ca, row: r });
    }
  }
  const phases = [
    "L'eau dure traverse la résine. Les billes captent le calcaire (calcium et magnésium) : l'eau qui sort est douce.",
    "Quand la résine est saturée, l'appareil se régénère tout seul avec un peu d'eau salée. Le calcaire est rincé vers l'égout.",
    "La résine est comme neuve, prête pour un nouveau cycle. Tout est actionné par la pression de l'eau : aucune électricité."
  ];
  let phase = 0, fill = 0, timer;
  function setPhase(p) {
    phase = p;
    $$(".steps-tech button").forEach(b => b.classList.toggle("active", +b.dataset.phase === p));
    if (cap) cap.textContent = phases[p];
    if (tank) tank.style.opacity = p === 1 ? 1 : .35;
    if (p === 0) fill = 0;
    beads.forEach(b => { b.ca.style.opacity = p === 1 ? 1 : 0; b.bead.setAttribute("fill", p === 2 ? "#7ef0cf" : "#9ff3ff"); });
  }
  function tick() {
    if (phase === 0) {
      fill = Math.min(fill + 1, 9);
      beads.forEach(b => b.ca.style.opacity = b.row < fill ? 1 : 0);
      if (fill >= 9) setPhase(1);
    } else if (phase === 1) {
      beads.forEach(b => { if (Math.random() < .35) b.ca.style.opacity = 0; });
      if (beads.every(b => b.ca.style.opacity === "0")) setPhase(2);
    } else { setPhase(0); }
  }
  if (beads.length) {
    setPhase(0);
    timer = setInterval(tick, 900);
    $$(".steps-tech button").forEach(b => b.addEventListener("click", () => {
      clearInterval(timer); setPhase(+b.dataset.phase);
      if (+b.dataset.phase === 0) { fill = 0; }
      timer = setInterval(tick, 900);
    }));
  }

  /* ---------- Salt + cost model ---------- */
  const S = C.simulateur || {};
  const saltKg = (pers, hard) => Math.max(0, pers * 45 * Math.max(hard - 10, 0) * 0.02); // ≈ 45 m³/pers/an, ≈ 0,3 kg sel / 15 °f·m³
  function costs(pers, hard) {
    const salt = saltKg(pers, hard) * (S.prixSelKg || 0.75);
    const inst = (C.prixIndicatifInstallation || 1479) * (1 - (C.reduction || 0));
    return [
      { name: "Aqualand (hydraulique)", us: true, v: inst + 10 * (salt + (S.entretienAnAqualand || 60)) },
      { name: "Adoucisseur électronique", v: S.electroniqueAppareilPose + 10 * (salt + S.electroniqueEntretienAn + S.electroniqueElecAn) },
      { name: "Location tout compris", v: S.locationMois * 120 },
      { name: "Traitement CO2*", v: S.co2AppareilPose + 10 * S.co2An }
    ];
  }
  const rP = $("#rPers"), rH = $("#rHard");
  function renderEco() {
    if (!rP) return;
    const p = +rP.value, h = +rH.value;
    $("#oPers").textContent = p; $("#oHard").textContent = h + " °f";
    const kg = saltKg(p, h);
    $("#sSalt").textContent = Math.round(kg); $("#sBags").textContent = Math.ceil(kg / 4);
    const list = costs(p, h), max = Math.max(...list.map(x => x.v));
    $("#bars").innerHTML = list.map(x => `<div class="bar-row${x.us ? " us" : ""}"><div class="bar-top"><span>${x.name}</span><b>${eur(x.v)}</b></div><div class="bar-track"><div class="bar-fill" style="width:${(x.v / max * 100).toFixed(1)}%"></div></div></div>`).join("");
    const us = list[0].v, el = list[1].v, loc = list[2].v;
    $("#ecoSave").innerHTML = `<strong>Jusqu'à ${eur(Math.max(el - us, loc - us))} d'économie</strong>sur 10 ans par rapport à une location, et environ ${eur(el - us)} par rapport à un adoucisseur électronique classique.`;
    $("#ecoFine").textContent = `Estimation indicative sur 10 ans, TVAC. Hypothèses : installation Aqualand ${eur(C.prixIndicatifInstallation)} avant −${Math.round(C.reduction * 100)} %, sel à ${S.prixSelKg} €/kg, entretien ${S.entretienAnAqualand} €/an ; adoucisseur électronique ${eur(S.electroniqueAppareilPose)} posé + ${S.electroniqueEntretienAn} €/an d'entretien + ${S.electroniqueElecAn} €/an d'électricité ; location ${S.locationMois} €/mois. *Le CO2 ne retire pas le calcaire, il le stabilise. Votre offre personnalisée fait foi.`;
  }
  if (rP) { rP.addEventListener("input", renderEco); rH.addEventListener("input", renderEco); renderEco(); }

  /* ---------- Hardness by postal code (estimation régionale) ---------- */
  const ZONES = [
    [1000, 1299, "Bruxelles", 28, 35],
    [1300, 1499, "Brabant wallon", 30, 40],
    [1500, 1999, "Brabant flamand", 30, 40],
    [2000, 2999, "province d'Anvers", 15, 30],
    [3000, 3499, "Brabant flamand", 30, 40],
    [3500, 3999, "Limbourg", 15, 35],
    [4000, 4999, "province de Liège", 20, 35],
    [5000, 5999, "province de Namur", 25, 38],
    [6000, 6599, "Hainaut (Charleroi)", 25, 40],
    [6600, 6999, "province de Luxembourg", 10, 25],
    [7000, 7999, "Hainaut (Mons, Tournai)", 30, 45],
    [8000, 8999, "Flandre occidentale", 30, 45],
    [9000, 9999, "Flandre orientale", 25, 40]
  ];
  function hardness(cp) {
    const n = parseInt(cp, 10);
    const z = ZONES.find(z => n >= z[0] && n <= z[1]);
    if (!z) return null;
    const mid = Math.round((z[3] + z[4]) / 2);
    const lvl = mid < 15 ? ["douce", "#18a874"] : mid < 25 ? ["moyennement dure", "#c9a227"] : mid < 35 ? ["dure", "#ff7a45"] : ["très dure", "#e2554f"];
    return { region: z[2], min: z[3], max: z[4], mid, lvl };
  }

  /* ---------- Diagnostic wizard ---------- */
  const diag = $("#diag"), form = $("#diagForm");
  const steps = $$(".q-step", form), TOTAL = 6;
  const prev = $("#prevBtn"), next = $("#nextBtn"), prog = $("#prog");
  let cur = 1, scrollY = 0, lastHard = null;

  function openDiag() {
    scrollY = window.scrollY;
    document.body.classList.add("lock"); document.body.style.top = `-${scrollY}px`;
    diag.classList.add("open"); show(cur);
    setTimeout(() => { if (cur === 1 && window.innerWidth > 640) $("#cp").focus(); }, 250);
  }
  function closeDiag() {
    diag.classList.remove("open");
    document.body.classList.remove("lock"); document.body.style.top = "";
    window.scrollTo(0, scrollY);
  }
  $$("[data-open-diag]").forEach(b => b.addEventListener("click", openDiag));
  $("#diagClose").addEventListener("click", closeDiag);
  diag.addEventListener("click", e => { if (e.target === diag) closeDiag(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && diag.classList.contains("open")) closeDiag(); });

  function show(n) {
    cur = n;
    steps.forEach(s => s.classList.toggle("active", +s.dataset.step === n));
    prog.style.width = Math.min(100, ((n - 1) / TOTAL) * 100 + (n > TOTAL ? 0 : 6)) + "%";
    if (n > TOTAL) prog.style.width = "100%";
    prev.style.display = n === 1 || n > TOTAL ? "none" : "";
    next.textContent = n === TOTAL ? "Recevoir mon offre −15 %" : n > TOTAL ? "Fermer" : n === 5 ? "Continuer (photos facultatives)" : "Continuer";
    $(".diag-body").scrollTop = 0;
  }
  const val = name => { const el = form.querySelector(`[name="${name}"]:checked`); return el ? el.value : ""; };
  const err = (n, msg) => { const e = $(`[data-err="${n}"]`); if (e) e.textContent = msg || ""; return !msg; };

  // postal code live gauge
  const cpInput = $("#cp");
  cpInput.addEventListener("input", () => {
    cpInput.value = cpInput.value.replace(/\D/g, "").slice(0, 4);
    const g = $("#gauge");
    if (cpInput.value.length === 4) {
      const h = hardness(cpInput.value); lastHard = h;
      if (h) {
        g.classList.add("show");
        const m = h.mid, pos = m < 15 ? m / 15 * 25 : m < 25 ? 25 + (m - 15) / 10 * 25 : m < 35 ? 50 + (m - 25) / 10 * 25 : 75 + Math.min(m - 35, 10) / 10 * 25;
        $("#gaugeDot").style.left = Math.min(97, Math.max(3, pos)) + "%";
        $("#gaugeTxt").innerHTML = `Eau estimée <b style="color:${h.lvl[1]}">${h.lvl[0]}</b> : environ <b>${h.min}–${h.max} °f</b> en ${h.region}.<br><small style="color:var(--ink-3)">Estimation régionale, confirmée par une mesure lors de la pose.</small>`;
        err(1, "");
      } else { g.classList.remove("show"); err(1, "Code postal belge non reconnu."); }
    } else g.classList.remove("show");
  });
  cpInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); next.click(); } });

  function validate(n) {
    if (n === 1) return err(1, cpInput.value.length === 4 && hardness(cpInput.value) ? "" : "Entrez un code postal belge à 4 chiffres.");
    if (n === 2) return err(2, val("personnes") && val("logement") && val("plus_10_ans") ? "" : "Répondez aux 3 questions pour continuer.");
    if (n === 3) return err(3, val("equipement") ? "" : "Dites-nous si vous avez déjà un traitement.");
    if (n === 4) return err(4, val("emplacement") && val("evacuation") ? "" : "Choisissez l'emplacement et l'évacuation.");
    if (n === 5) return true;
    if (n === 6) {
      const nom = $("#nom").value.trim(), em = $("#email").value.trim(), tel = $("#tel").value.trim();
      if (!nom || !em || !tel) return err(6, "Merci de compléter nom, e-mail et téléphone.");
      if (!/^\S+@\S+\.\S+$/.test(em)) return err(6, "Adresse e-mail invalide.");
      if (tel.replace(/\D/g, "").length < 9) return err(6, "Numéro de téléphone invalide.");
      if (!$("#rgpd").checked) return err(6, "Merci d'accepter l'utilisation de vos données pour l'offre.");
      return err(6, "");
    }
    return true;
  }
  // auto-advance on single-choice steps feel
  form.addEventListener("change", e => { const s = e.target.closest(".q-step"); if (s) err(s.dataset.step, ""); });

  next.addEventListener("click", async () => {
    if (cur > TOTAL) return closeDiag();
    if (!validate(cur)) return;
    if (cur === TOTAL) return submit();
    show(cur + 1);
  });
  prev.addEventListener("click", () => cur > 1 && show(cur - 1));

  /* photos: preview + compression (iPhone friendly) */
  $$("[data-photo]").forEach(inp => inp.addEventListener("change", async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const slot = inp.closest(".photo-slot");
    try {
      const small = await compress(f, 1600, 0.82);
      if (window.DataTransfer) { const dt = new DataTransfer(); dt.items.add(small); inp.files = dt.files; }
      showPreview(slot, small);
    } catch (_) { showPreview(slot, f); }
  }));
  function showPreview(slot, file) {
    let img = slot.querySelector("img");
    if (!img) { img = document.createElement("img"); img.alt = "Aperçu"; slot.appendChild(img); }
    img.src = URL.createObjectURL(file); slot.classList.add("has");
  }
  function compress(file, maxSide, q) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => b ? res(new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })) : rej(), "image/jpeg", q);
      };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }

  function persNum() { return { "1-2": 2, "3-4": 4, "5-6": 6, "7+": 7 }[val("personnes")] || 4; }

  async function submit() {
    const original = next.innerHTML;
    next.disabled = true; next.innerHTML = '<span class="spinner"></span>';
    const h = lastHard || hardness(cpInput.value);
    const fd = new FormData(form);
    fd.delete("constats");
    fd.append("constats", $$('[name="constats"]:checked').map(x => x.value).join(", ") || "—");
    fd.append("durete_estimee", h ? `${h.min}-${h.max} °f (${h.region})` : "—");
    fd.append("_subject", `Diagnostic Aqualand −15 % — ${cpInput.value} — ${$("#nom").value}`);
    fd.append("_template", "table"); fd.append("_captcha", "false");
    try {
      if (C.emailReception) {
        await fetch("https://formsubmit.co/" + encodeURIComponent(C.emailReception), { method: "POST", body: fd, mode: "no-cors" });
      } else {
        console.info("[Aqualand] Mode test : aucun e-mail configuré dans config.js", Object.fromEntries(fd.entries()));
        await new Promise(r => setTimeout(r, 700));
      }
      renderResult(h);
      show(TOTAL + 1);
    } catch (e) {
      err(6, "L'envoi a échoué. Vérifiez votre connexion et réessayez.");
    } finally { next.disabled = false; next.innerHTML = original; if (cur > TOTAL) next.textContent = "Fermer"; }
  }

  function renderResult(h) {
    const p = persNum(), mid = h ? h.mid : 30;
    const duo = p >= 5 || mid >= 38;
    const kg = saltKg(p, mid);
    const tva = val("plus_10_ans") === "Oui";
    $("#resIntro").textContent = `Merci ${$("#nom").value.split(" ")[0]} ! Vous recevrez votre offre personnalisée avec −${Math.round(C.reduction * 100)} % par e-mail très prochainement.`;
    $("#reco").innerHTML = `
      <small style="color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Première recommandation</small>
      <h4>${duo ? "Aqualand Duo — eau douce en continu" : "Aqualand Compact — le plus économique"}</h4>
      <p style="color:var(--ink-2);font-size:15px">${duo
        ? "Avec votre ménage et votre eau, un modèle à double colonne assure de l'eau douce 24 h/24, même pendant la régénération."
        : "Pour votre ménage et votre eau, le modèle compact suffit : il prend peu de place et consomme très peu de sel."}</p>
      <div class="kpis">
        <div><b>${h ? h.min + "–" + h.max : "—"}</b><small>°f estimés</small></div>
        <div><b>≈ ${Math.round(kg)} kg</b><small>de sel / an</small></div>
        <div><b>${tva ? "6 %" : "21 %"}</b><small>TVA probable</small></div>
      </div>
      <ul>
        <li>Aucune électricité nécessaire</li>
        <li>Pose préparée grâce à vos réponses${$$("[data-photo]").some(i => i.files && i.files.length) ? " et vos photos" : ""}</li>
        <li>−${Math.round(C.reduction * 100)} % réservés sur votre installation</li>
      </ul>`;
  }
})();
