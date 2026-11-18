// Pembuka: langit malam → bintang jatuh → peta Indonesia terbentuk dari cahaya (titik-titik alumni muncul
// bergelombang) → langit berubah terang → peta menyusut tepat ke posisi peta aplikasi lalu melebur.
(function () {
  if (!(window.CSS && CSS.registerProperty)) document.documentElement.classList.add('no-prop');
  const $ = (id) => document.getElementById(id);
  const intro = $('intro'), app = $('app'), canvas = $('stars'), ctx = canvas.getContext('2d');
  const imap = $('imap'), svg = $('imapSvg');
  const btnSound = $('btnSound'), soundLabel = $('soundLabel'), soundWaves = $('soundWaves');
  const M = window.INDONESIA_MAP;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = reduce ? { wait: 0, fall: 10, day: 300, morph: 300, morphDur: 200 } : { wait: 1100, fall: 1600, day: 1750, morph: 1350, morphDur: 1100 };

  // ---------- peta SVG ----------
  svg.setAttribute('viewBox', `0 0 ${M.w} ${M.h}`);
  $('imapLand').setAttribute('d', M.d); $('imapLine').setAttribute('d', M.d);
  const R = 180 / Math.PI, my = (lat) => Math.log(Math.tan(Math.PI / 4 + lat / R / 2)) * R;
  const proj = (lat, lng) => [(lng - M.lon0) * M.k, (my(M.lat1) - my(lat)) * M.k];
  // titik dekorasi acak di daratan (agar peta tetap "hidup" walau data alumni masih sedikit)
  const decor = (() => {
    const out = []; try {
      const c = document.createElement('canvas'); c.width = M.w; c.height = M.h;
      const g = c.getContext('2d'); const path = new Path2D(M.d);
      let tries = 0;
      while (out.length < 320 && tries++ < 9000) {
        const x = Math.random() * M.w, y = Math.random() * M.h;
        if (g.isPointInPath(path, x, y)) out.push([x, y]);
      }
    } catch (e) {}
    return out;
  })();
  let alumniPts = window.__alumniPts || [];
  window.addEventListener('alumni:data', (e) => { alumniPts = e.detail || []; });

  function buildDots() {
    const NS = 'http://www.w3.org/2000/svg', g = $('imapDots'), pg = $('imapPulses');
    g.textContent = ''; pg.textContent = '';
    const cx = M.w / 2, cy = M.h / 2, maxD = Math.hypot(cx, cy);
    const real = alumniPts.slice(0, 900).map((p) => proj(p[0], p[1])).filter(([x, y]) => x > -20 && x < M.w + 20 && y > -20 && y < M.h + 20);
    const pts = real.map((p) => [p[0], p[1], 2.6]).concat(decor.slice(0, Math.max(120, 320 - real.length)).map((p) => [p[0], p[1], 1.4]));
    const frag = document.createDocumentFragment();
    for (const [x, y, r] of pts) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', r);
      const d = 0.25 + (Math.hypot(x - cx, y - cy) / maxD) * 0.9 + Math.random() * 0.2;
      c.style.setProperty('--dd', d.toFixed(2) + 's');
      if (r < 2) c.style.fill = 'rgba(215,228,255,.8)';
      frag.appendChild(c);
    }
    g.appendChild(frag);
    const src = real.length >= 4 ? real : decor;
    for (let i = 0; i < 5 && src.length; i++) {
      const p = src[Math.floor(Math.random() * src.length)];
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('class', 'imap-pulse');
      c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 46);
      c.style.setProperty('--dd', (0.5 + i * 0.22).toFixed(2) + 's'); pg.appendChild(c);
    }
  }
  // saat transisi ke "siang", titik dekorasi ikut berubah warna
  function dotsToDay() { $$('#imapDots circle').forEach((c) => { if (c.style.fill) c.style.fill = 'rgba(194,85,26,.45)'; }); }
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ---------- langit berbintang ----------
  let stars = [], raf = 0, running = false, w = 0, h = 0, t0 = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 5200) }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.85, r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.6 + 0.15, s: Math.random() * 0.02 + 0.004, p: Math.random() * Math.PI * 2, gold: Math.random() < 0.08 }));
  }
  function draw(now) {
    const t = (now - t0) / 1000, f = Math.min(1, t / 1.2);
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = s.a * (0.55 + 0.45 * Math.sin(s.p + t * s.s * 60)) * f;
      ctx.beginPath(); ctx.fillStyle = s.gold ? `rgba(232,196,104,${a})` : `rgba(220,230,255,${a})`; ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
    if (running) raf = requestAnimationFrame(draw);
  }

  // ---------- SUARA (Web Audio, disintesis, tanpa file) ----------
  // Default nyala. Browser baru mengizinkan bunyi setelah ada sentuhan/klik pertama.
  let soundOn = true; try { soundOn = localStorage.getItem('mu_sound') !== 'off'; } catch (e) {}
  let ac = null, out = null, wet = null;
  function ensureAudio() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ac.destination);
    out = ac.createGain(); out.gain.value = soundOn ? 0.9 : 0; out.connect(comp);
    // reverb ruangan besar (impuls dibuat dari derau yang meluruh)
    const len = ac.sampleRate * 3.2, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = ac.createConvolver(); conv.buffer = ir; wet = ac.createGain(); wet.gain.value = 0.55; wet.connect(conv); conv.connect(out);
    return ac;
  }
  const live = () => soundOn && ac && ac.state === 'running';
  function voice(f, t, dur, gain, type, pan, dest) {
    const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    o.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(dest || out); p.connect(wet); } else { g.connect(dest || out); g.connect(wet); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(f, t, gain, pan) { // lonceng/celesta: nada dasar + parsial inharmonik
    voice(f, t, 1.1, gain, 'sine', pan); voice(f * 2.756, t, 0.35, gain * 0.18, 'sine', pan); voice(f * 5.404, t, 0.15, gain * 0.06, 'sine', pan);
  }
  function noise(dur) { const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; }
  const SFX = {
    fall() { // desir naik yang halus saat cahaya jatuh
      if (!live()) return; const t = ac.currentTime, d = T.fall / 1000 + 0.2, n = noise(d);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2600, t + d);
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + d * 0.8); g.gain.linearRampToValueAtTime(0, t + d);
      n.connect(bp); bp.connect(g); g.connect(out); g.connect(wet); n.start(t);
      voice(880, t + d * 0.3, d, 0.015, 'sine', 0); voice(1318.5, t + d * 0.55, d, 0.012, 'sine', 0);
    },
    land() { // dentum lembut + taburan lonceng berkilau (pentatonik E) seperti contoh
      if (!live()) return false; const t = ac.currentTime;
      const o = ac.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(42, t + 1.2);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5);
      const scale = [1318.5, 1480, 1661.2, 1975.5, 2217.5, 2637, 1108.7, 987.8];
      const N = 26;
      for (let i = 0; i < N; i++) {
        const tt = t + 0.04 + Math.pow(i / N, 1.25) * 1.9 + Math.random() * 0.03;
        const f = scale[i < 3 ? [2, 1, 0][i] : Math.floor(Math.random() * (i > N * 0.7 ? 8 : 6))];
        bell(f, tt, 0.07 * (1 - i / N * 0.55), (Math.random() * 2 - 1) * 0.7);
      }
      return true;
    },
    day() { // akor hangat E mayor (add9) mengembang saat langit terang
      if (!live()) return; const t = ac.currentTime;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(2200, t + 1.5); lp.connect(out); lp.connect(wet);
      [164.8, 246.9, 329.6, 415.3, 493.9, 740].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = i < 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8;
        const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045 / (1 + i * 0.25), t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
        o.connect(g); g.connect(lp); o.start(t); o.stop(t + 3.7);
      });
      bell(2637, t + 0.15, 0.035, -0.3); bell(3322.4, t + 0.42, 0.025, 0.3);
    },
    morph() { // hembusan lembut saat peta "masuk"
      if (!live()) return; const t = ac.currentTime, n = noise(1.2);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(380, t + 1.1);
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      n.connect(bp); bp.connect(g); g.connect(out); g.connect(wet); n.start(t);
      bell(1975.5, t + 0.75, 0.03, 0); bell(2637, t + 0.86, 0.022, 0.2);
    }
  };
  function renderSound() {
    const on = live();
    btnSound.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Matikan suara' : 'Nyalakan suara';
    soundWaves.style.opacity = on ? 1 : 0.3;
  }
  let landPlayed = false;
  function tryStartAudio() {
    if (!soundOn) return Promise.resolve(false);
    if (!ensureAudio()) return Promise.resolve(false);
    out.gain.setTargetAtTime(0.9, ac.currentTime, 0.05);
    return (ac.state === 'running' ? Promise.resolve() : ac.resume()).then(() => { renderSound(); return live(); }).catch(() => false);
  }
  btnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    if (live()) { soundOn = false; out.gain.setTargetAtTime(0, ac.currentTime, 0.15); setPref(); renderSound(); return; }
    soundOn = true; setPref(); tryStartAudio().then((ok) => { if (ok && phase === 'landed' && !landPlayed) landPlayed = SFX.land(); });
  });
  function setPref() { try { localStorage.setItem('mu_sound', soundOn ? 'on' : 'off'); } catch (e) {} }
  // sentuhan pertama di mana pun = izin audio; saat menunggu, juga langsung menjatuhkan cahaya
  function firstTouch(e) {
    if (e && e.target && e.target.closest && e.target.closest('#btnSound')) return;
    tryStartAudio().then((ok) => { if (ok && phase === 'landed' && !landPlayed) landPlayed = SFX.land(); });
    if (phase === 'wait') fall();
  }
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, firstTouch, { capture: true, passive: true }));

  // ---------- urutan animasi ----------
  let phase = 'idle', timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function play() {
    clearTimers(); phase = 'wait'; landPlayed = false;
    intro.className = 'intro'; imap.removeAttribute('style'); app.classList.add('pre'); app.classList.remove('entering');
    intro.style.setProperty('--fall', T.fall + 'ms');
    t0 = performance.now(); running = true; resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    void intro.offsetWidth; intro.classList.add('run');
    tryStartAudio(); renderSound();
    later(T.wait, fall);
  }
  function fall() {
    if (phase !== 'wait') return; phase = 'fall'; clearTimers();
    intro.classList.add('falling'); SFX.fall();
    later(T.fall, land);
  }
  function land() {
    phase = 'landed'; buildDots();
    intro.classList.add('landed');
    landPlayed = SFX.land();
    later(T.day, () => { phase = 'day'; intro.classList.add('day'); dotsToDay(); SFX.day(); later(T.morph, morph); });
  }
  function morph() {
    if (phase === 'morph' || phase === 'done') return; phase = 'morph'; clearTimers();
    const hooks = window.Intro;
    try { hooks.onPrepare && hooks.onPrepare(); } catch (e) {}
    // bekukan posisi peta intro, lalu animasikan ke kotak peta aplikasi
    const r0 = imap.getBoundingClientRect();
    imap.style.transition = 'none'; imap.style.animation = 'none';
    Object.assign(imap.style, { left: r0.left + 'px', top: r0.top + 'px', width: r0.width + 'px', transform: 'none', scale: '1', opacity: '1' });
    void imap.offsetWidth;
    intro.classList.add('landed', 'day', 'morph'); SFX.morph();
    imap.style.transition = '';
    const target = hooks.getRect ? hooks.getRect() : null;
    if (target && r0.width > 0) {
      const s = target.w / r0.width;
      imap.style.transform = `translate(${target.x - r0.left}px, ${target.y - r0.top}px) scale(${s})`;
    }
    later(T.morphDur * 0.55, () => { app.classList.remove('pre'); app.classList.add('entering'); });
    later(T.morphDur + 350, () => { hooks.onStart && hooks.onStart(); });
    later(T.morphDur + 250, () => { intro.classList.add('gone'); });
    later(T.morphDur + 700, () => {
      phase = 'done'; intro.classList.add('hidden'); running = false; cancelAnimationFrame(raf);
      try { localStorage.setItem('mu_intro_seen', '1'); } catch (e) {}
    });
    later(T.morphDur + 2000, () => app.classList.remove('entering'));
  }
  function skip() {
    if (phase === 'morph' || phase === 'done') return;
    clearTimers(); buildDots(); intro.classList.add('run', 'landed', 'day'); phase = 'day';
    later(60, morph);
  }
  $('btnSkip').addEventListener('click', (e) => { e.stopPropagation(); skip(); });
  window.addEventListener('resize', () => running && resize());

  window.Intro = { play, skip, onStart: null, onPrepare: null, getRect: null };
  play();
})();
