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

  // Qui est derrière Aqualand (une vraie personne rassure énormément)
  fondateur: {
    prenom: "Laurent",
    photo: "",            // ex. "laurent.jpg" (mettez la photo dans le dépôt). Vide = initiale.
    texte: "Je suis Laurent, et j'ai créé Aqualand parce qu'acheter un adoucisseur ne devrait pas ressembler à une négociation. Ici, vous voyez le prix avant de nous contacter, vous parlez à une personne qui répond, et vous n'êtes lié par aucun contrat. Si votre eau ne nécessite pas d'adoucisseur, je vous le dirai.",
    telephone: "",        // ex. "+32470123456" — vide = bouton masqué
    whatsapp: ""          // ex. "32470123456" (sans +) — vide = bouton masqué
  },

  // Délai de pose affiché (promettez seulement ce que vous pouvez tenir)
  delaiPose: "sous 7 jours",
  delaiPoseCourt: "≤ 7 jours",

  // Vos engagements (modifiez / supprimez librement)
  engagements: [
    ["i-euro", "Prix fixe et écrit", "Le prix de l'offre est celui que vous payez. Aucun supplément le jour de la pose sans votre accord écrit."],
    ["i-clock", "Pose rapide", "Vous choisissez la date. Pose standard en environ 2 heures, chantier laissé propre."],
    ["i-shield", "Garantie fabricant", "Appareil couvert par la garantie du fabricant. Les conditions exactes figurent dans votre offre."],
    ["i-hand", "Aucun engagement", "Diagnostic et offre gratuits. Abonnements mensuels, résiliables en un clic."],
    ["i-drop", "Conseil honnête", "Eau peu calcaire ? Nous vous dirons qu'un adoucisseur n'est pas nécessaire."],
    ["i-flag", "Un interlocuteur", "Une personne joignable, en Belgique, qui connaît votre installation."]
  ],

  // Avis clients RÉELS uniquement (ex. copiés de votre fiche Google). Vide = section masquée.
  // Format : { nom: "Marie D.", ville: "Wavre", note: 5, texte: "..." }
  avis: [],

  // Promotion diagnostic
  reduction: 0.15,

  // Prix indicatif d'une installation standard (appareil + pose, TVAC 6 %)
  // Utilisé uniquement pour le simulateur sur 10 ans.
  prixIndicatifInstallation: 1479,

  // Formule "Tout-en-un" (0 € à l'installation) — nécessite un partenaire de financement
  toutEnUn: { mensualite: "44 €", duree: "60 mois" },

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
