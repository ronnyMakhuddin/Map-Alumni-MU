// Onboarding: langit malam, cahaya jatuh ke titik bersinar, lambang bulan-bintang muncul,
// lalu cahaya membuka "lubang" yang melebar dan memperlihatkan peta di baliknya.
(function () {
  if (!(window.CSS && CSS.registerProperty)) document.documentElement.classList.add('no-prop');
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  const btnSound = document.getElementById('btnSound');
  const soundLabel = document.getElementById('soundLabel');
  const soundWaves = document.getElementById('soundWaves');
  let stars = [], raf = 0, running = false, w = 0, h = 0, dpr = 1, warp = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 5200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.85,
      r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.6 + 0.15,
      s: Math.random() * 0.02 + 0.004, p: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.08
    }));
  }
  let t0 = performance.now();
  function draw(now) {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    const fadeIn = Math.min(1, t / 1.2);
    const cx = w / 2, cy = h * 0.4;
    for (const s of stars) {
      // saat transisi, bintang melesat menjauh dari titik pusat (efek "masuk")
      if (warp) { const dx = s.x - cx, dy = s.y - cy; s.x += dx * warp * 0.06; s.y += dy * warp * 0.06; }
      const a = s.a * (0.55 + 0.45 * Math.sin(s.p + t * s.s * 60)) * fadeIn;
      ctx.beginPath();
      ctx.fillStyle = s.gold ? `rgba(232,196,104,${a})` : `rgba(220,230,255,${a})`;
      ctx.arc(s.x, s.y, s.r * (1 + warp * 1.5), 0, Math.PI * 2);
      ctx.fill();
    }
    if (running) raf = requestAnimationFrame(draw);
  }

  // ===== Suara (Web Audio, tanpa file). Default: NYALA. =====
  // Browser melarang audio berbunyi sebelum ada interaksi, jadi suara otomatis mulai
  // pada sentuhan/klik/tombol pertama di mana pun di layar.
  let ac = null, master = null, padBus = null;
  let soundOn = true;
  try { soundOn = localStorage.getItem('mu_sound') !== 'off'; } catch (e) {}
  let pendingChime = false;

  function ensureAudio() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    padBus = ac.createBiquadFilter(); padBus.type = 'lowpass'; padBus.frequency.value = 900; padBus.connect(master);
    [146.83, 220.0, 293.66, 369.99].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
      const g = ac.createGain(); g.gain.value = 0.05;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.08 + i * 0.03;
      const lg = ac.createGain(); lg.gain.value = 0.025; lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(padBus); o.start(); lfo.start();
    });
  }
  const audible = () => soundOn && ac && ac.state === 'running';
  function fadePad(to, tc) { if (ac) master.gain.setTargetAtTime(to, ac.currentTime, tc || 0.6); }
  function chime() {
    if (!audible()) { pendingChime = soundOn; return; }
    const now = ac.currentTime;
    [587.33, 880, 1174.66, 1760].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); const st = now + i * 0.09;
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.12 / (i + 1), st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 2.8);
      o.connect(g); g.connect(ac.destination); o.start(st); o.stop(st + 3);
    });
  }
  function whoosh() {
    if (!soundOn || !ac) return;
    if (ac.state !== 'running') { ac.resume().then(() => ac.state === 'running' && whooshNow()).catch(() => {}); return; }
    whooshNow();
  }
  function whooshNow() {
    const now = ac.currentTime, dur = 1.6;
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(300, now); bp.frequency.exponentialRampToValueAtTime(3200, now + dur * 0.7);
    const g = ac.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.18, now + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(now); src.stop(now + dur);
    // akor naik yang lembut
    [293.66, 440, 587.33, 739.99].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f / 2, now); o.frequency.exponentialRampToValueAtTime(f, now + 0.9);
      const og = ac.createGain(); og.gain.setValueAtTime(0, now); og.gain.linearRampToValueAtTime(0.05, now + 0.6 + i * 0.05); og.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
      o.connect(og); og.connect(ac.destination); o.start(now); o.stop(now + 2.7);
    });
  }
  function renderSoundBtn() {
    btnSound.setAttribute('aria-pressed', String(soundOn));
    soundLabel.textContent = soundOn ? 'Matikan suara' : 'Nyalakan suara';
    soundWaves.style.opacity = soundOn ? 1 : 0.3;
  }
  function unlock() {
    if (!soundOn) return;
    ensureAudio(); if (!ac) return;
    const go = () => { if (intro.classList.contains('hidden') || intro.classList.contains('opening')) return; fadePad(0.5); if (pendingChime) { pendingChime = false; chime(); } };
    if (ac.state === 'running') go(); else ac.resume().then(go).catch(() => {});
  }
  function setSound(on) {
    soundOn = on; renderSoundBtn();
    try { localStorage.setItem('mu_sound', on ? 'on' : 'off'); } catch (e) {}
    if (on) { unlock(); if (intro.classList.contains('landed')) setTimeout(chime, 120); }
    else fadePad(0, 0.3);
  }
  btnSound.addEventListener('click', (e) => { e.stopPropagation(); setSound(!soundOn); });
  // sentuhan pertama di mana pun = izin audio
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  let landTimer = 0;
  function play() {
    intro.classList.remove('hidden', 'leaving', 'opening', 'run', 'landed');
    app.classList.add('pre'); app.classList.remove('entering');
    warp = 0; void intro.offsetWidth;
    t0 = performance.now(); running = true; resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    intro.classList.add('run'); renderSoundBtn();
    if (soundOn) { ensureAudio(); if (ac && ac.state !== 'running') ac.resume().catch(() => {}); fadePad(0.5); }
    clearTimeout(landTimer);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    landTimer = setTimeout(() => { intro.classList.add('landed'); chime(); }, reduce ? 50 : 2650);
  }

  // Transisi ke aplikasi: cahaya di pusat melebar menjadi "jendela" yang memperlihatkan peta,
  // bintang melesat keluar, peta turun dari ketinggian, lalu kontrol UI muncul bertahap.
  function close(cb) {
    if (intro.classList.contains('opening')) return;
    try { localStorage.setItem('mu_intro_seen', '1'); } catch (e) {}
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    intro.classList.add('landed', 'opening');
    whoosh(); fadePad(0, 0.5);
    const t = performance.now();
    (function ramp() { warp = Math.min(1, (performance.now() - t) / 900); if (warp < 1 && running) requestAnimationFrame(ramp); })();
    cb && cb();                                     // peta mulai terbang ke data sejak lubang mulai terbuka
    app.classList.remove('pre'); app.classList.add('entering');
    setTimeout(() => {
      intro.classList.add('hidden'); intro.classList.remove('opening');
      running = false; cancelAnimationFrame(raf);
    }, reduce ? 50 : 1500);
    setTimeout(() => app.classList.remove('entering'), reduce ? 50 : 2600);
  }

  window.addEventListener('resize', () => running && resize());
  window.Intro = { play, close, onStart: null };
  const start = () => close(() => window.Intro.onStart && window.Intro.onStart());
  document.getElementById('btnStart').addEventListener('click', start);
  document.getElementById('btnSkip').addEventListener('click', start);
  play();
})();
