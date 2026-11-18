/* ==========================================================
   MUSIQUE GÉNÉRATIVE (Web Audio API, aucun fichier audio)
   - une nappe (accords tenus), une harpe (arpèges), une flûte
     (petites mélodies au hasard) et un tambour grave.
   - chaque étape du voyage a sa propre ambiance (MOODS).
   - coupée par défaut : les navigateurs interdisent le son
     sans action de l'utilisateur.
   ========================================================== */
(function () {
  const btn = document.getElementById('music-btn');
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!btn) return;
  if (!AC) { btn.hidden = true; return; }

  const KEY = 'portfolio-music';
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* stockage indisponible */ } },
  };

  /* ---------- Ambiances : une par étape ----------
     root  : note de base (MIDI, 60 = do central)
     chords: accords en demi-tons depuis root (un accord toutes les 2 mesures)
     scale : gamme utilisée par la flûte
     cutoff: brillance de la nappe (Hz)   pad : volume de la nappe
     harp / flute / drum : probabilité de jouer (0 à 1)                */
  const MOODS = [
    { // I. La Comté : ré majeur, chaleureux et léger
      root: 62, tempo: 92, chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]],
      scale: [0, 2, 4, 7, 9], cutoff: 1400, wave: 'triangle', pad: 0.22,
      harp: 0.75, harpOct: 0, flute: 0.7, drum: 0,
    },
    { // II. Fondcombe : mi lydien, aérien
      root: 64, tempo: 70, chords: [[0, 4, 7, 11], [2, 6, 9, 14], [-3, 0, 4, 7], [-1, 2, 6, 9]],
      scale: [0, 2, 4, 6, 7, 9, 11], cutoff: 2400, wave: 'triangle', pad: 0.2,
      harp: 0.85, harpOct: 12, flute: 0.5, drum: 0,
    },
    { // III. La Moria : la mineur, grave et sombre
      root: 45, tempo: 58, chords: [[0, 3, 7], [-4, 0, 3], [0, 3, 7], [-2, 1, 5]],
      scale: [0, 2, 3, 7, 8], cutoff: 520, wave: 'sawtooth', pad: 0.14,
      harp: 0.22, harpOct: 12, flute: 0, drum: 0.9,
    },
    { // IV. Le Rohan : ré dorien, plus rythmé
      root: 50, tempo: 100, chords: [[0, 3, 7], [-2, 2, 5], [0, 3, 7], [5, 9, 12]],
      scale: [0, 2, 3, 5, 7, 9, 10], cutoff: 1500, wave: 'sawtooth', pad: 0.11,
      harp: 0.85, harpOct: 12, flute: 0.45, drum: 0.6,
    },
    { // V. Gondor : do majeur, majestueux
      root: 48, tempo: 74, chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]],
      scale: [0, 2, 4, 5, 7, 9], cutoff: 2000, wave: 'sawtooth', pad: 0.12,
      harp: 0.55, harpOct: 12, flute: 0.55, drum: 0.45,
    },
    { // VI. Mordor : mi phrygien, tendu
      root: 40, tempo: 54, chords: [[0, 3, 7], [1, 4, 8], [0, 3, 7], [-2, 1, 6]],
      scale: [0, 1, 3, 5, 7, 8], cutoff: 420, wave: 'sawtooth', pad: 0.15,
      harp: 0.15, harpOct: 12, flute: 0.12, drum: 1,
    },
  ];
  const PATTERN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 2, 1, 3];
  const VOLUME = 0.55;

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const stepDur = (m) => 60 / m.tempo / 2; // une croche

  let ctx, master, padFilter, padBus, harpBus, reverb, timer = null;
  let on = false;
  let moodIdx = Number(document.body.dataset.stop) || 0;
  let pending = moodIdx;
  let step = 0, nextTime = 0, chordIdx = -1;

  /* ---------- Construction du "studio" ---------- */
  function impulse(seconds) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    return buf;
  }

  function build() {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);
    comp.connect(ctx.destination);

    // Réverbe (salle de pierre)
    const conv = ctx.createConvolver();
    conv.buffer = impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    reverb = ctx.createGain();
    reverb.connect(conv);
    conv.connect(wet);
    wet.connect(master);

    // Nappe
    const m = MOODS[moodIdx];
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = m.cutoff;
    padFilter.Q.value = 0.7;
    padBus = ctx.createGain();
    padBus.gain.value = m.pad;
    padFilter.connect(padBus);
    padBus.connect(master);
    padBus.connect(reverb);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();

    // Harpe
    harpBus = ctx.createGain();
    harpBus.gain.value = 0.22;
    harpBus.connect(master);
    harpBus.connect(reverb);
  }

  /* ---------- Instruments ---------- */
  function pad(notes, t, dur, wave) {
    const level = 0.5 / notes.length;
    notes.forEach((n) => {
      [-7, 7].forEach((detune) => {
        const o = ctx.createOscillator();
        o.type = wave;
        o.frequency.value = hz(n);
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(level, t + 1.8);
        g.gain.setValueAtTime(level, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 2.5);
        o.connect(g);
        g.connect(padFilter);
        o.start(t);
        o.stop(t + dur + 2.6);
      });
    });
  }

  function pluck(n, t, vel) {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o.type = 'triangle';
    o2.type = 'sine';
    o.frequency.value = hz(n);
    o2.frequency.value = hz(n) * 2;
    const g = ctx.createGain();
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(harpBus);
    o.start(t); o2.start(t);
    o.stop(t + 1.7); o2.stop(t + 1.7);
  }

  function flute(n, t, dur) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(n);
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = 5;
    vibGain.gain.setValueAtTime(0, t);
    vibGain.gain.linearRampToValueAtTime(hz(n) * 0.006, t + 0.4); // vibrato qui arrive doucement
    vib.connect(vibGain);
    vibGain.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.085, t + 0.12);
    g.gain.setValueAtTime(0.085, t + Math.max(0.15, dur - 0.1));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.25);
    o.connect(g);
    g.connect(master);
    g.connect(reverb);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.3); vib.stop(t + dur + 0.3);
  }

  function drum(t, level) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g);
    g.connect(master);
    g.connect(reverb);
    o.start(t);
    o.stop(t + 0.75);
  }

  // Petite phrase de flûte : marche aléatoire dans la gamme
  function phrase(t, m) {
    const base = m.root + 12 * Math.round((74 - m.root) / 12);
    const len = m.scale.length;
    let i = Math.floor(Math.random() * len);
    const count = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < count; k++) {
      const dur = stepDur(m) * 2 * (Math.random() < 0.6 ? 1 : 2);
      const note = base + 12 * Math.floor(i / len) + m.scale[((i % len) + len) % len];
      flute(note, t, dur * 0.95);
      t += dur;
      i += [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)];
      i = Math.max(0, Math.min(len * 2 - 1, i));
    }
  }

  /* ---------- Séquenceur ---------- */
  function scheduleStep(t) {
    const s = step % 16;
    if (s === 0) {
      if (pending !== moodIdx) {
        moodIdx = pending;
        chordIdx = -1;
        padFilter.frequency.setTargetAtTime(MOODS[moodIdx].cutoff, t, 1.2);
        padBus.gain.setTargetAtTime(MOODS[moodIdx].pad, t, 1.2);
      }
      const m = MOODS[moodIdx];
      chordIdx = (chordIdx + 1) % m.chords.length;
      const ch = m.chords[chordIdx];
      pad([m.root - 12 + ch[0], ...ch.map((x) => m.root + x)], t, 16 * stepDur(m), m.wave);
      if (Math.random() < m.flute) phrase(t + stepDur(m) * 2, m);
    }
    const m = MOODS[moodIdx];
    if (s % 8 === 0 && Math.random() < m.drum) drum(t, m.drum);
    if (Math.random() < m.harp) {
      const ch = m.chords[Math.max(chordIdx, 0)];
      const tones = [...ch, ...ch.map((x) => x + 12)];
      const note = m.root + m.harpOct + tones[PATTERN[s] % tones.length];
      pluck(note, t + (Math.random() - 0.5) * 0.02, 0.2 + Math.random() * 0.25);
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.2) {
      scheduleStep(nextTime);
      nextTime += stepDur(MOODS[moodIdx]);
      step++;
    }
  }

  /* ---------- Marche / arrêt ---------- */
  function ui() {
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Couper la musique' : 'Activer la musique');
  }

  async function start() {
    on = true;
    ui();
    if (!ctx) build();
    await ctx.resume();
    if (!timer) {
      nextTime = ctx.currentTime + 0.1;
      step = 0;
      chordIdx = -1;
      timer = setInterval(tick, 50);
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.8);
  }

  function stop() {
    on = false;
    ui();
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => {
      if (on) return;
      clearInterval(timer);
      timer = null;
      ctx.suspend();
    }, 2000);
  }

  btn.addEventListener('click', () => {
    if (on) stop(); else start();
    store.set(on ? 'on' : 'off');
  });

  // La musique suit le voyage
  document.addEventListener('journey:stop', (e) => { pending = e.detail; });

  // Onglet en arrière-plan : on met en pause
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // Si le visiteur avait activé la musique, on la relance à sa première interaction
  if (store.get() === 'on') {
    const events = ['pointerdown', 'keydown'];
    const arm = (e) => {
      if (e.target.closest && e.target.closest('#music-btn')) return;
      events.forEach((ev) => document.removeEventListener(ev, arm));
      if (!on) start();
    };
    events.forEach((ev) => document.addEventListener(ev, arm));
  }
})();
