/* ==========================================================
   PROJETS : pour en ajouter un, copie un objet dans la liste.
   - url : lien vers le projet (laisse '' s'il n'est pas en ligne)
   - code : lien GitHub (optionnel)
   - image : capture d'écran (optionnel, ex. 'assets/img/festival.webp')
   - color : couleur du bandeau
   ========================================================== */
const PROJECTS = [
  {
    title: 'Festival Résonance',
    type: 'Site vitrine',
    year: 2026,
    description: "Site d'un festival de musique : intégration responsive et feuilles de style Sass organisées selon l'architecture SMACSS.",
    techs: ['HTML', 'Sass', 'SMACSS'],
    url: '',
    code: '',
    image: '',
    color: '#8b2a1e',
  },
  {
    title: 'Bloom & Co',
    type: 'Page produit e-commerce',
    year: 2026,
    description: "Fiche produit d'une boutique de plantes, intégrée au pixel près depuis la maquette, avec une attention portée à la typographie.",
    techs: ['HTML', 'Sass'],
    url: '',
    code: '',
    image: '',
    color: '#3f6b3a',
  },
  {
    title: 'Médiathèque',
    type: 'Catalogue en ligne',
    year: 2026,
    description: "Catalogue d'une médiathèque : grille de documents, filtres et mise en page adaptée à tous les écrans.",
    techs: ['HTML', 'CSS'],
    url: '',
    code: '',
    image: '',
    color: '#2e5a7a',
  },
  {
    title: 'Dodge la Cathédrale',
    type: 'Jeu navigateur',
    year: 2026,
    description: "Jeu d'esquive jouable dans le navigateur : boucle de jeu, collisions, score et difficulté progressive.",
    techs: ['JavaScript', 'HTML', 'CSS'],
    url: '',
    code: '',
    image: '',
    color: '#6b4a8a',
  },
  {
    title: 'Moniteur de stock',
    type: 'Outil Python',
    year: 2026,
    description: "Script qui surveille des pages produits et envoie une alerte Discord (webhook) dès qu'un article repasse en stock ou en précommande.",
    techs: ['Python', 'Webhooks', 'Discord'],
    url: '',
    code: '',
    image: '',
    color: '#a8792a',
  },
  {
    title: "L'intuition de Manon",
    type: 'Site client',
    year: 2026,
    description: "Site vitrine réalisé pour une cliente : mise en ligne, référencement de base et prise en main de l'administration.",
    techs: ['WordPress', 'SEO'],
    url: '',
    code: '',
    image: '',
    color: '#4a4a4a',
  },
];

(function () {
  const root = document.getElementById('projects');
  if (!root) return;

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  root.innerHTML = PROJECTS.map((p, i) => {
    const links = [
      p.url ? `<a class="p-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Voir le projet →</a>` : '',
      p.code ? `<a class="p-link" href="${esc(p.code)}" target="_blank" rel="noopener noreferrer">Code</a>` : '',
    ].join('');
    return `
      <article class="project" style="--p-color: ${esc(p.color)}">
        ${p.image ? `<img class="p-img" src="${esc(p.image)}" alt="Aperçu du projet ${esc(p.title)}" loading="lazy">` : ''}
        <header class="p-head">
          <span class="p-num">${ROMAN[i] || i + 1}</span>
          <div>
            <h3>${esc(p.title)}</h3>
            <p class="p-meta">${esc(p.type)} · ${esc(p.year)}</p>
          </div>
        </header>
        <p class="p-desc">${esc(p.description)}</p>
        <ul class="p-techs">${p.techs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${links ? `<div class="p-links">${links}</div>` : ''}
      </article>`;
  }).join('');
})();
