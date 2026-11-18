(function () {
  'use strict';
  const C = window.APP_CONFIG;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const isDesktop = () => matchMedia('(min-width: 900px)').matches;
  const DEMO = new URLSearchParams(location.search).has('demo');
  const API = '/api/alumni';

  const ICON = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
    dir: '<svg viewBox="0 0 24 24"><path d="m21.7 11.3-9-9a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-5.91.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65A2.92 2.92 0 1 0 18 16.08z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>',
    cap: '<svg viewBox="0 0 24 24"><path d="M5 13.2v4L12 21l7-3.8v-4L12 17zM12 3 1 9l11 6 9-4.9V17h2V9z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    work: '<svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4z"/></svg>',
    gps: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2z"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M20.5 3l-.2.1L15 5.1 9 3 3.4 4.9c-.2.1-.4.3-.4.5v15.1c0 .3.2.5.5.5l.2-.1L9 18.9l6 2.1 5.6-1.9c.2-.1.4-.3.4-.5V3.5c0-.3-.2-.5-.5-.5zM15 19l-6-2.1V5l6 2.1z"/></svg>',
    coord: '<svg viewBox="0 0 24 24"><path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z"/></svg>',
    info: '<svg viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/></svg>',
    group: '<svg viewBox="0 0 24 24"><path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
  };

  const unitColor = (u) => (C.unit.find((x) => x.nama === u) || {}).warna || '#5F6368';
  const initials = (n) => String(n || '?').replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const fmtKm = (m) => (m < 1000 ? Math.round(m) + ' m' : (m < 10000 ? (m / 1000).toFixed(1) : Math.round(m / 1000)) + ' km');
  const fmtCoord = (lat, lng) => `${(+lat).toFixed(5)}, ${(+lng).toFixed(5)}`;

  // ================= STATE =================
  const S = {
    all: [], filtered: [], view: 'explore', selected: null, me: null,
    filters: { tahunDari: null, tahunSampai: null, provinsi: new Set(), unit: new Set(), asrama: new Set() },
    q: '', mine: LS.get('mu_my_entry'), layer: 'default', demo: false, listLimit: 60
  };

  // ================= MAP =================
  const map = L.map('map', { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 3, maxZoom: 19 })
    .setView(C.pusatPeta, C.zoomAwal);
  map.attributionControl.setPrefix(false);
  const LAYERS = {
    default: [L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd', attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>' })],
    satellite: [
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Citra © Esri, Maxar, Earthstar Geographics' }),
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap · © CARTO' })
    ],
    terrain: [L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, subdomains: 'abc', attribution: '© OpenStreetMap · SRTM · © OpenTopoMap (CC-BY-SA)' })]
  };
  LAYERS.default.forEach((l) => l.addTo(map));
  function setLayer(name) {
    LAYERS[S.layer].forEach((l) => map.removeLayer(l));
    S.layer = name; LAYERS[name].forEach((l) => l.addTo(map));
    $$('#layerPop [data-layer]').forEach((b) => b.classList.toggle('active', b.dataset.layer === name));
  }

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 52, spiderfyOnMaxZoom: true, chunkedLoading: true,
    iconCreateFunction(c) {
      const n = c.getChildCount(); const s = n < 10 ? 34 : n < 100 ? 40 : n < 1000 ? 48 : 56;
      return L.divIcon({ html: `<div class="cl" style="width:${s}px;height:${s}px;font-size:${s > 40 ? 14 : 13}px">${n}</div>`, className: '', iconSize: [s, s] });
    }
  }).addTo(map);
  const markers = new Map();
  function pinIcon(a, sel) {
    const col = unitColor(a.unit);
    return L.divIcon({
      className: '', iconSize: [28, 38], iconAnchor: [14, 37], popupAnchor: [0, -34],
      html: `<div class="pin${sel ? ' sel' : ''}"><svg viewBox="0 0 28 38"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 38 14 38s14-13.7 14-24.1C28 6.2 21.7 0 14 0z" fill="${col}" stroke="rgba(0,0,0,.18)"/></svg><b>${esc(initials(a.nama))}</b></div>`
    });
  }
  if (C.lokasiPondok) {
    L.marker([C.lokasiPondok.lat, C.lokasiPondok.lng], { zIndexOffset: 1000, icon: L.divIcon({ className: '', iconSize: [34, 46], iconAnchor: [17, 45],
      html: '<div class="pin pin-pondok"><svg viewBox="0 0 28 38"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 38 14 38s14-13.7 14-24.1C28 6.2 21.7 0 14 0z" fill="#0A1630"/><path d="M16 7a7 7 0 1 0 0 13 5.8 5.8 0 1 1 0-13z" fill="#E8C468"/></svg></div>' }) })
      .addTo(map).bindTooltip(esc(C.lokasiPondok.label || C.namaPondok), { direction: 'top', offset: [0, -40] });
  }

  function renderMarkers() {
    cluster.clearLayers(); markers.clear();
    const list = S.filtered.map((a) => {
      const m = L.marker([a.lat, a.lng], { icon: pinIcon(a, S.selected === a.id), title: a.nama, riseOnHover: true });
      m.on('click', () => openDetail(a.id, false));
      markers.set(a.id, m); return m;
    });
    cluster.addLayers(list);
  }
  function highlight(id) {
    for (const [mid, m] of markers) {
      const a = S.all.find((x) => x.id === mid);
      if (a && (mid === id || m.options.icon.options.html.includes(' sel'))) m.setIcon(pinIcon(a, mid === id));
    }
  }

  // ================= DATA =================
  async function load() {
    if (DEMO) return useDemo();
    try {
      const r = await fetch(API, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      const j = await r.json();
      S.all = (j.data || []).map(normalize); S.demo = false;
    } catch (e) {
      console.warn('API gagal:', e);
      toast('Gagal memuat data dari server. Menampilkan data contoh.');
      return useDemo();
    }
    applyFilters();
  }
  function normalize(a) { return { ...a, id: +a.id, lat: +a.lat, lng: +a.lng, tahun_lulus: +a.tahun_lulus, tahun_masuk: a.tahun_masuk ? +a.tahun_masuk : null }; }
  function useDemo() {
    S.demo = true;
    const kota = [['Surabaya','Jawa Timur',-7.2575,112.7521],['Malang','Jawa Timur',-7.9666,112.6326],['Sidoarjo','Jawa Timur',-7.4478,112.7183],['Jember','Jawa Timur',-8.1724,113.7003],
      ['Kediri','Jawa Timur',-7.8166,112.0114],['Pamekasan','Jawa Timur',-7.1568,113.4746],['Semarang','Jawa Tengah',-6.9667,110.4167],['Solo','Jawa Tengah',-7.5755,110.8243],
      ['Kudus','Jawa Tengah',-6.8048,110.8405],['Yogyakarta','Daerah Istimewa Yogyakarta',-7.7956,110.3695],['Bandung','Jawa Barat',-6.9175,107.6191],['Bogor','Jawa Barat',-6.595,106.8166],
      ['Jakarta Selatan','DKI Jakarta',-6.2615,106.8106],['Tangerang','Banten',-6.1783,106.6319],['Denpasar','Bali',-8.6705,115.2126],['Mataram','Nusa Tenggara Barat',-8.5833,116.1167],
      ['Makassar','Sulawesi Selatan',-5.1477,119.4327],['Balikpapan','Kalimantan Timur',-1.2379,116.8529],['Banjarmasin','Kalimantan Selatan',-3.3194,114.5908],['Pontianak','Kalimantan Barat',-0.0263,109.3425],
      ['Medan','Sumatera Utara',3.5952,98.6722],['Palembang','Sumatera Selatan',-2.9761,104.7754],['Pekanbaru','Riau',0.5071,101.4478],['Bandar Lampung','Lampung',-5.3971,105.2668],
      ['Manado','Sulawesi Utara',1.4748,124.8421],['Jayapura','Papua',-2.5337,140.7181],['Kairo','Luar Negeri',30.0444,31.2357],['Madinah','Luar Negeri',24.4672,39.6024],['Kuala Lumpur','Luar Negeri',3.139,101.6869]];
    const dep = ['Ahmad','Muhammad','Abdul','Siti','Nur','Fatimah','Ali','Hasan','Zainal','Aisyah','Rizki','Ummu','Fahmi','Lailatul','Imam','Khoirul','Dewi','Ilham','Miftahul','Rohmah'];
    const bel = ['Fauzi','Hidayat','Rahman','Aminah','Hasanah','Maulana','Syafi\'i','Mubarok','Azizah','Khasanah','Hakim','Ridwan','Zahro','Anwar','Nikmah','Huda','Faruq','Jannah'];
    const kerja = ['Guru','Pengasuh pesantren','Dosen','Wiraswasta','Mahasiswa','Dokter','ASN','Penghulu','Petani','Pedagang','Imam masjid','Programmer','Perawat','Notaris'];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const units = C.unit.map((u) => u.nama).slice(0, 7);
    S.all = Array.from({ length: 180 }, (_, i) => {
      const k = rnd() < .55 ? pick(kota.slice(0, 10)) : pick(kota);
      const lulus = 1990 + Math.floor(rnd() * 36);
      return { id: i + 1, nama: `${pick(dep)} ${pick(bel)}`, tahun_masuk: lulus - 3, tahun_lulus: lulus, unit: pick(units), asrama: pick(C.asrama),
        provinsi: k[1], kota: k[0], pekerjaan: pick(kerja), instansi: null, whatsapp: null,
        lat: k[2] + (rnd() - .5) * .18, lng: k[3] + (rnd() - .5) * .18, lokasi_samar: true, created_at: new Date().toISOString() };
    });
    applyFilters();
  }

  // ================= FILTERS =================
  function applyFilters() {
    const f = S.filters; const q = S.q.trim().toLowerCase();
    S.filtered = S.all.filter((a) =>
      (!f.tahunDari || a.tahun_lulus >= f.tahunDari) && (!f.tahunSampai || a.tahun_lulus <= f.tahunSampai) &&
      (!f.provinsi.size || f.provinsi.has(a.provinsi || '—')) && (!f.unit.size || f.unit.has(a.unit)) &&
      (!f.asrama.size || f.asrama.has(a.asrama || '—')) &&
      (!q || [a.nama, a.kota, a.provinsi, a.pekerjaan, a.instansi, a.asrama, a.unit, String(a.tahun_lulus)].some((v) => v && String(v).toLowerCase().includes(q))));
    S.listLimit = 60;
    renderMarkers(); renderChips(); renderView();
  }
  function filterActive() { const f = S.filters; return !!(f.tahunDari || f.tahunSampai || f.provinsi.size || f.unit.size || f.asrama.size); }
  function chipLabel(set, def) { const a = [...set]; return a.length ? (a.length === 1 ? a[0] : `${a[0]} +${a.length - 1}`) : def; }
  function renderChips() {
    const f = S.filters;
    const set = (k, active, label) => { const b = $(`.chip[data-filter="${k}"]`); b.classList.toggle('active', active); $('span', b).textContent = label; };
    const th = f.tahunDari || f.tahunSampai;
    set('tahun', !!th, th ? (f.tahunDari === f.tahunSampai ? `Lulus ${f.tahunDari}` : `${f.tahunDari || '…'}–${f.tahunSampai || '…'}`) : 'Tahun lulus');
    set('provinsi', f.provinsi.size > 0, chipLabel(f.provinsi, 'Wilayah'));
    set('unit', f.unit.size > 0, chipLabel(f.unit, 'Unit pendidikan'));
    set('asrama', f.asrama.size > 0, chipLabel(f.asrama, 'Asrama'));
    $('#chipReset').classList.toggle('hidden', !filterActive());
  }
  function counts(key) {
    const m = new Map(); for (const a of S.all) { const v = a[key] || '—'; m.set(v, (m.get(v) || 0) + 1); } return m;
  }

  function openFilter(kind) {
    const f = S.filters; const dlg = $('#dialog');
    const titles = { tahun: 'Tahun lulus', provinsi: 'Wilayah (provinsi)', unit: 'Unit pendidikan', asrama: 'Asrama' };
    let body = '';
    if (kind === 'tahun') {
      const years = [...new Set(S.all.map((a) => a.tahun_lulus))].sort((a, b) => b - a);
      const cy = new Date().getFullYear(); const rng = []; for (let y = cy; y >= 1950; y--) rng.push(y);
      const opt = (sel) => `<option value="">—</option>` + rng.map((y) => `<option ${sel === y ? 'selected' : ''}>${y}</option>`).join('');
      const cnt = counts('tahun_lulus');
      body = `<div class="range"><div class="field"><label>Dari</label><select id="fDari">${opt(f.tahunDari)}</select></div>
        <div class="field"><label>Sampai</label><select id="fSampai">${opt(f.tahunSampai)}</select></div></div>
        <p class="fgroup" style="margin:4px 12px 6px">Angkatan yang terdaftar</p>
        ${years.map((y) => `<div class="opt" data-year="${y}"><span class="dot" style="background:var(--g-green)"></span>Lulus ${y}<span class="cnt">${cnt.get(y)}</span></div>`).join('') || '<p class="empty">Belum ada data.</p>'}`;
    } else {
      const cnt = counts(kind);
      let opts = kind === 'unit' ? C.unit.map((u) => u.nama) : kind === 'provinsi' ? C.provinsi.slice() : C.asrama.slice();
      for (const k of cnt.keys()) if (!opts.includes(k)) opts.push(k);
      opts = opts.filter((o) => cnt.has(o) || f[kind].has(o));
      opts.sort((a, b) => (cnt.get(b) || 0) - (cnt.get(a) || 0) || a.localeCompare(b));
      body = opts.map((o) => `<label class="opt" data-name="${esc(o.toLowerCase())}"><input type="checkbox" value="${esc(o)}" ${f[kind].has(o) ? 'checked' : ''}/>
        ${kind === 'unit' ? `<span class="dot" style="background:${unitColor(o)}"></span>` : ''}<span>${esc(o)}</span><span class="cnt">${cnt.get(o) || 0}</span></label>`).join('')
        || '<p class="empty">Belum ada data.</p>';
    }
    dlg.innerHTML = `<div class="dlg-head"><h3>${titles[kind]}</h3><button class="icon-btn" data-x>${ICON.close}</button></div>
      ${kind === 'provinsi' || kind === 'asrama' ? `<input class="dlg-search" placeholder="Cari ${kind === 'provinsi' ? 'provinsi' : 'asrama'}…" />` : ''}
      <div class="dlg-body">${body}</div>
      <div class="dlg-foot"><button class="btn-outline" data-reset>Reset</button><button class="btn-primary" data-ok>Terapkan</button></div>`;
    showDialog();
    const ds = $('.dlg-search', dlg);
    if (ds) ds.addEventListener('input', () => { const v = ds.value.toLowerCase(); $$('.opt', dlg).forEach((o) => o.classList.toggle('hidden', !o.dataset.name.includes(v))); });
    $$('[data-year]', dlg).forEach((el) => el.addEventListener('click', () => { $('#fDari').value = el.dataset.year; $('#fSampai').value = el.dataset.year; }));
    $('[data-x]', dlg).onclick = hideDialog;
    $('[data-reset]', dlg).onclick = () => {
      if (kind === 'tahun') { f.tahunDari = f.tahunSampai = null; } else f[kind].clear();
      hideDialog(); applyFilters();
    };
    $('[data-ok]', dlg).onclick = () => {
      if (kind === 'tahun') {
        let a = +$('#fDari').value || null, b = +$('#fSampai').value || null;
        if (a && b && a > b) [a, b] = [b, a];
        f.tahunDari = a; f.tahunSampai = b;
      } else { f[kind] = new Set($$('input:checked', dlg).map((i) => i.value)); }
      hideDialog(); applyFilters(); fitToFiltered();
    };
  }
  function fitToFiltered() {
    if (!S.filtered.length || !filterActive()) return;
    const b = L.latLngBounds(S.filtered.map((a) => [a.lat, a.lng]));
    map.flyToBounds(b, { padding: [60, 60], maxZoom: 12, duration: .8, paddingTopLeft: isDesktop() ? [500, 60] : [40, 140] });
  }
  function showDialog() { $('#scrim').classList.remove('hidden'); $('#dialog').classList.remove('hidden'); }
  function hideDialog() { $('#scrim').classList.add('hidden'); $('#dialog').classList.add('hidden'); }

  // ================= SHEET =================
  const sheet = $('#sheet'); const body = $('#sheetBody');
  function setSheet(state) { if (!isDesktop()) sheet.dataset.state = state; updateFab(); }
  function updateFab() {
    const fb = $('#fabBottom');
    if (isDesktop()) { fb.style.bottom = ''; fb.style.opacity = 1; return; }
    const st = sheet.dataset.state;
    fb.style.opacity = st === 'full' ? 0 : 1; fb.style.pointerEvents = st === 'full' ? 'none' : '';
    if (st === 'half') fb.style.bottom = `calc(var(--nav-h) + var(--safe-b) + ${Math.round(sheet.offsetHeight / 2) + 12}px)`;
    else fb.style.bottom = '';
  }
  (function drag() {
    let y0 = 0, t0 = 0, base = 0, dragging = false, start = false, cur = 0;
    const pos = () => { const H = sheet.offsetHeight; return { peek: H - 128, half: H * 0.5, full: 0 }; };
    sheet.addEventListener('pointerdown', (e) => {
      if (isDesktop()) return;
      if (e.target.closest('input,select,button,a,label,.actions,.quick')) { if (!e.target.closest('.sheet-handle')) return; }
      const st = sheet.dataset.state;
      if (st === 'full' && body.scrollTop > 0 && !e.target.closest('.sheet-handle')) return;
      y0 = e.clientY; t0 = performance.now(); base = pos()[st]; start = true; dragging = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dy = e.clientY - y0;
      if (!dragging) {
        if (Math.abs(dy) < 8) return;
        if (sheet.dataset.state === 'full' && dy < 0) { start = false; return; }
        dragging = true; sheet.classList.add('dragging');
      }
      cur = Math.max(0, Math.min(pos().peek, base + dy));
      sheet.style.transform = `translateY(${cur}px)`;
    });
    window.addEventListener('pointerup', (e) => {
      if (!start) return; start = false;
      if (!dragging) return;
      dragging = false; sheet.classList.remove('dragging'); sheet.style.transform = '';
      const v = (e.clientY - y0) / Math.max(1, performance.now() - t0);
      const P = pos();
      let next;
      if (v > 0.6) next = cur > P.half ? 'peek' : 'half';
      else if (v < -0.6) next = cur < P.half ? 'full' : 'half';
      else next = Object.entries(P).sort((a, b) => Math.abs(a[1] - cur) - Math.abs(b[1] - cur))[0][0];
      setSheet(next);
    });
    $('#sheetHandle').addEventListener('click', () => {
      const st = sheet.dataset.state; setSheet(st === 'peek' ? 'half' : st === 'half' ? 'full' : 'peek');
    });
  })();

  // ================= VIEWS =================
  function setView(v, opts = {}) {
    if (S.view === 'form' && v !== 'form') { endPick(true); clearFormMarker(); if (v === 'detail') S.prevView = 'explore'; }
    S.view = v;
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === (v === 'detail' ? S.prevView || 'explore' : v)));
    if (v !== 'detail') { S.prevView = v; if (S.selected) { const id = S.selected; S.selected = null; highlight(-1); void id; } }
    renderView();
    body.scrollTop = 0;
    if (!opts.keepSheet) setSheet({ explore: 'peek', list: 'full', stats: 'full', form: 'full', detail: 'half' }[v]);
    if (v !== 'detail' && location.hash) history.replaceState(null, '', location.pathname + location.search);
  }
  function renderView() {
    const v = S.view;
    if (v === 'explore') body.innerHTML = viewExplore();
    else if (v === 'list') body.innerHTML = viewList();
    else if (v === 'stats') body.innerHTML = viewStats();
    else if (v === 'detail') body.innerHTML = viewDetail();
    else if (v === 'form') { if (!$('#alumniForm', body)) { body.innerHTML = viewForm(); bindForm(); } return; }
    bindRows();
  }
  const demoBadge = () => (S.demo ? '<span class="badge-demo">Data contoh</span>' : '');
  function inBounds() { const b = map.getBounds(); return S.filtered.filter((a) => b.contains([a.lat, a.lng])); }
  function sortByDistance(arr) {
    const c = S.me ? L.latLng(S.me) : map.getCenter();
    return arr.map((a) => ({ a, d: c.distanceTo([a.lat, a.lng]) })).sort((x, y) => x.d - y.d);
  }
  function rowHTML(a, d) {
    const col = unitColor(a.unit);
    return `<li><button class="row" data-id="${a.id}">
      <span class="av" style="background:${col}">${esc(initials(a.nama))}</span>
      <span class="row-main"><b>${esc(a.nama)}</b>
        <span class="meta"><span>Lulus ${a.tahun_lulus}</span><span>${esc(a.unit)}</span>${a.asrama ? `<span>${esc(a.asrama)}</span>` : ''}</span>
        <span class="meta" style="display:block">${esc([a.kota, a.provinsi].filter(Boolean).join(', ') || fmtCoord(a.lat, a.lng))}</span>
        ${a.pekerjaan ? `<span class="tag" style="background:${col}1A;color:${col}">${esc(a.pekerjaan)}</span>` : ''}
      </span>${d != null && S.me ? `<span class="row-dist">${fmtKm(d)}</span>` : ''}</button></li>`;
  }
  function viewExplore() {
    const vis = sortByDistance(inBounds());
    const prov = new Set(S.filtered.map((a) => a.provinsi).filter(Boolean));
    const head = S.all.length
      ? `<h2>${vis.length} alumni di area ini ${demoBadge()}</h2><p>${S.filtered.length} alumni${filterActive() || S.q ? ' sesuai filter' : ''} · ${prov.size} wilayah</p>`
      : `<h2>Belum ada alumni di peta ${demoBadge()}</h2><p>Jadilah yang pertama menandai lokasi Anda.</p>`;
    const units = counts('unit');
    return `<div class="sec-head">${head}</div>
      <div class="quick">
        <button class="qcard" data-go="list"><b>${S.filtered.length}</b><small>Total alumni</small></button>
        <button class="qcard" data-go="stats"><b>${prov.size}</b><small>Wilayah</small></button>
        <button class="qcard" data-go="stats"><b>${new Set(S.filtered.map((a) => a.tahun_lulus)).size}</b><small>Angkatan</small></button>
        <button class="qcard" data-go="stats"><b>${units.size}</b><small>Unit</small></button>
      </div>
      ${vis.length ? `<ul class="list">${vis.slice(0, S.listLimit).map((x) => rowHTML(x.a, x.d)).join('')}</ul>${vis.length > S.listLimit ? '<button class="more" data-more>Tampilkan lebih banyak</button>' : ''}`
        : `<div class="empty">${ICON.pin}<p>Tidak ada alumni di area peta ini.<br/>Geser atau perkecil peta.</p></div>`}`;
  }
  function viewList() {
    const arr = S.filtered.slice().sort((a, b) => a.nama.localeCompare(b.nama));
    return `<div class="sec-head"><h2>Daftar alumni ${demoBadge()}</h2><p>${arr.length} alumni${filterActive() || S.q ? ' sesuai filter' : ''}</p></div>
      ${arr.length ? `<ul class="list">${arr.slice(0, S.listLimit).map((a) => rowHTML(a)).join('')}</ul>${arr.length > S.listLimit ? '<button class="more" data-more>Tampilkan lebih banyak</button>' : ''}`
        : `<div class="empty">${ICON.group}<p>Belum ada alumni yang cocok.</p><button class="btn-tonal" data-go="form">Tambah lokasi saya</button></div>`}`;
  }
  function bars(key, title, color, limit = 10, labelFn = (k) => k) {
    const m = new Map(); for (const a of S.filtered) { const v = a[key] || '—'; m.set(v, (m.get(v) || 0) + 1); }
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit); const max = arr[0] ? arr[0][1] : 1;
    return `<div class="stat-block"><h3>${title}</h3>${arr.map(([k, n]) => `<button class="bar" data-f="${key}" data-v="${esc(k)}"><span class="lbl">${esc(labelFn(k))}</span>
      <span class="trk"><span class="fil" style="width:${(n / max) * 100}%;background:${typeof color === 'function' ? color(k) : color}"></span></span><span class="num">${n}</span></button>`).join('') || '<p class="empty">Belum ada data.</p>'}</div>`;
  }
  function viewStats() {
    const dec = S.filtered.reduce((m, a) => { const d = Math.floor(a.tahun_lulus / 10) * 10; m[d] = (m[d] || 0) + 1; return m; }, {});
    const decArr = Object.entries(dec).sort((a, b) => a[0] - b[0]); const max = Math.max(1, ...decArr.map((x) => x[1]));
    return `<div class="sec-head"><h2>Statistik alumni ${demoBadge()}</h2><p>${S.filtered.length} alumni${filterActive() ? ' sesuai filter' : ''}. Ketuk baris untuk memfilter.</p></div>
      ${bars('provinsi', 'Sebaran wilayah', '#1A73E8', 12)}
      ${bars('unit', 'Unit pendidikan', unitColor, 12)}
      ${bars('asrama', 'Asrama', '#9334E6', 12)}
      <div class="stat-block"><h3>Lulusan per dekade</h3>${decArr.map(([d, n]) => `<div class="bar"><span class="lbl">${d}-an</span><span class="trk"><span class="fil" style="width:${(n / max) * 100}%;background:#0B8043"></span></span><span class="num">${n}</span></div>`).join('') || '<p class="empty">Belum ada data.</p>'}</div>`;
  }
  function viewDetail() {
    const a = S.all.find((x) => x.id === S.selected); if (!a) return '';
    const col = unitColor(a.unit); const mine = S.mine && S.mine.id === a.id;
    const dist = S.me ? fmtKm(L.latLng(S.me).distanceTo([a.lat, a.lng])) + ' dari Anda' : '';
    const wa = a.whatsapp ? a.whatsapp.replace(/^0/, '62').replace(/^\+/, '') : '';
    return `<div class="detail-hero"><button class="icon-btn detail-close" data-close>${ICON.close}</button>
        <span class="detail-av" style="background:${col}">${esc(initials(a.nama))}</span></div>
      <div class="detail-head"><h2>${esc(a.nama)}</h2><p>Alumni ${esc(a.unit)} · Lulus ${a.tahun_lulus}${dist ? ' · ' + dist : ''}</p></div>
      <div class="actions">
        <a class="act primary" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}"><span>${ICON.dir}</span>Rute</a>
        ${wa ? `<a class="act wa" target="_blank" rel="noopener" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent('Assalamu\'alaikum, saya alumni Mamba\'ul Ulum. Salam kenal!')}"><span>${ICON.wa}</span>WhatsApp</a>` : ''}
        <button class="act" data-share><span>${ICON.share}</span>Bagikan</button>
        <button class="act" data-zoom><span>${ICON.pin}</span>Perbesar</button>
        ${mine ? `<button class="act" data-go="form"><span>${ICON.edit}</span>Ubah</button>` : ''}
      </div>
      <ul class="info">
        <li>${ICON.map}<div>${esc([a.kota, a.provinsi].filter(Boolean).join(', ') || 'Lokasi tidak disebutkan')}<small>${a.lokasi_samar ? 'Lokasi perkiraan (±1 km)' : 'Lokasi tepat'}</small></div></li>
        <li>${ICON.cap}<div>${esc(a.unit)}<small>${a.tahun_masuk ? `Angkatan ${a.tahun_masuk} – ${a.tahun_lulus}` : `Lulus tahun ${a.tahun_lulus}`}</small></div></li>
        ${a.asrama ? `<li>${ICON.home}<div>${esc(a.asrama)}<small>Asrama</small></div></li>` : ''}
        ${a.pekerjaan || a.instansi ? `<li>${ICON.work}<div>${esc(a.pekerjaan || '')}${a.instansi ? `<small>${esc(a.instansi)}</small>` : ''}</div></li>` : ''}
        <li>${ICON.coord}<div><span style="font-family:ui-monospace,monospace">${fmtCoord(a.lat, a.lng)}</span><small>Koordinat · ketuk untuk menyalin</small></div></li>
      </ul>
      ${mine ? '<p class="note">Ini data Anda. Anda bisa mengubah atau menghapusnya dari perangkat ini.</p>' : ''}`;
  }

  function bindRows() {
    $$('.row', body).forEach((b) => b.addEventListener('click', () => openDetail(+b.dataset.id, true)));
    $$('[data-go]', body).forEach((b) => b.addEventListener('click', () => setView(b.dataset.go)));
    const more = $('[data-more]', body); if (more) more.onclick = () => { S.listLimit += 60; const st = body.scrollTop; renderView(); body.scrollTop = st; };
    $$('.bar[data-f]', body).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.f, v = b.dataset.v; S.filters[k] = new Set([v]); applyFilters(); fitToFiltered(); toast(`Filter: ${v}`);
    }));
    const close = $('[data-close]', body); if (close) close.onclick = () => setView(S.prevView || 'explore');
    const share = $('[data-share]', body); if (share) share.onclick = () => shareLink(S.selected);
    const zoom = $('[data-zoom]', body); if (zoom) zoom.onclick = () => { const a = S.all.find((x) => x.id === S.selected); flyTo(a, 16); };
    const co = $('.info li:last-child', body); if (co && S.view === 'detail') co.style.cursor = 'pointer', co.onclick = () => {
      const a = S.all.find((x) => x.id === S.selected); copy(fmtCoord(a.lat, a.lng)).then(() => toast('Koordinat disalin'));
    };
  }
  function flyTo(a, z) {
    if (!a) return;
    const zoom = z || Math.max(map.getZoom(), 13);
    if (isDesktop()) { const p = map.project([a.lat, a.lng], zoom).subtract([212, 0]); map.flyTo(map.unproject(p, zoom), zoom, { duration: .8 }); }
    else { const p = map.project([a.lat, a.lng], zoom).add([0, sheet.offsetHeight * 0.22]); map.flyTo(map.unproject(p, zoom), zoom, { duration: .8 }); }
  }
  function openDetail(id, fly) {
    const a = S.all.find((x) => x.id === id); if (!a) return;
    S.selected = id; highlight(id);
    setView('detail');
    history.replaceState(null, '', '#a=' + id);
    if (fly) {
      const m = markers.get(id);
      if (m && cluster.hasLayer(m)) cluster.zoomToShowLayer(m, () => flyTo(a)); else flyTo(a);
    }
  }
  function shareLink(id) {
    const url = location.origin + location.pathname + (id ? '#a=' + id : '');
    const a = id && S.all.find((x) => x.id === id);
    const text = a ? `${a.nama} — alumni ${C.namaPondok}` : `Peta Alumni ${C.namaPondok}`;
    if (navigator.share) navigator.share({ title: 'Peta Alumni', text, url }).catch(() => {});
    else copy(url).then(() => toast('Tautan disalin'));
  }
  function copy(t) { return navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.resolve(); }
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 3200); }

  // ================= FORM =================
  function viewForm() {
    const mine = S.mine && S.all.find((x) => x.id === S.mine.id);
    const a = mine || {};
    const cy = new Date().getFullYear();
    const years = (sel) => { let o = '<option value="">Pilih tahun</option>'; for (let y = cy; y >= 1950; y--) o += `<option ${+sel === y ? 'selected' : ''}>${y}</option>`; return o; };
    return `<form class="form" id="alumniForm" novalidate>
      <h2>${mine ? 'Perbarui data saya' : 'Tambah lokasi saya'}</h2>
      <p class="lead">Tandai di mana Anda berada sekarang agar sahabat sesama alumni ${esc(C.namaPondok)} bisa saling menemukan.</p>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <p class="fgroup">Identitas</p>
      <div class="field"><label>Nama lengkap *</label><input name="nama" required maxlength="120" value="${esc(a.nama || '')}" autocomplete="name" /></div>
      <div class="two">
        <div class="field"><label>Tahun masuk</label><select name="tahun_masuk">${years(a.tahun_masuk)}</select></div>
        <div class="field"><label>Tahun lulus *</label><select name="tahun_lulus" required>${years(a.tahun_lulus)}</select></div>
      </div>
      <div class="field"><label>Unit pendidikan *</label><select name="unit" required><option value="">Pilih unit</option>${C.unit.map((u) => `<option ${a.unit === u.nama ? 'selected' : ''}>${esc(u.nama)}</option>`).join('')}</select></div>
      <div class="field"><label>Asrama</label><input name="asrama" list="dlAsrama" maxlength="80" value="${esc(a.asrama || '')}" placeholder="Pilih atau ketik" /></div>
      <datalist id="dlAsrama">${C.asrama.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="two">
        <div class="field"><label>Pekerjaan / aktivitas</label><input name="pekerjaan" maxlength="120" value="${esc(a.pekerjaan || '')}" /></div>
        <div class="field"><label>Instansi / lembaga</label><input name="instansi" maxlength="160" value="${esc(a.instansi || '')}" /></div>
      </div>
      <div class="field"><label>No. WhatsApp (opsional, tampil publik)</label><input name="whatsapp" inputmode="tel" maxlength="20" value="${esc(a.whatsapp || '')}" placeholder="08xxxxxxxxxx" /></div>

      <p class="fgroup">Lokasi saat ini</p>
      <div class="loc-box">
        <div class="loc-btns">
          <button type="button" class="btn-tonal" id="btnGps">${ICON.gps}Deteksi GPS</button>
          <button type="button" class="btn-outline" id="btnPick">${ICON.pin}Pilih di peta</button>
        </div>
        <div class="two">
          <div class="field"><label>Latitude *</label><input name="lat" inputmode="decimal" placeholder="-7.250445" value="${a.lat ?? ''}" /></div>
          <div class="field"><label>Longitude *</label><input name="lng" inputmode="decimal" placeholder="112.768845" value="${a.lng ?? ''}" /></div>
        </div>
        <div class="two">
          <div class="field"><label>Kota / kabupaten</label><input name="kota" maxlength="120" value="${esc(a.kota || '')}" /></div>
          <div class="field"><label>Provinsi</label><input name="provinsi" list="dlProv" maxlength="80" value="${esc(a.provinsi || '')}" /></div>
        </div>
        <datalist id="dlProv">${C.provinsi.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
        <small style="color:var(--g-muted)" id="locHint">Kota & provinsi terisi otomatis setelah lokasi ditentukan.</small>
      </div>
      <label class="check"><input type="checkbox" name="lokasi_samar" ${a.lokasi_samar === false ? '' : 'checked'} />
        <span>Samarkan lokasi (±1 km)<small>Disarankan. Titik di peta dibulatkan sehingga alamat rumah tidak terlihat persis.</small></span></label>
      <label class="check"><input type="checkbox" name="setuju" ${mine ? 'checked' : ''} />
        <span>Saya setuju data di atas ditampilkan untuk publik di peta alumni.</span></label>
      <p class="form-msg" id="formMsg"></p>
      <button class="btn-primary btn-block" type="submit" id="btnSubmit">${mine ? 'Simpan perubahan' : 'Simpan ke peta'}</button>
      ${mine ? '<button type="button" class="btn-danger btn-block" id="btnDelete" style="margin-top:8px">Hapus data saya</button>' : ''}
      ${S.demo ? '<p class="note">Mode data contoh: data yang Anda simpan hanya tersimpan di perangkat ini.</p>' : ''}
    </form>`;
  }
  let formMarker = null;
  function clearFormMarker() { if (formMarker) { map.removeLayer(formMarker); formMarker = null; } }
  function setFormLoc(lat, lng, reverse = true) {
    const f = $('#alumniForm'); if (!f) return;
    f.lat.value = (+lat).toFixed(6); f.lng.value = (+lng).toFixed(6);
    showFormMarker();
    if (reverse) reverseGeocode(lat, lng);
  }
  function showFormMarker() {
    const f = $('#alumniForm'); if (!f) return;
    const lat = parseFloat(f.lat.value), lng = parseFloat(f.lng.value);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { if (formMarker) map.removeLayer(formMarker); formMarker = null; return; }
    const icon = L.divIcon({ className: '', iconSize: [40, 52], iconAnchor: [20, 52], html: '<svg viewBox="0 0 40 52" width="40" height="52"><path d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z" fill="#EA4335"/><circle cx="20" cy="20" r="7" fill="#7A1C14"/></svg>' });
    if (!formMarker) formMarker = L.marker([lat, lng], { icon, zIndexOffset: 2000 }).addTo(map); else formMarker.setLatLng([lat, lng]);
  }
  async function reverseGeocode(lat, lng) {
    const hint = $('#locHint'); if (hint) hint.textContent = 'Mencari nama daerah…';
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=id`);
      const j = await r.json(); const ad = j.address || {}; const f = $('#alumniForm'); if (!f) return;
      const kota = ad.city || ad.regency || ad.county || ad.town || ad.municipality || ad.village || '';
      let prov = ad.state || ad.province || ad.region || '';
      if (ad.country_code && ad.country_code !== 'id') prov = 'Luar Negeri';
      if (kota) f.kota.value = ad.country_code && ad.country_code !== 'id' ? `${kota}, ${ad.country || ''}`.replace(/, $/, '') : kota;
      if (prov) f.provinsi.value = matchProv(prov);
      if (hint) hint.textContent = kota || prov ? `Terdeteksi: ${[kota, prov].filter(Boolean).join(', ')}. Ubah jika kurang tepat.` : 'Nama daerah tidak ditemukan, silakan isi manual.';
    } catch (e) { if (hint) hint.textContent = 'Nama daerah tidak bisa dideteksi, silakan isi manual.'; }
  }
  function matchProv(p) {
    const n = p.toLowerCase().replace(/^(provinsi|daerah khusus ibukota|daerah khusus)\s+/, '');
    const hit = C.provinsi.find((x) => x.toLowerCase() === p.toLowerCase()) || C.provinsi.find((x) => x.toLowerCase().includes(n) || n.includes(x.toLowerCase()));
    return hit || p;
  }
  function getGPS() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('Perangkat tidak mendukung GPS.'));
      navigator.geolocation.getCurrentPosition((p) => res(p), (e) => rej(new Error(
        e.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser.' : e.code === 3 ? 'Waktu habis saat mencari lokasi.' : 'Lokasi tidak bisa didapatkan.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    });
  }
  function bindForm() {
    const f = $('#alumniForm'); const msg = $('#formMsg');
    showFormMarker();
    if (formMarker) map.flyTo(formMarker.getLatLng(), 13, { duration: .6 });
    f.lat.addEventListener('change', showFormMarker); f.lng.addEventListener('change', showFormMarker);
    f.lng.addEventListener('blur', () => { const la = parseFloat(f.lat.value), ln = parseFloat(f.lng.value); if (isFinite(la) && isFinite(ln) && !f.kota.value) reverseGeocode(la, ln); });
    $('#btnGps').onclick = async () => {
      const b = $('#btnGps'); b.disabled = true; b.lastChild.textContent = 'Mencari…';
      try {
        const p = await getGPS(); const { latitude: la, longitude: ln, accuracy } = p.coords;
        setFormLoc(la, ln); setMe(la, ln, accuracy);
        map.flyTo([la, ln], 15, { duration: .8 }); toast(`Lokasi ditemukan (akurasi ±${Math.round(accuracy)} m)`);
      } catch (e) { msg.textContent = e.message; }
      b.disabled = false; b.lastChild.textContent = 'Deteksi GPS';
    };
    $('#btnPick').onclick = startPick;
    const del = $('#btnDelete');
    if (del) del.onclick = async () => {
      if (!confirm('Hapus data Anda dari peta alumni?')) return;
      try {
        if (!S.demo) {
          const r = await fetch(`${API}?id=${S.mine.id}`, { method: 'DELETE', headers: { 'x-edit-token': S.mine.token } });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal menghapus.');
        }
        S.all = S.all.filter((x) => x.id !== S.mine.id); S.mine = null; LS.del('mu_my_entry');
        endPick(true); clearFormMarker(); body.innerHTML = ''; S.view = 'explore'; applyFilters(); setView('explore'); toast('Data Anda telah dihapus.');
      } catch (e) { msg.textContent = e.message; }
    };
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.textContent = '';
      const d = Object.fromEntries(new FormData(f).entries());
      d.lokasi_samar = f.lokasi_samar.checked;
      const lat = parseFloat(String(d.lat).replace(',', '.')), lng = parseFloat(String(d.lng).replace(',', '.'));
      if (!d.nama || d.nama.trim().length < 2) return (msg.textContent = 'Nama wajib diisi.', f.nama.focus());
      if (!d.tahun_lulus) return (msg.textContent = 'Tahun lulus wajib dipilih.');
      if (d.tahun_masuk && +d.tahun_masuk > +d.tahun_lulus) return (msg.textContent = 'Tahun masuk tidak boleh setelah tahun lulus.');
      if (!d.unit) return (msg.textContent = 'Unit pendidikan wajib dipilih.');
      if (!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lng) || lng < -180 || lng > 180) return (msg.textContent = 'Lokasi belum valid. Gunakan Deteksi GPS, Pilih di peta, atau isi latitude/longitude.');
      if (!f.setuju.checked) return (msg.textContent = 'Centang persetujuan tampil publik terlebih dahulu.');
      d.lat = lat; d.lng = lng; delete d.setuju;
      const btn = $('#btnSubmit'); btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        let id, token;
        if (S.demo) {
          id = S.mine ? S.mine.id : Date.now(); token = 'demo';
          if (d.lokasi_samar) { d.lat = Math.round(d.lat * 100) / 100; d.lng = Math.round(d.lng * 100) / 100; }
        } else if (S.mine) {
          const r = await fetch(`${API}?id=${S.mine.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-edit-token': S.mine.token }, body: JSON.stringify(d) });
          const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Gagal menyimpan.');
          id = S.mine.id; token = S.mine.token;
        } else {
          const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
          const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Gagal menyimpan.');
          id = +j.id; token = j.edit_token;
        }
        if (d.lokasi_samar) { d.lat = Math.round(d.lat * 100) / 100; d.lng = Math.round(d.lng * 100) / 100; }
        S.mine = { id, token }; LS.set('mu_my_entry', S.mine);
        const rec = normalize({ ...d, id, tahun_masuk: d.tahun_masuk || null, whatsapp: d.whatsapp || null, created_at: new Date().toISOString() });
        S.all = S.all.filter((x) => x.id !== id).concat(rec);
        endPick(true); clearFormMarker(); body.innerHTML = '';
        applyFilters(); openDetail(id, true);
        toast('Alhamdulillah, lokasi Anda tersimpan di peta.');
      } catch (err) { msg.textContent = err.message; btn.disabled = false; btn.textContent = 'Simpan ke peta'; }
    });
  }

  // pick on map
  function startPick() {
    const pick = $('#pick'); pick.classList.remove('hidden');
    sheet.style.visibility = 'hidden'; $('.topbar').style.visibility = 'hidden'; $('#nav').style.visibility = 'hidden'; $('#fabBottom').style.visibility = 'hidden';
    if (formMarker) { map.removeLayer(formMarker); formMarker = null; }
    const f = $('#alumniForm'); const la = parseFloat(f.lat.value), ln = parseFloat(f.lng.value);
    if (isFinite(la) && isFinite(ln)) map.setView([la, ln], Math.max(map.getZoom(), 15));
    else if (S.me) map.setView(S.me, 15);
    const upd = () => { const c = map.getCenter(); $('#pickCoord').textContent = fmtCoord(c.lat, c.lng); };
    const ms = () => pick.classList.add('moving'), me = () => pick.classList.remove('moving');
    upd(); map.on('move', upd); map.on('movestart', ms); map.on('moveend', me);
    S._pick = { upd, ms, me };
  }
  function endPick(silent) {
    const pick = $('#pick'); if (pick.classList.contains('hidden')) return;
    pick.classList.add('hidden');
    sheet.style.visibility = ''; $('.topbar').style.visibility = ''; $('#nav').style.visibility = ''; $('#fabBottom').style.visibility = '';
    if (S._pick) { map.off('move', S._pick.upd); map.off('movestart', S._pick.ms); map.off('moveend', S._pick.me); S._pick = null; }
  }
  $('#pickOk').onclick = () => { const c = map.getCenter(); endPick(false); setFormLoc(c.lat, c.lng); setSheet('full'); };
  $('#pickCancel').onclick = () => { endPick(false); showFormMarker(); setSheet('full'); };

  // ================= MY LOCATION =================
  let meMarker = null, meCircle = null;
  function setMe(lat, lng, acc) {
    S.me = [lat, lng];
    if (!meMarker) {
      meCircle = L.circle([lat, lng], { radius: acc || 30, color: '#1A73E8', weight: 1, fillColor: '#1A73E8', fillOpacity: .12, interactive: false }).addTo(map);
      meMarker = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1500 }).addTo(map);
    } else { meMarker.setLatLng([lat, lng]); meCircle.setLatLng([lat, lng]).setRadius(acc || 30); }
    $('#btnLocate').classList.add('active');
  }
  $('#btnLocate').onclick = async () => {
    try { const p = await getGPS(); setMe(p.coords.latitude, p.coords.longitude, p.coords.accuracy); map.flyTo(S.me, 13, { duration: .8 }); }
    catch (e) { toast(e.message); }
  };

  // ================= SEARCH =================
  const q = $('#q'), sug = $('#suggest');
  let sugT = 0;
  q.addEventListener('input', () => {
    S.q = q.value; $('#btnClearQ').classList.toggle('hidden', !q.value);
    clearTimeout(sugT); sugT = setTimeout(() => { applyFilters(); renderSuggest(); }, 160);
  });
  q.addEventListener('focus', renderSuggest);
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const first = $('.sg-item', sug); if (first) first.click(); } if (e.key === 'Escape') { sug.classList.add('hidden'); q.blur(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('#searchbox')) sug.classList.add('hidden'); if (!e.target.closest('.fab-stack.top')) $('#layerPop').classList.add('hidden'); });
  $('#btnClearQ').onclick = () => { q.value = ''; S.q = ''; $('#btnClearQ').classList.add('hidden'); sug.classList.add('hidden'); applyFilters(); };
  function renderSuggest() {
    const v = q.value.trim();
    if (!v) { sug.classList.add('hidden'); return; }
    const hits = S.filtered.slice(0, 6);
    sug.innerHTML = hits.map((a) => `<button class="sg-item" data-id="${a.id}"><span class="sg-ico" style="background:${unitColor(a.unit)};color:#fff">${ICON.person}</span>
        <span><b>${esc(a.nama)}</b><small>${esc(a.unit)} · Lulus ${a.tahun_lulus} · ${esc(a.kota || a.provinsi || '')}</small></span></button>`).join('') +
      `<button class="sg-item" data-place><span class="sg-ico">${ICON.search}</span><span><b>Cari tempat "${esc(v)}"</b><small>Pindahkan peta ke lokasi ini</small></span></button>` +
      (S.filtered.length ? `<button class="sg-item" data-all><span class="sg-ico">${ICON.group}</span><span><b>Lihat semua ${S.filtered.length} hasil</b><small>Daftar alumni sesuai pencarian</small></span></button>` : '');
    sug.classList.remove('hidden');
    $$('.sg-item[data-id]', sug).forEach((b) => b.onclick = () => { sug.classList.add('hidden'); q.blur(); openDetail(+b.dataset.id, true); });
    const all = $('[data-all]', sug); if (all) all.onclick = () => { sug.classList.add('hidden'); q.blur(); setView('list'); };
    $('[data-place]', sug).onclick = () => searchPlace(v);
  }
  async function searchPlace(v) {
    sug.classList.add('hidden'); q.blur();
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=id&q=${encodeURIComponent(v)}`);
      const j = await r.json();
      if (!j.length) return toast('Tempat tidak ditemukan.');
      const p = j[0];
      // tempat bukan nama alumni: kosongkan pencarian teks agar alumni sekitar terlihat
      q.value = ''; S.q = ''; $('#btnClearQ').classList.add('hidden'); applyFilters();
      if (p.boundingbox) map.flyToBounds([[+p.boundingbox[0], +p.boundingbox[2]], [+p.boundingbox[1], +p.boundingbox[3]]], { duration: .9, maxZoom: 14 });
      else map.flyTo([+p.lat, +p.lon], 13);
      toast(p.display_name.split(',').slice(0, 2).join(','));
      setView('explore');
    } catch (e) { toast('Pencarian tempat gagal.'); }
  }

  // ================= UI WIRING =================
  $$('.chip[data-filter]').forEach((b) => b.addEventListener('click', () => openFilter(b.dataset.filter)));
  $('#chipReset').onclick = () => { const f = S.filters; f.tahunDari = f.tahunSampai = null; f.provinsi.clear(); f.unit.clear(); f.asrama.clear(); applyFilters(); };
  $('#scrim').onclick = () => { hideDialog(); closeDrawer(); };
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.view === S.view && !isDesktop()) { setSheet(sheet.dataset.state === 'peek' ? 'half' : 'peek'); return; }
    setView(b.dataset.view);
  }));
  $('#btnAdd').onclick = () => setView('form');
  $('#btnLayers').onclick = (e) => { e.stopPropagation(); $('#layerPop').classList.toggle('hidden'); };
  $$('#layerPop [data-layer]').forEach((b) => b.onclick = () => { setLayer(b.dataset.layer); $('#layerPop').classList.add('hidden'); });
  const drawer = $('#drawer');
  function openDrawer() { drawer.classList.add('open'); $('#scrim').classList.remove('hidden'); }
  function closeDrawer() { drawer.classList.remove('open'); if ($('#dialog').classList.contains('hidden')) $('#scrim').classList.add('hidden'); }
  $('#btnMenu').onclick = openDrawer;
  $$('.drawer-item').forEach((b) => b.onclick = () => {
    closeDrawer(); const act = b.dataset.act;
    if (act === 'intro') { window.Intro.play(); }
    if (act === 'form') setView('form');
    if (act === 'share') shareLink(null);
    if (act === 'privacy') {
      $('#dialog').innerHTML = `<div class="dlg-head"><h3>Privasi data</h3><button class="icon-btn" data-x>${ICON.close}</button></div><div class="dlg-body" style="padding:0 20px 16px;line-height:1.6;color:var(--g-text-2)">
        <p>Data diisi sendiri oleh alumni dan ditampilkan publik di peta ini.</p>
        <p>Jika "Samarkan lokasi" dicentang, koordinat dibulatkan ±1 km <b>sebelum disimpan</b>, sehingga titik asli tidak pernah tersimpan di server.</p>
        <p>Nomor WhatsApp bersifat opsional dan hanya tampil jika Anda mengisinya.</p>
        <p>Data dapat diubah atau dihapus dari perangkat yang sama yang digunakan saat mengisi. Untuk bantuan, hubungi pengurus ikatan alumni.</p></div>`;
      showDialog(); $('[data-x]', $('#dialog')).onclick = hideDialog;
    }
  });

  let moveT = 0;
  function onMoveEnd() { if (S.view === 'explore') { clearTimeout(moveT); moveT = setTimeout(() => { const st = body.scrollTop; renderView(); body.scrollTop = st; }, 150); } }
  map.on('moveend', onMoveEnd);
  window.addEventListener('resize', updateFab);

  function enterApp() {
    $('#app').setAttribute('aria-hidden', 'false');
    map.invalidateSize();
    const m = location.hash.match(/a=(\d+)/);
    if (m) { openDetail(+m[1], true); return; }
    if (S.all.length && !filterActive()) {
      const b = L.latLngBounds(S.all.map((a) => [a.lat, a.lng]));
      map.flyToBounds(b, { padding: [40, 40], maxZoom: 9, duration: 1.4, paddingTopLeft: isDesktop() ? [500, 80] : [30, 130], paddingBottomRight: isDesktop() ? [40, 40] : [30, 200] });
    }
  }
  window.Intro.onStart = enterApp;

  setView('explore');
  load().then(() => { if ($('#intro').classList.contains('hidden')) enterApp(); });
})();
