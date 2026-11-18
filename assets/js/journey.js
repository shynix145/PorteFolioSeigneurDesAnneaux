/* ==========================================================
   VOYAGE : le défilement de la page déplace la caméra sur la carte.
   Chaque <section data-stop="i"> correspond à une étape.
   ========================================================== */
(function () {
  const { el } = window.MiddleMap;
  const svg = document.getElementById('map');
  const sections = [...document.querySelectorAll('.stage[data-stop]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Étapes ---------- */
  const STOPS = [
    { name: 'La Comté',            short: 'Présentation', lx: 0,   ly: 42 },
    { name: 'Fondcombe',           short: 'Compétences',  lx: -14, ly: -20 },
    { name: 'La Moria',            short: 'Approfondir',  lx: -62, ly: 6 },
    { name: 'Edoras',              short: 'Parcours',     lx: -50, ly: 6 },
    { name: 'Minas Tirith',        short: 'Projets',      lx: -20, ly: 32 },
    { name: 'Montagne du Destin',  short: 'Contact',      lx: 0,   ly: 40 },
  ];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  // Tracé du voyage (les étapes sont aux index STOP_IDX)
  const ROUTE = [
    [260, 420], [340, 405], [430, 400], [520, 395], [640, 380], [655, 480], [700, 600],
    [790, 640], [820, 740], [820, 890], [950, 905], [1065, 935], [1175, 905], [1300, 870],
  ];
  const STOP_IDX = [0, 4, 6, 9, 11, 13];

  // Courbe lisse (Catmull-Rom → Bézier) passant par tous les points
  const smoothPath = (pts) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  const routeLayer = document.getElementById('route-layer');
  const D = smoothPath(ROUTE);
  el('path', { d: D, class: 'route-shadow' }, routeLayer);
  const route = el('path', { d: D, class: 'route-base' }, routeLayer);
  el('path', { d: D, class: 'route-done', mask: 'url(#routeMask)' }, routeLayer);
  const maskPath = document.getElementById('route-mask-path');
  maskPath.setAttribute('d', D);
  const TOTAL = route.getTotalLength();
  maskPath.setAttribute('stroke-dasharray', `${TOTAL} ${TOTAL}`);

  // Longueur du tracé à chaque étape (recherche du point le plus proche)
  const lens = STOP_IDX.map((idx) => {
    const [tx, ty] = ROUTE[idx];
    let best = 0, bestD = Infinity;
    for (let L = 0; L <= TOTAL; L += 2) {
      const p = route.getPointAtLength(L);
      const dd = (p.x - tx) ** 2 + (p.y - ty) ** 2;
      if (dd < bestD) { bestD = dd; best = L; }
    }
    return best;
  });

  /* ---------- Points d'étape sur la carte ---------- */
  const wpLayer = document.getElementById('wp-layer');
  const wps = STOPS.map((s, i) => {
    const [x, y] = ROUTE[STOP_IDX[i]];
    const g = el('g', {
      class: 'wp', transform: `translate(${x} ${y})`, tabindex: '0', role: 'button',
      'aria-label': `Aller à l'étape ${ROMAN[i]} : ${s.name}, ${s.short}`,
    }, wpLayer);
    el('circle', { r: 13, class: 'wp-halo' }, g);
    el('circle', { r: 9, class: 'wp-outer' }, g);
    el('circle', { r: 3.6, class: 'wp-inner' }, g);
    const t = el('text', { x: s.lx, y: s.ly, 'text-anchor': 'middle', class: 'wp-label' }, g);
    t.textContent = s.name;
    const t2 = el('text', { x: s.lx, y: s.ly + 15, 'text-anchor': 'middle', class: 'wp-sub' }, g);
    t2.textContent = `${ROMAN[i]} · ${s.short}`;
    const go = () => { setOverview(false); goTo(i); };
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    return g;
  });

  /* ---------- Marqueur (l'Anneau) ---------- */
  const markerLayer = document.getElementById('marker-layer');
  const marker = el('g', { class: 'marker' }, markerLayer);
  el('circle', { r: 26, fill: 'url(#ringGlow)', class: 'ring-glow' }, marker);
  el('circle', { r: 8.5, class: 'ring' }, marker);
  el('circle', { r: 8.5, class: 'ring-shine' }, marker);

  /* ---------- Itinéraire (navigation) ---------- */
  const list = document.getElementById('itinerary-list');
  list.innerHTML = STOPS.map((s, i) => `
    <li><button type="button" data-goto="${i}" aria-label="Étape ${ROMAN[i]} : ${s.name}, ${s.short}">
      <span class="it-dot" aria-hidden="true"></span>
      <span class="it-text"><span class="it-num">${ROMAN[i]}</span> ${s.short}</span>
    </button></li>`).join('');
  const navItems = [...list.querySelectorAll('li')];

  const stepNum = document.getElementById('step-num');
  const stepPlace = document.getElementById('step-place');

  /* ---------- Mesures & défilement ---------- */
  let vw = 0, vh = 0, tops = [];
  const measure = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (f) => f * f * (3 - 2 * f);

  // Progression "t" sur le voyage (0 = Comté, 5 = Montagne du Destin).
  // Chaque section : d'abord une pause sur le lieu (HOLD), puis le trajet vers le suivant.
  const HOLD = 0.32;
  const targetT = () => {
    const y = window.scrollY;
    const n = sections.length;
    for (let i = n - 1; i >= 0; i--) {
      if (y < tops[i] && i > 0) continue;
      if (i === n - 1) return i;
      const H = tops[i + 1] - tops[i];
      const start = tops[i] + H * HOLD;
      return i + ease(clamp((y - start) / (H * (1 - HOLD)), 0, 1));
    }
    return 0;
  };

  function goTo(i) {
    window.scrollTo({ top: tops[i] ?? 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------- Panneaux : visibles seulement à l'arrêt sur un lieu ---------- */
  const cards = sections.map((s) => s.querySelector('.card'));
  const cue = document.getElementById('scroll-cue');
  const cueText = document.getElementById('scroll-cue-text');
  let shownIdx = null;
  const updateCards = () => {
    const near = Math.round(cur);
    const shown = !ovTarget && Math.abs(cur - near) < 0.04 ? near : -1;
    if (shown === shownIdx) return;
    shownIdx = shown;
    cards.forEach((c, i) => {
      const on = i === shown;
      c.classList.toggle('is-visible', on);
      c.toggleAttribute('inert', !on);
      c.setAttribute('aria-hidden', String(!on));
      if (on) c.scrollTop = 0;
    });
    const hasNext = shown !== -1 && shown < STOPS.length - 1;
    cue.classList.toggle('is-visible', hasNext);
    if (hasNext) {
      cue.dataset.goto = String(shown + 1);
      cueText.textContent = shown === 0 ? 'Prendre la route' : `Vers ${STOPS[shown + 1].name}`;
    }
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    setOverview(false);
    goTo(Number(a.dataset.goto));
  });

  /* ---------- Caméra ---------- */
  const isWide = () => vw >= 900;
  const baseZoom = () => (isWide() ? Math.max(vw / 820, vh / 620) : vh / 900);

  const journeyCam = (t) => {
    const n = STOPS.length;
    const i = Math.min(Math.floor(t), n - 2);
    const f = t - i;
    const L = lens[i] + (lens[i + 1] - lens[i]) * f;
    const p = route.getPointAtLength(L);
    const z = baseZoom() * (1 - 0.3 * Math.sin(Math.PI * f)); // on dézoome pendant le trajet
    const cx = isWide() ? p.x - (vw * 0.2) / z : p.x;
    const cy = isWide() ? p.y : p.y + (vh * 0.22) / z;
    return { cx, cy, z, L, p };
  };
  const overviewCam = () => ({ cx: 820, cy: 600, z: Math.min(vw / 1650, vh / 1250) });

  /* ---------- Vue d'ensemble ---------- */
  const overviewBtn = document.getElementById('overview-btn');
  let ovTarget = 0;
  function setOverview(on) {
    ovTarget = on ? 1 : 0;
    document.body.classList.toggle('is-overview', on);
    overviewBtn.setAttribute('aria-pressed', String(on));
    overviewBtn.querySelector('span').textContent = on ? 'Reprendre le voyage' : 'Voir la carte';
    kick();
  }
  overviewBtn.addEventListener('click', () => setOverview(!ovTarget));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ovTarget) setOverview(false); });

  /* ---------- Boucle d'animation ---------- */
  let cur = 0, ov = 0, active = -1, running = false;
  const lerp = (a, b, k) => a + (b - a) * k;

  const draw = () => {
    const J = journeyCam(cur);
    const O = overviewCam();
    const k = ease(ov);
    const z = Math.exp(lerp(Math.log(J.z), Math.log(O.z), k));
    const cx = lerp(J.cx, O.cx, k);
    const cy = lerp(J.cy, O.cy, k);
    const w = vw / z, h = vh / z;
    svg.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);

    marker.setAttribute('transform', `translate(${J.p.x} ${J.p.y})`);
    maskPath.setAttribute('stroke-dashoffset', String(TOTAL - J.L));

    wps.forEach((g, i) => g.classList.toggle('is-reached', lens[i] <= J.L + 1));
    updateCards();

    const a = Math.round(cur);
    if (a !== active) {
      active = a;
      wps.forEach((g, i) => g.classList.toggle('is-active', i === a));
      navItems.forEach((li, i) => {
        li.classList.toggle('is-active', i === a);
        li.classList.toggle('is-done', i < a);
      });
      stepNum.textContent = `Étape ${ROMAN[a]} / ${ROMAN[STOPS.length - 1]}`;
      stepPlace.textContent = STOPS[a].name;
      document.body.dataset.stop = String(a);
      document.dispatchEvent(new CustomEvent('journey:stop', { detail: a })); // écouté par music.js
    }
  };

  const frame = () => {
    const tt = targetT();
    const k = reduceMotion ? 1 : 0.09;
    cur += (tt - cur) * k;
    ov += (ovTarget - ov) * (reduceMotion ? 1 : 0.08);
    const settled = Math.abs(tt - cur) < 0.0008 && Math.abs(ovTarget - ov) < 0.001;
    if (settled) { cur = tt; ov = ovTarget; }
    draw();
    if (settled) { running = false; return; }
    requestAnimationFrame(frame);
  };
  function kick() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  /* ---------- Formulaire de contact (ouvre la messagerie) ---------- */
  const form = document.getElementById('contact-form');
  const err = document.getElementById('form-error');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const msg = String(data.get('message') || '').trim();
    if (!name || !msg || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = 'Merci de remplir les trois champs avec un email valide.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    const subject = encodeURIComponent(`Proposition de stage · ${name}`);
    const body = encodeURIComponent(`${msg}\n\n${name} · ${email}`);
    window.location.href = `mailto:leonin.charron28@gmail.com?subject=${subject}&body=${body}`;
  });

  /* ---------- Démarrage ---------- */
  measure();
  cur = targetT();
  draw();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); active = -1; kick(); });
  window.addEventListener('load', () => { measure(); kick(); });
  if (document.fonts) document.fonts.ready.then(() => { measure(); kick(); });
})();
