/* ==========================================================
   CARTE : dessinée entièrement en SVG (aucune image externe).
   Coordonnées du "monde" : 1600 x 1200.
   Les couches sont ajoutées dans l'ordre d'affichage.
   ========================================================== */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const world = document.getElementById('world');

  const el = (tag, attrs, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    (parent || world).appendChild(node);
    return node;
  };
  const layer = (name, id) => el('g', id ? { class: 'layer-' + name, id } : { class: 'layer-' + name });

  // Aléatoire "graine fixe" : la carte est identique à chaque chargement
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- Mer ---------- */
  const sea = layer('sea');
  el('rect', { x: -1500, y: -1500, width: 4600, height: 4200, fill: 'url(#seaGrad)' }, sea);
  const wave = (x, y) => el('path', { d: `M${x},${y} q7,-6 14,0 t14,0`, class: 'wave' }, sea);
  for (let i = 0; i < 90; i++) wave(-420 + rand() * 470, -150 + rand() * 1450);
  for (let i = 0; i < 60; i++) wave(150 + rand() * 1100, 1175 + rand() * 260);

  /* ---------- Terres ---------- */
  const LAND = 'M130,-300 L2000,-300 L2000,1600 L1200,1600 L1190,1160 C1110,1120 1010,1160 910,1120 '
    + 'C800,1080 660,1150 540,1110 C430,1080 330,1160 240,1110 C170,1050 120,970 150,870 '
    + 'C180,770 90,710 110,610 C125,530 70,480 100,420 C130,360 60,300 110,220 C150,150 100,60 130,-300 Z';
  const land = layer('land');
  el('path', { d: LAND, class: 'coast-halo' }, land);
  el('path', { d: LAND, class: 'land' }, land);
  el('path', { d: LAND, class: 'coast' }, land);

  // Teinte sombre du Mordor
  el('path', { d: 'M1195,770 L1560,755 C1610,840 1600,990 1560,1072 L1205,1075 C1190,980 1180,880 1195,770 Z', class: 'mordor-tint' }, land);

  /* ---------- Rivières ---------- */
  const rivers = layer('rivers');
  [
    'M760,-40 C790,120 830,300 840,450 S880,640 900,720 S1010,820 1060,870 S1130,980 1150,1140', // Anduin
    'M330,170 C360,300 340,420 360,520 S340,700 300,830',                                          // Brandevin
    'M840,850 C900,860 960,840 1010,830',                                                           // Entalluve
    'M690,780 C650,850 600,900 560,1000',                                                           // Isen
  ].forEach((d) => el('path', { d, class: 'river' }, rivers));

  /* ---------- Forêts ---------- */
  const forests = layer('forests');
  const forest = (cx, cy, rx, ry, n, kind) => {
    const trees = [];
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      trees.push([cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry]);
    }
    trees.sort((a, b) => a[1] - b[1]);
    trees.forEach(([x, y]) => {
      const s = 6 + rand() * 4;
      if (kind === 'pine') {
        el('path', { d: `M${x},${y - s * 1.9} L${x - s * 0.7},${y} L${x + s * 0.7},${y} Z`, class: 'tree pine' }, forests);
      } else {
        el('line', { x1: x, y1: y, x2: x, y2: y - s * 0.7, class: 'trunk' }, forests);
        el('circle', { cx: x, cy: y - s * 1.15, r: s * 0.68, class: 'tree ' + kind }, forests);
      }
    });
  };
  forest(1010, 320, 120, 170, 260, 'pine');   // Forêt Noire
  forest(310, 480, 34, 22, 26, 'leaf');       // Vieille Forêt
  forest(800, 640, 46, 34, 42, 'gold');       // Lothlórien
  forest(748, 805, 38, 26, 30, 'leaf');       // Fangorn
  forest(585, 345, 30, 18, 16, 'pine');       // Trollshaws

  /* ---------- Collines de la Comté ---------- */
  const hills = layer('hills');
  for (let i = 0; i < 16; i++) {
    const x = 200 + rand() * 110, y = 395 + rand() * 75;
    el('path', { d: `M${x - 11},${y} q11,-12 22,0`, class: 'hill' }, hills);
  }

  /* ---------- Montagnes ---------- */
  const mountains = layer('mountains');
  const mountain = (x, y, h, extra = '') => {
    const w = h * 0.95;
    const px = x + (rand() - 0.5) * h * 0.25;
    el('path', { d: `M${x - w},${y} L${px},${y - h} L${x + w},${y} Z`, class: 'mt ' + extra }, mountains);
    el('path', { d: `M${px},${y - h} L${x + w},${y} L${px + w * 0.12},${y} Z`, class: 'mt-shade' }, mountains);
    el('path', { d: `M${x - w},${y} L${px},${y - h} L${x + w},${y}`, class: 'mt-line' }, mountains);
    el('path', {
      d: `M${px - w * 0.3},${y - h * 0.55} l${w * 0.14},${h * 0.13} M${px - w * 0.5},${y - h * 0.28} l${w * 0.16},${h * 0.15}`,
      class: 'mt-hatch',
    }, mountains);
  };
  const peaks = [];
  const chain = (points, spacing, size) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(len / spacing));
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const j = (rand() - 0.5) * size * 1.1;
        peaks.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j, size * (0.65 + rand() * 0.6)]);
      }
    }
  };
  chain([[700, 60], [690, 250], [715, 450], [700, 620], [712, 750]], 17, 30); // Monts Brumeux
  chain([[630, 975], [760, 958], [900, 968], [1035, 975]], 17, 26);            // Montagnes Blanches
  chain([[1195, 775], [1185, 900], [1205, 1070]], 16, 24);                     // Ephel Dúath
  chain([[1205, 770], [1380, 762], [1560, 755]], 16, 24);                      // Ered Lithui
  chain([[620, 120], [560, 150]], 16, 18);                                     // contreforts
  peaks.push([1185, 160, 46]);                                                 // Montagne Solitaire
  peaks.sort((a, b) => a[1] - b[1]).forEach(([x, y, h]) => mountain(x, y, h));

  // Montagne du Destin
  el('circle', { cx: 1300, cy: 815, r: 70, fill: 'url(#doomGlow)', class: 'doom-glow' }, mountains);
  mountain(1300, 878, 62, 'doom');
  el('path', { d: 'M1296,818 q-6,-20 4,-34 q10,-12 2,-30', class: 'doom-smoke' }, mountains);

  /* ---------- Rose des vents ---------- */
  const compass = el('g', { class: 'compass', transform: 'translate(1470 175)' });
  el('circle', { r: 58, class: 'c-ring' }, compass);
  el('circle', { r: 50, class: 'c-ring thin' }, compass);
  el('path', { d: 'M0,-72 L9,-9 L72,0 L9,9 L0,72 L-9,9 L-72,0 L-9,-9 Z', class: 'c-star' }, compass);
  el('path', { d: 'M0,-72 L9,-9 L0,0 Z M72,0 L9,9 L0,0 Z M0,72 L-9,9 L0,0 Z M-72,0 L-9,-9 L0,0 Z', class: 'c-star-dark' }, compass);
  const n = el('text', { y: -80, class: 'c-n', 'text-anchor': 'middle' }, compass);
  n.textContent = 'N';

  /* ---------- Couches remplies par journey.js ---------- */
  layer('route', 'route-layer');
  const labels = layer('labels');
  layer('waypoints', 'wp-layer');
  layer('marker', 'marker-layer');

  /* ---------- Noms ---------- */
  const label = (x, y, text, cls, rot) => {
    const t = el('text', { x, y, class: 'lbl ' + cls, 'text-anchor': 'middle' }, labels);
    if (rot) t.setAttribute('transform', `rotate(${rot} ${x} ${y})`);
    t.textContent = text;
  };
  label(420, 590, 'ERIADOR', 'lbl-region');
  label(1020, 560, 'RHOVANION', 'lbl-region');
  label(930, 805, 'ROHAN', 'lbl-region');
  label(830, 1070, 'GONDOR', 'lbl-region');
  label(1410, 960, 'MORDOR', 'lbl-region lbl-mordor');
  label(40, 700, 'Belegaer', 'lbl-sea', -90);
  label(760, 280, 'Monts Brumeux', 'lbl-feature', 84);
  label(820, 1010, 'Montagnes Blanches', 'lbl-feature');
  label(1010, 120, 'Forêt Noire', 'lbl-feature');
  label(870, 600, 'Anduin', 'lbl-river', 64);
  label(1185, 200, 'Erebor', 'lbl-place');
  label(800, 690, 'Lothlórien', 'lbl-place');
  label(748, 845, 'Fangorn', 'lbl-place');
  label(310, 515, 'Vieille Forêt', 'lbl-place');
  label(430, 425, 'Bree', 'lbl-place');
  label(520, 425, 'Mont Venteux', 'lbl-place');
  label(150, 405, 'Havres Gris', 'lbl-place');
  label(675, 770, 'Isengard', 'lbl-place');

  // Petits repères (villes secondaires)
  [[430, 403], [520, 398], [150, 420], [690, 790]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 3.2, class: 'town' }, labels));

  // Expose quelques utilitaires pour journey.js
  window.MiddleMap = { el, NS };
})();
