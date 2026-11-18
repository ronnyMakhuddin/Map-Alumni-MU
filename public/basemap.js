// Peta dasar gratis tanpa API key:
//  - Default : OpenFreeMap (vektor, gaya "liberty" disesuaikan agar mirip Google Maps)
//  - Satelit : Esri World Imagery + label Esri
//  - Medan   : OpenTopoMap
// Bila browser tidak mendukung WebGL, Default otomatis memakai tile OpenStreetMap biasa.
(function () {
  const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const OFM_ATTR = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTR;
  const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

  const webgl = (() => {
    try { const c = document.createElement('canvas'); return !!window.maplibregl && !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  })();

  // Warna ala Google Maps
  function googleish(gl) {
    const set = (id, prop, val) => { try { gl.setPaintProperty(id, prop, val); } catch (e) {} };
    for (const l of gl.getStyle().layers || []) {
      const id = l.id.toLowerCase();
      if (l.type === 'background') set(l.id, 'background-color', '#F5F3F0');
      else if (l.type === 'fill' && id.includes('water')) set(l.id, 'fill-color', '#AADAFF');
      else if (l.type === 'line' && id.includes('waterway')) set(l.id, 'line-color', '#AADAFF');
      else if (l.type === 'fill' && /park|wood|forest|grass|landcover_wood|landuse_park/.test(id)) set(l.id, 'fill-color', '#C8E6C9');
      else if (l.type === 'fill' && id.includes('building')) { set(l.id, 'fill-color', '#E8E6E3'); }
      else if (l.type === 'line' && /motorway|trunk/.test(id) && !/casing|tunnel/.test(id)) set(l.id, 'line-color', '#FBC86D');
      else if (l.type === 'line' && /primary/.test(id) && !/casing|tunnel/.test(id)) set(l.id, 'line-color', '#FDE293');
    }
  }

  function vector() {
    const layer = L.maplibreGL({ style: STYLE, attribution: OFM_ATTR, maxZoom: 20 });
    layer.on('add', () => {
      const gl = layer.getMaplibreMap && layer.getMaplibreMap();
      if (!gl) return;
      const apply = () => googleish(gl);
      if (gl.isStyleLoaded()) apply(); else gl.once('style.load', apply);
    });
    return layer;
  }
  const osm = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM_ATTR });

  window.Basemap = {
    create(name) {
      if (name === 'satellite') return [
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Citra © Esri, Maxar, Earthstar Geographics' }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Label © Esri' })
      ];
      if (name === 'terrain') return [L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, subdomains: 'abc', attribution: OSM_ATTR + ' · SRTM · © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)' })];
      return [webgl && L.maplibreGL ? vector() : osm()];
    }
  };
})();
