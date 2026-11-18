// Onboarding: langit malam, cahaya jatuh ke titik bersinar, lalu lambang bulan-bintang muncul.
(function () {
  const intro = document.getElementById('intro');
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  const btnSound = document.getElementById('btnSound');
  const soundLabel = document.getElementById('soundLabel');
  const soundWaves = document.getElementById('soundWaves');
  let stars = [], raf = 0, running = false, w = 0, h = 0, dpr = 1;

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
    for (const s of stars) {
      const a = s.a * (0.55 + 0.45 * Math.sin(s.p + t * s.s * 60)) * fadeIn;
      ctx.beginPath();
      ctx.fillStyle = s.gold ? `rgba(232,196,104,${a})` : `rgba(220,230,255,${a})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (running) raf = requestAnimationFrame(draw);
  }

  // ===== Suara (dibuat dengan Web Audio, tanpa file) =====
  let ac = null, master = null, soundOn = false, pad = [];
  function ensureAudio() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900; filt.connect(master);
    // pad lembut: akor D mayor terbuka
    [146.83, 220.0, 293.66, 369.99].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const g = ac.createGain(); g.gain.value = 0.05;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.08 + i * 0.03;
      const lg = ac.createGain(); lg.gain.value = 0.025; lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(filt); o.start(); lfo.start(); pad.push(o, lfo);
    });
  }
  function chime() {
    if (!ac || !soundOn) return;
    const now = ac.currentTime;
    [587.33, 880, 1174.66, 1760].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); g.gain.setValueAtTime(0, now + i * 0.09);
      g.gain.linearRampToValueAtTime(0.12 / (i + 1), now + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 2.8);
      o.connect(g); g.connect(ac.destination); o.start(now + i * 0.09); o.stop(now + i * 0.09 + 3);
    });
  }
  function setSound(on) {
    soundOn = on;
    btnSound.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Matikan suara' : 'Nyalakan suara';
    soundWaves.style.opacity = on ? 1 : 0.35;
    if (on) { ensureAudio(); ac.resume(); }
    if (ac) master.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.6);
  }
  btnSound.addEventListener('click', () => { setSound(!soundOn); if (soundOn && intro.classList.contains('landed')) chime(); });

  let landTimer = 0;
  function play() {
    intro.classList.remove('hidden', 'leaving', 'run', 'landed');
    void intro.offsetWidth;
    t0 = performance.now(); running = true; resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    intro.classList.add('run');
    clearTimeout(landTimer);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    landTimer = setTimeout(() => { intro.classList.add('landed'); chime(); }, reduce ? 50 : 2650);
  }
  function close(cb) {
    intro.classList.add('leaving');
    if (ac) master.gain.setTargetAtTime(0, ac.currentTime, 0.4);
    try { localStorage.setItem('mu_intro_seen', '1'); } catch (e) {}
    setTimeout(() => { intro.classList.add('hidden'); running = false; cancelAnimationFrame(raf); cb && cb(); }, 900);
  }

  window.addEventListener('resize', () => running && resize());
  window.Intro = { play, close, onStart: null };
  const start = () => close(() => window.Intro.onStart && window.Intro.onStart());
  document.getElementById('btnStart').addEventListener('click', start);
  document.getElementById('btnSkip').addEventListener('click', start);
  play();
})();
