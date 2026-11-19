// A local-only photo desk: image files become object URLs and never leave this page.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('cover');
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  const state = {
    photos: [], panels: Array.from({length: 4}, (_, i) => ({photo: i % 2, x: .5, y: i === 0 ? .4 : i === 1 ? .34 : .55, zoom: 1})),
    title: 'VICE COAST', subtitle: 'Neon Tide', tagline: 'ONE COAST  •  NO RULES  •  COMING SOON',
    quote: '“A FEVER DREAM IN NEON” — COAST HERALD', layout: 'keyart', grade: 'sunset', grain: true, seal: true, review: true, footer: true
  };
  let selected = 0, geometry = [], frame = 0, ready = false, dragging = null;
  let width = 1080, height = 1350;
  const history = [];
  let lastEdit = '', lastEditTime = 0;
  function snapshot() {
    return {...state, photos: state.photos.slice(), panels: state.panels.map(p => ({...p})), width, height};
  }
  function save(key = '') {
    const now = Date.now();
    if (!(key && lastEdit === key && now - lastEditTime < 700)) {
      history.push(snapshot()); if (history.length > 40) history.shift();
      $('undo').disabled = false;
    }
    lastEdit = key; lastEditTime = now;
  }
  function undo() {
    if (!history.length) return;
    const previous = history.pop();
    width = previous.width; height = previous.height;
    delete previous.width; delete previous.height;
    Object.assign(state, previous);
    lastEdit = ''; $('undo').disabled = history.length === 0;
    sync(); render();
  }
  function renderNow() {
    frame = 0;
    if (!ready) return;
    canvas.width = shot === 'cover' ? innerWidth : width;
    canvas.height = shot === 'cover' ? innerHeight : height;
    geometry = window.CoverStudio.drawCover(canvas, state) || [];
    $('preview-size').textContent = `${canvas.width} × ${canvas.height}`;
  }
  function render() { if (!frame) frame = requestAnimationFrame(renderNow); }
  function notify(message, error = false) {
    $('status').textContent = message; $('status').classList.toggle('fatal', error);
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('This image could not be read. Try a JPG, PNG or WebP.'));
      image.src = url;
    });
  }
  async function fonts() {
    const files = {Archivo: 'ArchivoBlack-Regular.ttf', Anton: 'Anton-Regular.ttf', Dafoe: 'MrDafoe-Regular.ttf', Pacifico: 'Pacifico-Regular.ttf'};
    await Promise.all(Object.entries(files).map(async ([name, file]) => {
      let source = `url("./fonts/${file}")`;
      if (location.protocol === 'file:' && window.FONT_DATA) {
        const data = window.FONT_DATA[name] || window.FONT_DATA[file];
        if (data) {
          const raw = atob(data.includes(',') ? data.split(',')[1] : data);
          source = Uint8Array.from(raw, c => c.charCodeAt(0)).buffer;
        }
      }
      const face = new FontFace(name, source);
      await face.load(); document.fonts.add(face);
    }));
    await document.fonts.ready;
  }
  function panelCount() { return state.layout === 'triple' ? 3 : 4; }
  function syncCrop() {
    const p = state.panels[selected];
    $('zoom').value = p.zoom; $('zoom-value').textContent = `${Number(p.zoom).toFixed(2)}×`;
    $('focus-x').value = p.x; $('focus-y').value = p.y;
    document.querySelectorAll('[data-panel]').forEach(b => b.classList.toggle('active', Number(b.dataset.panel) === selected));
    document.querySelectorAll('[data-photo]').forEach(b => b.classList.toggle('active', Number(b.dataset.photo) === p.photo));
  }
  function library() {
    const host = $('photo-library'); host.replaceChildren();
    state.photos.forEach((photo, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.photo = index;
      button.title = `Use ${photo.name} in panel ${selected + 1}`; button.setAttribute('aria-label', button.title);
      const img = document.createElement('img'); img.src = photo.url; img.alt = photo.name;
      const number = document.createElement('span'); number.textContent = String(index + 1);
      button.append(img, number);
      button.addEventListener('click', () => { save(); state.panels[selected].photo = index; syncCrop(); render(); });
      host.append(button);
    });
  }
  function sync() {
    for (const [id, prop] of Object.entries({caption:'title',subtitle:'subtitle',tagline:'tagline',quote:'quote'})) $(id).value = state[prop];
    for (const id of ['grain','seal','review','footer']) $(id).checked = state[id];
    document.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('active', b.dataset.layout === state.layout));
    document.querySelectorAll('[data-grade]').forEach(b => b.classList.toggle('active', b.dataset.grade === state.grade));
    document.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === `${width},${height}`));
    selected = Math.min(selected, panelCount()-1);
    $('panel-picker').replaceChildren();
    for (let i = 0; i < panelCount(); i++) {
      const button = document.createElement('button'); button.textContent = `P${i + 1}`; button.dataset.panel = i;
      button.setAttribute('aria-label', `Edit panel ${i + 1}`);
      button.addEventListener('click', () => { selected = i; syncCrop(); notify(`Panel ${i + 1} selected. Drag its photo or adjust focus.`); });
      $('panel-picker').append(button);
    }
    library(); syncCrop();
  }
  async function addFiles(files) {
    const images = [...files].filter(file => file.type.startsWith('image/'));
    if (!images.length) { notify('Choose image files such as JPG, PNG or WebP.', true); return; }
    notify('Opening your photos locally…');
    const added = [];
    for (const file of images) {
      const url = URL.createObjectURL(file);
      try { added.push({name: file.name, url, image: await loadImage(url)}); }
      catch (error) { URL.revokeObjectURL(url); notify(error.message, true); }
    }
    if (!added.length) return;
    save(); const start = state.photos.length; state.photos.push(...added);
    state.panels.forEach((panel, i) => Object.assign(panel, {photo: start + i % added.length, x:.5, y:.35, zoom:1}));
    sync(); render(); notify(`${added.length} photo${added.length > 1 ? 's' : ''} added. Your cover is ready to export.`);
    $('photo').value = '';
  }
  async function exportPNG(w, h, download = true) {
    if (!ready) return null;
    notify(`Rendering ${w} × ${h}…`);
    const output = document.createElement('canvas'); output.width = w; output.height = h;
    window.CoverStudio.drawCover(output, state);
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) { notify('Export could not be created. Please try again.', true); return null; }
    const name = `${(state.title || 'neon-tide').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'cover'}-${w}x${h}.png`;
    if (download) {
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    notify(`Saved ${name} · full-resolution PNG`);
    return blob;
  }
  $('photo').addEventListener('change', e => addFiles(e.target.files));
  const drop = $('dropzone');
  for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('dragover'); });
  for (const type of ['dragleave', 'drop']) drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('dragover'); });
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); if (!drop.contains(e.target)) addFiles(e.dataTransfer.files); });
  for (const [id, prop] of Object.entries({caption:'title',subtitle:'subtitle',tagline:'tagline',quote:'quote'})) {
    $(id).addEventListener('input', e => { save(prop); state[prop] = e.target.value; render(); });
  }
  document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => { save(); state.layout = button.dataset.layout; sync(); render(); }));
  document.querySelectorAll('[data-grade]').forEach(button => button.addEventListener('click', () => { save(); state.grade = button.dataset.grade; sync(); render(); }));
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => { save(); [width,height] = button.dataset.size.split(',').map(Number); sync(); render(); }));
  for (const id of ['grain','seal','review','footer']) $(id).addEventListener('change', e => { save(); state[id] = e.target.checked; render(); });
  for (const [id, prop] of Object.entries({zoom:'zoom','focus-x':'x','focus-y':'y'})) $(id).addEventListener('input', e => { save(id); state.panels[selected][prop] = Number(e.target.value); syncCrop(); render(); });
  $('reset-crop').addEventListener('click', () => { save(); Object.assign(state.panels[selected], {x:.5,y:.4,zoom:1}); syncCrop(); render(); });
  $('undo').addEventListener('click', undo);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); undo(); }
  });
  document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => exportPNG(...button.dataset.export.split(',').map(Number))));
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX-rect.left)*canvas.width/rect.width, (event.clientY-rect.top)*canvas.height/rect.height];
  }
  function contains(points, x, y) {
    let inside = false;
    for (let i=0,j=points.length-1;i<points.length;j=i++) {
      const [xi,yi]=points[i], [xj,yj]=points[j];
      if (((yi>y)!==(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
    } return inside;
  }
  canvas.addEventListener('pointerdown', event => {
    if (shot === 'cover') return;
    const [x,y] = point(event);
    const index = geometry.findIndex(p => contains(p.points, x, y));
    if (index < 0 || index >= panelCount()) return;
    selected = index; save(); syncCrop();
    const p = state.panels[selected], b = geometry[index].bounds;
    dragging = {x,y,px:p.x,py:p.y,b}; canvas.setPointerCapture(event.pointerId);
    notify(`Reframing panel ${selected + 1} · drag to move the photo.`);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const [x,y] = point(event), p = state.panels[selected];
    p.x = Math.max(0,Math.min(1,dragging.px-(x-dragging.x)/(dragging.b.w || canvas.width)*.8));
    p.y = Math.max(0,Math.min(1,dragging.py-(y-dragging.y)/(dragging.b.h || canvas.height)*.8));
    syncCrop(); render();
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, () => { dragging = null; });
  window.addEventListener('resize', () => { if (shot === 'cover') render(); });
  window.studio = {state, render, exportPNG, addFiles, undo, loadImage};
  async function init() {
    try {
      await fonts();
      const samples = await Promise.all(['boulevard','pier'].map(async name => {
        const url = location.protocol === 'file:' && window.SAMPLE_DATA?.[name]
          ? `data:image/jpeg;base64,${window.SAMPLE_DATA[name]}` : `./samples/${name}.jpg`;
        return {name: `${name}.jpg`, url, image:await loadImage(url)};
      }));
      state.photos = samples; ready = true;
      async function scene(name, title, options = {}) {
        if (name === 'pier') state.panels.forEach((p,i) => p.photo = i % 2 ? 0 : 1);
        state.title = title;
        if (options.subtitle !== null && options.subtitle !== undefined) state.subtitle = options.subtitle;
        if (['keyart','triple','poster'].includes(options.layout)) state.layout = options.layout;
        if (['sunset','neon','golden','teal'].includes(options.grade)) state.grade = options.grade;
        sync(); renderNow(); notify('All local. Ready when you are.');
      }
      if (shot) await window.runShot(shot, query, scene);
      else { await scene('boulevard','VICE COAST'); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); window.__shotReady = true; }
    } catch (error) { notify(`Could not open the studio: ${error.message}`, true); console.error(error); }
  }
  init();
})();
