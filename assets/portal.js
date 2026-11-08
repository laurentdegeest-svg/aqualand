/* Aqualand — espace client & administration (Supabase) */
(function () {
  "use strict";
  const C = window.AQUALAND || {}, S = C.supabase || {};
  const sb = (S.url && S.anonKey && window.supabase) ? window.supabase.createClient(S.url, S.anonKey) : null;
  window.AQUA_SB = sb;
  const PORTAL = new URL("espace-client.html", location.href).href.split("#")[0].split("?")[0];
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const date = d => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const eur = n => n == null ? "" : Number(n).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
  const STEPS = [["recu", "Diagnostic reçu"], ["etude", "Étude par un expert"], ["devis_pret", "Devis disponible"], ["accepte", "Devis accepté"]];
  const LABEL = { recu: "Diagnostic reçu", etude: "En cours d'étude", devis_pret: "Devis disponible", accepte: "Devis accepté", refuse: "Clôturé" };

  /* ---------- Enregistrement d'un diagnostic (appelé par le formulaire) ---------- */
  window.AQUA_SAVE_DIAG = async function (fd) {
    if (!sb) return { skipped: true };
    const id = (crypto.randomUUID && crypto.randomUUID()) || ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const photos = [];
    for (const k of ["photo_compteur", "photo_emplacement"]) {
      const f = fd.get(k);
      if (f && f.size) {
        const p = `${id}/${k}.jpg`;
        const { error } = await sb.storage.from("photos").upload(p, f, { contentType: f.type || "image/jpeg", upsert: false });
        if (!error) photos.push(p);
      }
    }
    const g = k => (fd.get(k) || "").toString() || null;
    const row = { id, email, nom: g("nom"), telephone: g("telephone"), code_postal: g("code_postal"), durete: g("durete_estimee"),
      personnes: g("personnes"), logement: g("logement"), plus_10_ans: g("plus_10_ans"), constats: g("constats"), equipement: g("equipement"),
      emplacement: g("emplacement"), evacuation: g("evacuation"), remarque: g("remarque"), photos };
    const { error } = await sb.from("diagnostics").insert(row);
    if (error) throw error;
    const { data } = await sb.auth.getSession();
    const logged = data && data.session && data.session.user && (data.session.user.email || "").toLowerCase() === email;
    if (!logged) await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: PORTAL, data: { nom: row.nom } } });
    return { id, logged };
  };

  /* Pré-remplir le diagnostic quand le client est connecté */
  if (sb) sb.auth.getSession().then(({ data }) => {
    const u = data && data.session && data.session.user; if (!u) return;
    const em = $("#email"), nm = $("#nom");
    if (em && !em.value) em.value = u.email || "";
    if (nm && !nm.value && u.user_metadata && u.user_metadata.nom) nm.value = u.user_metadata.nom;
    document.querySelectorAll("[data-portal-link]").forEach(a => a.textContent = "Mon espace");
  });

  /* ---------- Connexion (espace client et admin) ---------- */
  function loginView(box, title, sub) {
    box.innerHTML = `<div class="portal-login">
      <h2>${title}</h2><p class="muted">${sub}</p>
      <form id="loginForm"><div class="field"><label for="loginEmail">Votre adresse e-mail</label><input id="loginEmail" type="email" required autocomplete="email" placeholder="vous@exemple.be"></div>
      <button class="btn btn-glow btn-block" type="submit">Recevoir mon lien de connexion</button><p class="form-msg" id="loginMsg"></p></form>
      <p class="muted small">Pas encore de compte ? Il est créé automatiquement lors de votre premier diagnostic.</p></div>`;
    $("#loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("#loginEmail").value.trim(), m = $("#loginMsg");
      m.textContent = "Envoi…"; m.className = "form-msg";
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0].split("?")[0] } });
      if (error) { m.textContent = "Impossible d'envoyer le lien : " + error.message; return; }
      m.className = "form-msg ok"; m.textContent = "C'est envoyé. Ouvrez l'e-mail et cliquez sur le lien pour accéder à votre espace.";
    });
  }
  const notReady = box => box.innerHTML = `<div class="portal-login"><h2>Espace client</h2><p class="muted">L'espace client sera activé très prochainement. En attendant, faites votre diagnostic : nous vous répondons par e-mail.</p><button class="btn btn-glow" data-open-diag>Faire mon diagnostic</button></div>`;

  /* ---------- Espace client ---------- */
  const portal = $("#portal");
  if (portal) {
    if (!sb) { notReady(portal); return; }
    const render = async session => {
      if (!session) return loginView(portal, "Accédez à votre espace", "Suivez votre diagnostic, consultez votre devis et nos fiches. Nous vous envoyons un lien de connexion par e-mail, sans mot de passe.");
      const user = session.user;
      const { data: rows, error } = await sb.from("diagnostics").select("*").order("created_at", { ascending: false });
      const nom = (rows && rows[0] && rows[0].nom) || (user.user_metadata && user.user_metadata.nom) || "";
      portal.innerHTML = `
        <div class="portal-head"><div><span class="eyebrow">Espace client</span><h2>Bonjour${nom ? " " + esc(nom.split(" ")[0]) : ""}.</h2><p class="muted">${esc(user.email)}</p></div>
          <div class="portal-actions"><button class="btn btn-glow" data-open-diag>Demander un nouveau diagnostic</button><button class="btn btn-light" id="logout">Se déconnecter</button></div></div>
        <h3 class="portal-h">Vos demandes</h3>
        <div id="reqs">${error ? `<p class="form-msg">${esc(error.message)}</p>` : (rows.length ? rows.map(card).join("") : `<div class="empty">Aucune demande pour l'instant. <button class="btn btn-light" data-open-diag>Faire mon diagnostic</button></div>`)}</div>
        <h3 class="portal-h">Vos fiches et explications</h3>
        <div class="fiches">
          <a class="fiche" href="solution.html#gamme"><b>Fiche Compact</b><span>Caractéristiques, dimensions, pour qui</span></a>
          <a class="fiche" href="solution.html#gamme"><b>Fiche Duo</b><span>Eau douce en continu, grandes familles</span></a>
          <a class="fiche" href="solution.html"><b>Comment ça marche</b><span>Échange d'ions et commande hydraulique</span></a>
          <a class="fiche" href="guide.html"><b>Guide de l'eau dure</b><span>Dureté, réglage idéal, alternatives</span></a>
          <a class="fiche" href="guide.html#faq"><b>TVA à 6 %</b><span>Les conditions pour en bénéficier</span></a>
          <a class="fiche" href="tarifs.html"><b>Abonnement sel</b><span>Livraison automatique, sans engagement</span></a>
        </div>`;
      $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
      portal.querySelectorAll("[data-pdf]").forEach(b => b.addEventListener("click", async () => {
        const { data, error } = await sb.storage.from("devis").createSignedUrl(b.dataset.pdf, 3600);
        if (error) return alert("Le devis n'est pas accessible pour le moment.");
        window.open(data.signedUrl, "_blank");
      }));
      portal.querySelectorAll("[data-accept]").forEach(b => b.addEventListener("click", async () => {
        if (!confirm("Confirmer l'acceptation de ce devis ? Nous vous contacterons pour fixer la date de pose.")) return;
        const { error } = await sb.rpc("accepter_devis", { p_id: b.dataset.accept });
        if (error) return alert(error.message);
        render((await sb.auth.getSession()).data.session);
      }));
      document.querySelectorAll("[data-open-diag]").forEach(b => { if (!b._bound) { b._bound = 1; b.addEventListener("click", () => document.getElementById("dmDiag").click()); } });
    };
    function card(r) {
      const idx = Math.max(0, STEPS.findIndex(s => s[0] === r.statut));
      const steps = STEPS.map(([k, l], i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span></span>${l}</li>`).join("");
      const devis = r.statut === "devis_pret" || r.statut === "accepte" ? `
        <div class="quote"><div><small>Votre devis${r.modele ? " · " + esc(r.modele) : ""}</small><b>${eur(r.devis_montant)}</b>${r.devis_note ? `<p>${esc(r.devis_note)}</p>` : ""}</div>
        <div class="quote-actions">${r.devis_path ? `<button class="btn btn-light" data-pdf="${esc(r.devis_path)}">Voir le devis (PDF)</button>` : ""}
        ${r.statut === "devis_pret" ? `<button class="btn btn-glow" data-accept="${r.id}">Accepter le devis</button>` : `<span class="pill-ok">Accepté — nous vous contactons pour la pose</span>`}</div></div>`
        : `<p class="muted small">Un expert Aqualand étudie votre diagnostic et prépare votre devis personnalisé avec −15 %. Vous recevrez un e-mail dès qu'il sera disponible ici.</p>`;
      return `<article class="req">
        <div class="req-top"><div><b>Diagnostic du ${date(r.created_at)}</b><span class="muted">${esc(r.code_postal || "")} · ${esc(r.durete || "")}</span></div><span class="badge-st st-${r.statut}">${LABEL[r.statut] || r.statut}</span></div>
        <ol class="track">${steps}</ol>
        <details class="req-det"><summary>Voir mes réponses</summary><dl>
          <dt>Ménage</dt><dd>${esc(r.personnes)} pers. · ${esc(r.logement)}</dd><dt>Logement +10 ans</dt><dd>${esc(r.plus_10_ans)}</dd>
          <dt>Constats</dt><dd>${esc(r.constats)}</dd><dt>Équipement actuel</dt><dd>${esc(r.equipement)}</dd>
          <dt>Emplacement</dt><dd>${esc(r.emplacement)} · évacuation : ${esc(r.evacuation)}</dd><dt>Photos</dt><dd>${(r.photos || []).length} envoyée(s)</dd></dl></details>
        ${devis}</article>`;
    }
    sb.auth.getSession().then(({ data }) => render(data.session));
    sb.auth.onAuthStateChange((ev, session) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") render(session); });
  }

  /* ---------- Administration ---------- */
  const admin = $("#admin");
  if (admin) {
    if (!sb) { admin.innerHTML = `<div class="portal-login"><h2>Administration</h2><p class="muted">Renseignez l'URL et la clé Supabase dans config.js pour activer l'administration.</p></div>`; return; }
    const render = async session => {
      if (!session) return loginView(admin, "Administration Aqualand", "Connexion réservée à l'équipe Aqualand.");
      const { data: isAdm } = await sb.rpc("is_admin");
      if (!isAdm) { admin.innerHTML = `<div class="portal-login"><h2>Accès refusé</h2><p class="muted">${esc(session.user.email)} n'est pas administrateur.</p><button class="btn btn-light" id="lo">Se déconnecter</button></div>`; $("#lo").onclick = async () => { await sb.auth.signOut(); location.reload(); }; return; }
      const { data: rows, error } = await sb.from("diagnostics").select("*").order("created_at", { ascending: false });
      if (error) { admin.innerHTML = `<p class="form-msg">${esc(error.message)}</p>`; return; }
      const counts = rows.reduce((a, r) => (a[r.statut] = (a[r.statut] || 0) + 1, a), {});
      admin.innerHTML = `<div class="portal-head"><div><span class="eyebrow">Administration</span><h2>Demandes clients</h2><p class="muted">${rows.length} demande(s) · ${counts.recu || 0} à traiter · ${counts.devis_pret || 0} devis envoyés · ${counts.accepte || 0} acceptés</p></div><button class="btn btn-light" id="lo">Se déconnecter</button></div>
        <div class="adm-list">${rows.map(r => `<article class="req adm" data-id="${r.id}">
          <div class="req-top"><div><b>${esc(r.nom)} — ${esc(r.code_postal)}</b><span class="muted">${date(r.created_at)} · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a> · <a href="tel:${esc(r.telephone)}">${esc(r.telephone)}</a></span></div><span class="badge-st st-${r.statut}">${LABEL[r.statut]}</span></div>
          <dl><dt>Dureté</dt><dd>${esc(r.durete)}</dd><dt>Ménage</dt><dd>${esc(r.personnes)} · ${esc(r.logement)} · +10 ans : ${esc(r.plus_10_ans)}</dd><dt>Constats</dt><dd>${esc(r.constats)}</dd><dt>Équipement</dt><dd>${esc(r.equipement)}</dd><dt>Emplacement</dt><dd>${esc(r.emplacement)} · évac. ${esc(r.evacuation)}</dd><dt>Remarque</dt><dd>${esc(r.remarque || "—")}</dd></dl>
          <div class="adm-photos" data-photos='${esc(JSON.stringify(r.photos || []))}'></div>
          <form class="adm-form">
            <div class="grid3"><div class="field"><label>Statut</label><select name="statut">${Object.entries(LABEL).map(([k, l]) => `<option value="${k}"${k === r.statut ? " selected" : ""}>${l}</option>`).join("")}</select></div>
            <div class="field"><label>Modèle</label><input name="modele" value="${esc(r.modele || "")}" placeholder="Compact"></div>
            <div class="field"><label>Montant TVAC (€)</label><input name="devis_montant" type="number" step="0.01" value="${r.devis_montant ?? ""}"></div></div>
            <div class="field"><label>Message au client</label><textarea name="devis_note" rows="2">${esc(r.devis_note || "")}</textarea></div>
            <div class="field"><label>Devis PDF ${r.devis_path ? "(déjà déposé — remplacer)" : ""}</label><input name="pdf" type="file" accept="application/pdf"></div>
            <div class="adm-btns"><button class="btn btn-glow" type="submit">Enregistrer</button>
            <a class="btn btn-light" href="mailto:${esc(r.email)}?subject=${encodeURIComponent("Votre devis Aqualand est disponible")}&body=${encodeURIComponent(`Bonjour ${r.nom || ""},\n\nVotre devis personnalisé est disponible dans votre espace client :\n${PORTAL}\n\nConnectez-vous avec votre adresse e-mail, vous recevrez un lien de connexion.\n\nÀ bientôt,\nL'équipe Aqualand`)}">Prévenir le client par e-mail</a></div>
            <p class="form-msg"></p></form></article>`).join("") || "<p class='muted'>Aucune demande pour l'instant.</p>"}</div>`;
      $("#lo").onclick = async () => { await sb.auth.signOut(); location.reload(); };
      admin.querySelectorAll(".adm-photos").forEach(async box => {
        const list = JSON.parse(box.dataset.photos || "[]"); if (!list.length) return;
        const { data } = await sb.storage.from("photos").createSignedUrls(list, 3600);
        box.innerHTML = (data || []).map(x => x.signedUrl ? `<a href="${x.signedUrl}" target="_blank"><img src="${x.signedUrl}" alt="Photo client"></a>` : "").join("");
      });
      admin.querySelectorAll(".adm-form").forEach(f => f.addEventListener("submit", async e => {
        e.preventDefault();
        const art = f.closest("[data-id]"), id = art.dataset.id, msg = f.querySelector(".form-msg");
        msg.className = "form-msg"; msg.textContent = "Enregistrement…";
        const upd = { statut: f.statut.value, modele: f.modele.value || null, devis_note: f.devis_note.value || null,
          devis_montant: f.devis_montant.value ? Number(f.devis_montant.value) : null, updated_at: new Date().toISOString() };
        const file = f.pdf.files[0];
        if (file) {
          const path = `${id}/devis-${Date.now()}.pdf`;
          const { error } = await sb.storage.from("devis").upload(path, file, { contentType: "application/pdf" });
          if (error) { msg.textContent = "Erreur PDF : " + error.message; return; }
          upd.devis_path = path; if (upd.statut === "recu" || upd.statut === "etude") upd.statut = "devis_pret";
        }
        const { error } = await sb.from("diagnostics").update(upd).eq("id", id);
        if (error) { msg.textContent = "Erreur : " + error.message; return; }
        msg.className = "form-msg ok"; msg.textContent = "Enregistré. Pensez à prévenir le client.";
        f.statut.value = upd.statut;
      }));
    };
    sb.auth.getSession().then(({ data }) => render(data.session));
    sb.auth.onAuthStateChange((ev, session) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") render(session); });
  }
})();
