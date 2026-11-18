(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DEF = window.APP_CONFIG;
  const I = {
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    add: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>'
  };
  const COLS = ['nama', 'tahun_masuk', 'tahun_lulus', 'unit', 'asrama', 'provinsi', 'kota', 'pekerjaan', 'instansi', 'whatsapp', 'lat', 'lng', 'lokasi_samar'];

  const S = {
    key: null, tab: 'data', rows: [], settings: null,
    q: '', status: 'semua', unit: '', sort: { k: 'created_at', dir: -1 }, page: 0, per: 50, sel: new Set()
  };
  try { S.key = sessionStorage.getItem('mu_admin_key'); } catch (e) {}

  // ---------------- API ----------------
  async function api(path, opts = {}) {
    const r = await fetch('/api/admin?' + path, {
      ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-key': S.key || '', ...(opts.headers || {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { logout(); throw new Error(j.error || 'Sesi berakhir, silakan masuk lagi.'); }
    if (!r.ok) throw new Error(j.error || 'Gagal (' + r.status + ')');
    return j;
  }
  async function loadAll() {
    const [a, c] = await Promise.all([api('r=alumni'), fetch('/api/config').then((r) => r.json())]);
    S.rows = (a.data || []).map((x) => ({ ...x, id: +x.id, lat: +x.lat, lng: +x.lng }));
    S.settings = c.data || { unit: DEF.unit, asrama: DEF.asrama, perlu_persetujuan: false, lokasi_pondok: null };
    updatePendingCount();
  }
  const unitColor = (u) => ((S.settings && S.settings.unit.find((x) => x.nama === u)) || {}).warna || '#5F6368';
  function updatePendingCount() { const n = S.rows.filter((r) => !r.approved).length; $('#cntPending').textContent = n ? n : ''; }

  // ---------------- LOGIN ----------------
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const err = $('#loginErr'); err.textContent = '';
    S.key = $('#pw').value;
    try {
      await api('r=ping');
      try { sessionStorage.setItem('mu_admin_key', S.key); } catch (x) {}
      await start();
    } catch (x) { err.textContent = x.message; S.key = null; }
  });
  function logout() {
    S.key = null; try { sessionStorage.removeItem('mu_admin_key'); } catch (e) {}
    $('#shell').classList.add('hidden'); $('#login').classList.remove('hidden'); $('#pw').value = '';
  }
  $('#btnLogout').onclick = logout;
  async function start() {
    $('#login').classList.add('hidden'); $('#shell').classList.remove('hidden');
    $('#content').innerHTML = '<p class="empty">Memuat data…</p>';
    try { await loadAll(); render(); } catch (e) { $('#content').innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }

  // ---------------- NAV ----------------
  $$('.nav').forEach((b) => b.onclick = () => {
    if (S.dirty && !confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?')) return;
    S.dirty = false; killMM(); S.tab = b.dataset.tab; $$('.nav').forEach((x) => x.classList.toggle('active', x === b));
    $('#sidenav').classList.remove('open'); render(); window.scrollTo(0, 0);
  });
  $('#btnNav').onclick = () => $('#sidenav').classList.toggle('open');
  function render() {
    if (S.tab === 'data') renderData();
    if (S.tab === 'unit') renderListEditor('unit');
    if (S.tab === 'asrama') renderListEditor('asrama');
    if (S.tab === 'pengaturan') renderSettings();
  }

  // ---------------- DATA ALUMNI ----------------
  function filtered() {
    const q = S.q.trim().toLowerCase();
    let a = S.rows.filter((r) =>
      (S.status === 'semua' || (S.status === 'tampil' ? r.approved : !r.approved)) &&
      (!S.unit || r.unit === S.unit) &&
      (!q || [r.nama, r.kota, r.provinsi, r.asrama, r.pekerjaan, r.instansi, r.whatsapp, String(r.tahun_lulus)].some((v) => v && String(v).toLowerCase().includes(q))));
    const { k, dir } = S.sort;
    a.sort((x, y) => { const p = x[k] ?? '', q2 = y[k] ?? ''; return (typeof p === 'number' && typeof q2 === 'number' ? p - q2 : String(p).localeCompare(String(q2))) * dir; });
    return a;
  }
  function renderData() {
    const total = S.rows.length, pend = S.rows.filter((r) => !r.approved).length;
    const prov = new Set(S.rows.map((r) => r.provinsi).filter(Boolean)).size;
    const units = [...new Set(S.settings.unit.map((u) => u.nama).concat(S.rows.map((r) => r.unit)))];
    $('#content').innerHTML = `
      <h2 class="title">Data alumni</h2><p class="sub">Tambah, ubah, setujui, atau hapus data alumni. Impor massal dari CSV/Excel.</p>
      <div class="cards">
        <button class="stat" data-st="semua"><b>${total}</b><small>Total alumni</small></button>
        <button class="stat" data-st="tampil"><b>${total - pend}</b><small>Tampil di peta</small></button>
        <button class="stat ${pend ? 'warn' : ''}" data-st="menunggu"><b>${pend}</b><small>Menunggu / disembunyikan</small></button>
        <div class="stat"><b>${prov}</b><small>Wilayah</small></div>
      </div>
      <div class="panel">
        <div class="toolbar">
          <label class="search">${I.search}<input id="q" placeholder="Cari nama, kota, asrama, pekerjaan…" value="${esc(S.q)}" /></label>
          <select class="sel" id="fStatus">
            <option value="semua">Semua status</option><option value="tampil">Tampil</option><option value="menunggu">Menunggu / disembunyikan</option>
          </select>
          <select class="sel" id="fUnit"><option value="">Semua unit</option>${units.map((u) => `<option ${S.unit === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
          <span class="spacer"></span>
          <button class="btn outline" id="btnImport">${I.upload}Impor CSV</button>
          <button class="btn outline" id="btnExport">${I.download}Ekspor CSV</button>
          <button class="btn primary" id="btnNew">${I.add}Tambah alumni</button>
        </div>
        <div class="bulk hidden" id="bulk"><span id="bulkN"></span><span class="spacer"></span>
          <button class="btn tonal" data-bulk="setujui">Setujui / tampilkan</button>
          <button class="btn outline" data-bulk="sembunyikan">Sembunyikan</button>
          <button class="btn danger" data-bulk="hapus">Hapus</button></div>
        <div id="tableArea"></div>
      </div>`;
    $('#fStatus').value = S.status;
    let t = 0;
    $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; S.page = 0; renderTable(); }, 150); });
    $('#fStatus').onchange = (e) => { S.status = e.target.value; S.page = 0; renderTable(); };
    $('#fUnit').onchange = (e) => { S.unit = e.target.value; S.page = 0; renderTable(); };
    $$('[data-st]').forEach((b) => b.onclick = () => { S.status = b.dataset.st; $('#fStatus').value = S.status; S.page = 0; renderTable(); });
    $('#btnNew').onclick = () => editAlumni(null);
    $('#btnExport').onclick = exportCsv;
    $('#btnImport').onclick = () => $('#fileCsv').click();
    $$('[data-bulk]').forEach((b) => b.onclick = () => bulk(b.dataset.bulk));
    renderTable();
  }
  function renderTable() {
    const all = filtered(); const pages = Math.max(1, Math.ceil(all.length / S.per)); S.page = Math.min(S.page, pages - 1);
    const rows = all.slice(S.page * S.per, (S.page + 1) * S.per);
    for (const id of [...S.sel]) if (!S.rows.some((r) => r.id === id)) S.sel.delete(id);
    const th = (k, l) => `<th data-k="${k}">${l} <span class="arr">${S.sort.k === k ? (S.sort.dir > 0 ? '▲' : '▼') : ''}</span></th>`;
    $('#tableArea').innerHTML = all.length ? `<div class="table-wrap"><table>
      <thead><tr><th class="nosort"><input type="checkbox" id="selAll" ${rows.length && rows.every((r) => S.sel.has(r.id)) ? 'checked' : ''}/></th>
        ${th('nama', 'Nama')}${th('tahun_lulus', 'Lulus')}${th('unit', 'Unit')}${th('asrama', 'Asrama')}${th('provinsi', 'Lokasi')}${th('approved', 'Status')}${th('created_at', 'Didaftarkan')}<th class="nosort"></th></tr></thead>
      <tbody>${rows.map((r) => `<tr data-id="${r.id}">
        <td><input type="checkbox" class="sel1" ${S.sel.has(r.id) ? 'checked' : ''}/></td>
        <td class="nm"><b>${esc(r.nama)}</b><small>${esc([r.pekerjaan, r.instansi].filter(Boolean).join(' · ') || '—')}</small></td>
        <td>${r.tahun_masuk ? r.tahun_masuk + '–' : ''}${r.tahun_lulus}</td>
        <td><span class="dot" style="background:${unitColor(r.unit)}"></span>${esc(r.unit)}</td>
        <td>${esc(r.asrama || '—')}</td>
        <td>${esc([r.kota, r.provinsi].filter(Boolean).join(', ') || '—')}</td>
        <td>${r.approved ? '<span class="chip ok">Tampil</span>' : '<span class="chip wait">Menunggu</span>'}</td>
        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
        <td><div class="row-acts">
          ${r.approved ? '' : `<button class="icon-btn" data-approve title="Setujui">${I.eye}</button>`}
          <button class="icon-btn" data-edit title="Ubah">${I.edit}</button>
          <button class="icon-btn danger" data-del title="Hapus">${I.del}</button></div></td></tr>`).join('')}</tbody></table></div>
      <div class="pager"><span>${S.page * S.per + 1}–${Math.min(all.length, (S.page + 1) * S.per)} dari ${all.length}</span>
        <button class="icon-btn" id="pgPrev" ${S.page ? '' : 'disabled'}>‹</button><button class="icon-btn" id="pgNext" ${S.page < pages - 1 ? '' : 'disabled'}>›</button></div>`
      : `<p class="empty">${S.rows.length ? 'Tidak ada data yang cocok.' : 'Belum ada data alumni. Klik "Tambah alumni" atau "Impor CSV".'}</p>`;
    const area = $('#tableArea');
    $$('th[data-k]', area).forEach((h) => h.onclick = () => { const k = h.dataset.k; S.sort = { k, dir: S.sort.k === k ? -S.sort.dir : 1 }; renderTable(); });
    const sa = $('#selAll', area); if (sa) sa.onchange = () => { rows.forEach((r) => sa.checked ? S.sel.add(r.id) : S.sel.delete(r.id)); renderTable(); };
    $$('tr[data-id]', area).forEach((tr) => {
      const id = +tr.dataset.id; const r = S.rows.find((x) => x.id === id);
      $('.sel1', tr).onchange = (e) => { e.target.checked ? S.sel.add(id) : S.sel.delete(id); updateBulk(); };
      $('[data-edit]', tr).onclick = () => editAlumni(r);
      $('[data-del]', tr).onclick = () => removeAlumni(r);
      const ap = $('[data-approve]', tr); if (ap) ap.onclick = () => bulk('setujui', [id]);
    });
    const pp = $('#pgPrev', area), pn = $('#pgNext', area);
    if (pp) pp.onclick = () => { S.page--; renderTable(); };
    if (pn) pn.onclick = () => { S.page++; renderTable(); };
    updateBulk();
  }
  function updateBulk() { const n = S.sel.size; $('#bulk').classList.toggle('hidden', !n); $('#bulkN').textContent = `${n} dipilih`; }
  async function bulk(aksi, ids) {
    ids = ids || [...S.sel];
    if (aksi === 'hapus' && !confirm(`Hapus ${ids.length} data alumni secara permanen?`)) return;
    try {
      const j = await api('r=alumni', { method: 'PATCH', body: { ids, aksi } });
      if (aksi === 'hapus') S.rows = S.rows.filter((r) => !ids.includes(r.id));
      else S.rows.forEach((r) => { if (ids.includes(r.id)) r.approved = aksi === 'setujui'; });
      S.sel.clear(); updatePendingCount(); renderData(); toast(`${j.diproses} data diproses.`);
    } catch (e) { toast(e.message); }
  }
  async function removeAlumni(r) {
    if (!confirm(`Hapus data "${r.nama}" secara permanen?`)) return;
    try { await api('r=alumni&id=' + r.id, { method: 'DELETE' }); S.rows = S.rows.filter((x) => x.id !== r.id); S.sel.delete(r.id); updatePendingCount(); renderData(); toast('Data dihapus.'); }
    catch (e) { toast(e.message); }
  }

  // ---------------- MODAL ----------------
  function openModal(html) { $('#modal').innerHTML = html; $('#modal').classList.remove('hidden'); $('#scrim').classList.remove('hidden'); $$('[data-x]', $('#modal')).forEach((b) => b.onclick = closeModal); }
  function killMM() { if (S.mm) { try { S.mm.remove(); } catch (e) {} S.mm = null; } }
  function closeModal() { $('#modal').classList.add('hidden'); $('#scrim').classList.add('hidden'); killMM(); }
  $('#scrim').onclick = closeModal;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) closeModal(); });

  function miniMap(el, lat, lng, onPick) {
    const has = isFinite(lat) && isFinite(lng);
    const m = L.map(el, { zoomControl: true, attributionControl: false }).setView(has ? [lat, lng] : DEF.pusatPeta, has ? 12 : 4);
    Basemap.create('default').forEach((l) => l.addTo(m));
    let mk = has ? L.marker([lat, lng]).addTo(m) : null;
    L.Icon.Default.imagePath = 'vendor/images/';
    m.on('click', (e) => { if (mk) mk.setLatLng(e.latlng); else mk = L.marker(e.latlng).addTo(m); onPick(e.latlng.lat, e.latlng.lng); });
    setTimeout(() => m.invalidateSize(), 50);
    return { map: m, set(la, ln) { if (!isFinite(la) || !isFinite(ln)) return; if (mk) mk.setLatLng([la, ln]); else mk = L.marker([la, ln]).addTo(m); m.setView([la, ln], Math.max(m.getZoom(), 11)); }, remove() { m.remove(); } };
  }

  function editAlumni(r) {
    const a = r || { approved: true, lokasi_samar: true };
    const cy = new Date().getFullYear();
    const yrs = (sel) => { let o = '<option value="">—</option>'; for (let y = cy; y >= 1950; y--) o += `<option ${+sel === y ? 'selected' : ''}>${y}</option>`; return o; };
    const units = [...new Set(S.settings.unit.map((u) => u.nama).concat(a.unit ? [a.unit] : []))];
    openModal(`<div class="m-head"><h3>${r ? 'Ubah data alumni' : 'Tambah alumni'}</h3><button class="icon-btn" data-x>${I.close}</button></div>
      <form class="m-body" id="fAl" novalidate>
        <div class="field"><label>Nama lengkap *</label><input name="nama" maxlength="120" value="${esc(a.nama || '')}" required /></div>
        <div class="grid3">
          <div class="field"><label>Tahun masuk</label><select name="tahun_masuk">${yrs(a.tahun_masuk)}</select></div>
          <div class="field"><label>Tahun lulus *</label><select name="tahun_lulus">${yrs(a.tahun_lulus)}</select></div>
          <div class="field"><label>Unit pendidikan *</label><select name="unit"><option value="">—</option>${units.map((u) => `<option ${a.unit === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
        </div>
        <div class="grid2">
          <div class="field"><label>Asrama</label><input name="asrama" list="dlA" maxlength="80" value="${esc(a.asrama || '')}" /></div>
          <div class="field"><label>No. WhatsApp</label><input name="whatsapp" maxlength="20" value="${esc(a.whatsapp || '')}" /></div>
          <div class="field"><label>Pekerjaan / aktivitas</label><input name="pekerjaan" maxlength="120" value="${esc(a.pekerjaan || '')}" /></div>
          <div class="field"><label>Instansi / lembaga</label><input name="instansi" maxlength="160" value="${esc(a.instansi || '')}" /></div>
          <div class="field"><label>Kota / kabupaten</label><input name="kota" maxlength="120" value="${esc(a.kota || '')}" /></div>
          <div class="field"><label>Provinsi</label><input name="provinsi" list="dlP" maxlength="80" value="${esc(a.provinsi || '')}" /></div>
          <div class="field"><label>Latitude *</label><input name="lat" inputmode="decimal" value="${a.lat ?? ''}" /></div>
          <div class="field"><label>Longitude *</label><input name="lng" inputmode="decimal" value="${a.lng ?? ''}" /></div>
        </div>
        <datalist id="dlA">${S.settings.asrama.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
        <datalist id="dlP">${DEF.provinsi.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
        <div class="minimap" id="mm"></div><p class="hint">Klik peta untuk menentukan lokasi.</p>
        <label class="check"><input type="checkbox" name="lokasi_samar" ${a.lokasi_samar === false ? '' : 'checked'} /><span>Samarkan lokasi (±1 km)</span></label>
        <label class="check"><input type="checkbox" name="approved" ${a.approved === false ? '' : 'checked'} /><span>Tampilkan di peta<small>Hapus centang untuk menyembunyikan tanpa menghapus.</small></span></label>
        <p class="err" id="fErr"></p>
      </form>
      <div class="m-foot"><button class="btn text" data-x>Batal</button><button class="btn primary" id="fSave">Simpan</button></div>`);
    const f = $('#fAl');
    killMM();
    S.mm = miniMap($('#mm'), parseFloat(a.lat), parseFloat(a.lng), (la, ln) => { f.lat.value = la.toFixed(6); f.lng.value = ln.toFixed(6); });
    const sync = () => S.mm && S.mm.set(parseFloat(f.lat.value), parseFloat(f.lng.value));
    f.lat.onchange = sync; f.lng.onchange = sync;
    $('#fSave').onclick = async () => {
      const d = Object.fromEntries(new FormData(f).entries());
      d.lokasi_samar = f.lokasi_samar.checked; d.approved = f.approved.checked;
      const btn = $('#fSave'); btn.disabled = true;
      try {
        if (r) { await api('r=alumni&id=' + r.id, { method: 'PUT', body: d }); }
        else { await api('r=alumni', { method: 'POST', body: d }); }
        closeModal(); await loadAll(); renderData(); toast(r ? 'Perubahan disimpan.' : 'Alumni ditambahkan.');
      } catch (e) { $('#fErr').textContent = e.message; btn.disabled = false; }
    };
  }

  // ---------------- CSV ----------------
  function csvCell(v) { const s = v == null ? '' : String(v); return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function download(name, text) {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportCsv() {
    const rows = filtered(); const head = ['id', ...COLS, 'approved', 'created_at'];
    download(`alumni-mambaul-ulum-${new Date().toISOString().slice(0, 10)}.csv`, [head.join(',')].concat(rows.map((r) => head.map((k) => csvCell(r[k])).join(','))).join('\r\n'));
  }
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out.filter((r) => r.some((c) => c.trim() !== ''));
  }
  $('#fileCsv').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return toast('File CSV kosong.');
    const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const alias = { latitude: 'lat', longitude: 'lng', lon: 'lng', long: 'lng', no_wa: 'whatsapp', wa: 'whatsapp', unit_pendidikan: 'unit', tahun_keluar: 'tahun_lulus', kabupaten: 'kota', kota_kabupaten: 'kota' };
    const keys = head.map((h) => alias[h] || h);
    if (!keys.includes('nama') || !keys.includes('tahun_lulus') || !keys.includes('unit') || !keys.includes('lat') || !keys.includes('lng'))
      return importHelp('Kolom wajib tidak ditemukan. Pastikan baris pertama berisi judul kolom.');
    const items = rows.slice(1).map((r) => { const o = {}; keys.forEach((k, i) => { if (COLS.includes(k) || k === 'approved') o[k] = (r[i] ?? '').trim(); }); return o; });
    items.forEach((o) => { if (o.lokasi_samar !== undefined) o.lokasi_samar = !/^(0|false|tidak|no|n)$/i.test(o.lokasi_samar); if (o.approved !== undefined) o.approved = !/^(0|false|tidak|no|n)$/i.test(o.approved); });
    openModal(`<div class="m-head"><h3>Impor ${items.length} baris</h3><button class="icon-btn" data-x>${I.close}</button></div>
      <div class="m-body"><p>Pratinjau 10 baris pertama dari <b>${esc(file.name)}</b>. Baris yang tidak valid akan dilewati dan dilaporkan.</p>
      <div class="preview"><table><thead><tr>${['nama', 'tahun_lulus', 'unit', 'asrama', 'kota', 'lat', 'lng'].map((k) => `<th class="nosort">${k}</th>`).join('')}</tr></thead>
      <tbody>${items.slice(0, 10).map((o) => `<tr>${['nama', 'tahun_lulus', 'unit', 'asrama', 'kota', 'lat', 'lng'].map((k) => `<td>${esc(o[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="err" id="impErr"></p></div>
      <div class="m-foot"><button class="btn text left" id="tplBtn">Unduh template</button><button class="btn text" data-x>Batal</button><button class="btn primary" id="impGo">Impor sekarang</button></div>`);
    $('#tplBtn').onclick = downloadTemplate;
    $('#impGo').onclick = async () => {
      const btn = $('#impGo'); btn.disabled = true; btn.textContent = 'Mengimpor…';
      try {
        let added = 0, fail = [];
        for (let i = 0; i < items.length; i += 2000) {
          const j = await api('r=alumni', { method: 'POST', body: items.slice(i, i + 2000) });
          added += j.ditambah; fail = fail.concat(j.gagal.map((g) => ({ ...g, baris: g.baris + i + 1 })));
        }
        await loadAll(); renderData();
        if (fail.length) {
          openModal(`<div class="m-head"><h3>Impor selesai</h3><button class="icon-btn" data-x>${I.close}</button></div>
            <div class="m-body"><p><b>${added}</b> data ditambahkan. <span class="bad">${fail.length} baris dilewati:</span></p>
            <div class="preview"><table><tbody>${fail.slice(0, 200).map((g) => `<tr><td>Baris ${g.baris}</td><td class="bad">${esc(g.error)}</td></tr>`).join('')}</tbody></table></div></div>
            <div class="m-foot"><button class="btn primary" data-x>Tutup</button></div>`);
        } else { closeModal(); toast(`${added} data berhasil diimpor.`); }
      } catch (err) { $('#impErr').textContent = err.message; btn.disabled = false; btn.textContent = 'Impor sekarang'; }
    };
  });
  function downloadTemplate() {
    download('template-impor-alumni.csv', COLS.join(',') + '\r\n' +
      ['Ahmad Fauzi', 2010, 2013, 'MA', S.settings.asrama[0] || '', 'Jawa Timur', 'Surabaya', 'Guru', 'MI Nurul Huda', '081234567890', -7.2575, 112.7521, 'ya'].map(csvCell).join(','));
  }
  function importHelp(msg) {
    openModal(`<div class="m-head"><h3>Format CSV</h3><button class="icon-btn" data-x>${I.close}</button></div>
      <div class="m-body"><p class="bad">${esc(msg)}</p><p>Baris pertama berisi judul kolom berikut (urutan bebas; pemisah koma atau titik koma):</p>
      <pre class="code">${COLS.join(',')}</pre><p>Wajib: <b>nama, tahun_lulus, unit, lat, lng</b>. Kolom <b>lokasi_samar</b> diisi ya/tidak.</p></div>
      <div class="m-foot"><button class="btn outline" id="tplBtn2">Unduh template</button><button class="btn primary" data-x>Mengerti</button></div>`);
    $('#tplBtn2').onclick = downloadTemplate;
  }

  // ---------------- UNIT / ASRAMA ----------------
  function renderListEditor(kind) {
    const isUnit = kind === 'unit';
    const src = isUnit ? S.settings.unit : S.settings.asrama.map((n) => ({ nama: n }));
    S.edit = src.map((x) => ({ nama: x.nama, warna: x.warna, asli: x.nama }));
    S.dirty = false;
    const cnt = (n) => S.rows.filter((r) => r[kind] === n).length;
    const unlisted = [...new Set(S.rows.map((r) => r[kind]).filter((v) => v && !src.some((x) => x.nama === v)))];
    $('#content').innerHTML = `<h2 class="title">${isUnit ? 'Unit pendidikan' : 'Asrama'}</h2>
      <p class="sub">${isUnit ? 'Daftar unit yang bisa dipilih alumni. Warna dipakai untuk pin di peta.' : 'Daftar asrama yang muncul sebagai pilihan (alumni tetap bisa mengetik nama lain).'} Mengganti nama otomatis memperbarui data alumni yang memakai nama lama.</p>
      <div class="panel editor"><div id="lst"></div>
        <div class="editor-foot"><button class="btn tonal" id="addItem">${I.add}Tambah ${isUnit ? 'unit' : 'asrama'}</button>
          <span class="dirty-note hidden" id="dirty">Belum disimpan</span>
          <span><button class="btn text" id="resetItems">Batalkan</button><button class="btn primary" id="saveItems">Simpan</button></span></div></div>
      ${unlisted.length ? `<p class="sub" style="margin-top:16px">Dipakai alumni tetapi belum ada di daftar: ${unlisted.map((u) => `<button class="btn outline" data-addname="${esc(u)}" style="margin:4px 4px 0 0">${I.add}${esc(u)} (${cnt(u)})</button>`).join('')}</p>` : ''}`;
    const draw = () => {
      $('#lst').innerHTML = S.edit.map((x, i) => `<div class="li" data-i="${i}">
        ${isUnit ? `<input type="color" value="${x.warna || '#5F6368'}" title="Warna pin" />` : ''}
        <input type="text" value="${esc(x.nama)}" placeholder="Nama ${isUnit ? 'unit' : 'asrama'}" maxlength="${isUnit ? 60 : 80}" />
        ${x.asli && x.asli !== x.nama.trim() ? `<span class="renamed">dari "${esc(x.asli)}"</span>` : ''}
        <span class="n">${x.asli ? cnt(x.asli) + ' alumni' : 'baru'}</span>
        <button class="icon-btn" data-up title="Naik" ${i ? '' : 'disabled'}>${I.up}</button>
        <button class="icon-btn" data-down title="Turun" ${i < S.edit.length - 1 ? '' : 'disabled'}>${I.down}</button>
        <button class="icon-btn danger" data-rm title="Hapus">${I.del}</button></div>`).join('') || '<p class="empty">Daftar kosong.</p>';
      $$('.li', $('#lst')).forEach((el) => {
        const i = +el.dataset.i, x = S.edit[i];
        const txt = $('input[type=text]', el); txt.oninput = () => { x.nama = txt.value; dirty(); }; txt.onchange = draw;
        const col = $('input[type=color]', el); if (col) col.oninput = () => { x.warna = col.value; dirty(); };
        $('[data-up]', el).onclick = () => { [S.edit[i - 1], S.edit[i]] = [S.edit[i], S.edit[i - 1]]; dirty(); draw(); };
        $('[data-down]', el).onclick = () => { [S.edit[i + 1], S.edit[i]] = [S.edit[i], S.edit[i + 1]]; dirty(); draw(); };
        $('[data-rm]', el).onclick = () => {
          const n = x.asli ? cnt(x.asli) : 0;
          if (n && !confirm(`"${x.asli}" dipakai ${n} alumni. Data alumni tidak berubah, hanya pilihan di formulir yang hilang. Lanjutkan?`)) return;
          S.edit.splice(i, 1); dirty(); draw();
        };
      });
    };
    const dirty = () => { S.dirty = true; $('#dirty').classList.remove('hidden'); };
    draw();
    $('#addItem').onclick = () => { S.edit.push({ nama: '', warna: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'), asli: null }); dirty(); draw(); $$('.li input[type=text]').pop().focus(); };
    $$('[data-addname]').forEach((b) => b.onclick = () => { S.edit.push({ nama: b.dataset.addname, warna: '#5F6368', asli: b.dataset.addname }); b.remove(); dirty(); draw(); });
    $('#resetItems').onclick = () => renderListEditor(kind);
    $('#saveItems').onclick = async () => {
      const items = S.edit.map((x) => ({ ...x, nama: x.nama.trim() })).filter((x) => x.nama);
      const names = items.map((x) => x.nama.toLowerCase());
      if (names.some((n, i) => names.indexOf(n) !== i)) return toast('Ada nama yang sama, periksa kembali.');
      if (isUnit && !items.length) return toast('Minimal harus ada satu unit.');
      const ganti = {}; items.forEach((x) => { if (x.asli && x.asli !== x.nama) ganti[x.asli] = x.nama; });
      const body = isUnit ? { unit: items.map((x) => ({ nama: x.nama, warna: x.warna })), ganti_unit: ganti } : { asrama: items.map((x) => x.nama), ganti_asrama: ganti };
      const btn = $('#saveItems'); btn.disabled = true;
      try {
        const j = await api('r=pengaturan', { method: 'PUT', body });
        S.settings = j.data; S.dirty = false;
        if (Object.keys(ganti).length) await loadAll();
        renderListEditor(kind); toast('Tersimpan.' + (Object.keys(ganti).length ? ' Data alumni dengan nama lama ikut diperbarui.' : ''));
      } catch (e) { toast(e.message); btn.disabled = false; }
    };
  }

  // ---------------- PENGATURAN ----------------
  function renderSettings() {
    const s = S.settings; const p = s.lokasi_pondok || {};
    $('#content').innerHTML = `<h2 class="title">Pengaturan</h2><p class="sub">Pengaturan umum peta alumni.</p>
      <div class="settings">
        <div class="panel"><h3>Persetujuan data baru</h3><p class="desc">Jika aktif, data yang diisi alumni tidak langsung tampil di peta sampai disetujui di menu Data alumni.</p>
          <label class="check"><input type="checkbox" id="sAppr" ${s.perlu_persetujuan ? 'checked' : ''} /><span>Data baru perlu persetujuan admin</span></label></div>
        <div class="panel"><h3>Lokasi pondok</h3><p class="desc">Ditampilkan sebagai penanda khusus (bulan bintang emas) di peta. Klik peta untuk menentukan titik.</p>
          <div class="field"><label>Label</label><input id="sLabel" value="${esc(p.label || "Pondok Pesantren Mamba'ul Ulum")}" maxlength="120" /></div>
          <div class="grid2"><div class="field"><label>Latitude</label><input id="sLat" inputmode="decimal" value="${p.lat ?? ''}" /></div>
          <div class="field"><label>Longitude</label><input id="sLng" inputmode="decimal" value="${p.lng ?? ''}" /></div></div>
          <div class="minimap" id="sMap"></div></div>
        <div class="panel"><h3>Kata sandi admin</h3><p class="desc">Kata sandi diatur lewat Environment Variable <b>ADMIN_KEY</b> di Vercel (Settings → Environment Variables), lalu Redeploy.</p></div>
        <div><button class="btn primary" id="sSave">Simpan pengaturan</button></div>
      </div>`;
    killMM();
    S.mm = miniMap($('#sMap'), parseFloat(p.lat), parseFloat(p.lng), (la, ln) => { $('#sLat').value = la.toFixed(6); $('#sLng').value = ln.toFixed(6); });
    const sync = () => S.mm.set(parseFloat($('#sLat').value), parseFloat($('#sLng').value));
    $('#sLat').onchange = sync; $('#sLng').onchange = sync;
    $('#sSave').onclick = async () => {
      const la = $('#sLat').value.trim(), ln = $('#sLng').value.trim();
      const body = { perlu_persetujuan: $('#sAppr').checked, lokasi_pondok: la && ln ? { lat: +la.replace(',', '.'), lng: +ln.replace(',', '.'), label: $('#sLabel').value } : null };
      try { const j = await api('r=pengaturan', { method: 'PUT', body }); S.settings = j.data; toast('Pengaturan disimpan.'); }
      catch (e) { toast(e.message); }
    };
  }

  let tt = 0;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(tt); tt = setTimeout(() => t.classList.add('hidden'), 3500); }
  window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  if (S.key) api('r=ping').then(start).catch(() => {});
})();
