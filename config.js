/* =========================================================
   AQUALAND — RÉGLAGES DU SITE (à modifier ici uniquement)
   ========================================================= */
window.AQUALAND = {
  // Où arrivent les diagnostics (avec les photos).
  // Mettez votre adresse e-mail : les demandes sont envoyées via FormSubmit.co
  // (la 1re demande déclenche un e-mail de confirmation à valider une seule fois).
  // Laissez vide "" pour désactiver l'envoi (mode test).
  emailReception: "laurent.degeest@gmail.com",

  // Coordonnées affichées en bas de page
  contact: {
    email: "info@aqualand.be",
    phone: "+32 ... .. .. ..",
    zone: "Zone desservie : à compléter",
    legal: "© Aqualand — N° d'entreprise : à compléter — Mentions légales et politique de confidentialité : à compléter"
  },

  // Promotion diagnostic
  reduction: 0.15,

  // Prix indicatif d'une installation standard (appareil + pose, TVAC 6 %)
  // Utilisé uniquement pour le simulateur sur 10 ans.
  prixIndicatifInstallation: 1479,

  // Abonnements (affichés sur la page)
  prixAbonnements: { sel: "12,90 €", serenite: "19,90 €" },

  // Hypothèses du simulateur 10 ans
  simulateur: {
    prixSelKg: 0.75,            // € par kg de sel (pastilles)
    entretienAnAqualand: 60,    // € par an (entretien tous les 2 ans ~120 €)
    electroniqueAppareilPose: 2300,
    electroniqueEntretienAn: 150,
    electroniqueElecAn: 15,
    locationMois: 59,
    co2AppareilPose: 2000,
    co2An: 50
  }
};
