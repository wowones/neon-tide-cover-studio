(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('cover');
  const overlay = $('crop-overlay');
  const library = $('photo-library');
  const panelGroup = $('panels');
  const zoomInput = $('zoom');
  const photoInput = $('photo');
  const exportButton = $('export');
  const exportMenu = $('export-menu');
  const copyInputs = [...document.querySelectorAll('[data-copy]')];
  const optionButtons = [...document.querySelectorAll('[data-layout], [data-grade]')];
  const layerInputs = [...document.querySelectorAll('[data-layer]')];
  const renderer = window.ViceCover;
  const shot = window.ViceShots;
  const coverOnly = shot?.shot === 'cover';
  const preview = { width: 1080, height: 1350 };
  const panelCounts = { keyart: 4, triple: 3, poster: 4 };
  const state = {
    photos: [], panels: [], title: 'VICE COAST', subtitle: 'Neon Tide',
    tagline: 'ONE COAST  •  NO RULES  •  COMING SOON', quote: '“A FEVER DREAM IN NEON” — COAST HERALD',
    layout: 'keyart', grade: 'sunset', grain: true, seal: true, review: true, footer: true,
  };
  let selectedPanel = 0;
  let metadata = [];
  let frame = 0;
  let showCrop = false;
  let drag = null;
  let panelButtons = [];
  let photoButtons = [];
  let wheelTime = -Infinity;
  let exporting = false;
  let statusTimer;
  const history = [];
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));

  function notify(text, error = false, duration = 0) {
    clearTimeout(statusTimer);
    const status = $('status');
    status.textContent = text;
    status.classList.toggle('error', error);
    if (duration) statusTimer = setTimeout(() => notify(''), duration);
  }

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS(svg.namespaceURI, 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.classList.add('icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.append(use);
    return svg;
  }

  function button(text, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    if (text) el.textContent = text;
    el.addEventListener('click', onClick);
    return el;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The image could not be opened.'));
      image.src = src;
    });
  }

  async function loadSample(sample) {
    const src = location.protocol === 'file:' ? window.ViceAssets?.[sample] : `./samples/${sample}.jpg`;
    if (!src) throw new Error('The offline sample bundle could not be loaded.');
    const image = await loadImage(src);
    return { image, src, sample, name: sample === 'boulevard' ? 'Boulevard' : 'Pier' };
  }

  async function loadFile(file) {
    const src = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result));
      reader.addEventListener('error', reject);
      reader.addEventListener('abort', reject);
      reader.readAsDataURL(file);
    });
    const image = await loadImage(src);
    return { image, src, name: file.name.replace(/\.[^.]+$/, '') || file.name };
  }

  function remember() {
    history.push({ state: { ...state, panels: state.panels.map(panel => ({ ...panel })), photos: state.photos.slice() }, selectedPanel });
    if (history.length > 40) history.shift();
    $('undo').disabled = false;
  }

  function undo() {
    const previous = history.pop();
    if (!previous) return;
    const focused = document.activeElement;
    const focusPhoto = focused?.dataset.photo;
    Object.assign(state, previous.state);
    selectedPanel = previous.selectedPanel;
    showCrop = false;
    copyInputs.forEach(input => { input.value = state[input.dataset.copy]; input.dataset.undo = ''; });
    zoomInput.dataset.undo = '';
    syncSettings();
    updateLibrary();
    if (focusPhoto != null) (photoButtons[Number(focusPhoto)] || library.firstElementChild)?.focus();
    $('undo').disabled = !history.length;
    schedule();
    notify('Change undone', false, 2200);
  }

  function currentPanel(index = selectedPanel) {
    const auto = metadata[index];
    return state.panels[index] || {
      photo: auto?.photo ?? (state.photos.length ? index % state.photos.length : 0),
      x: auto?.focusX ?? .5, y: auto?.focusY ?? .5, zoom: auto?.zoom ?? 1,
    };
  }

  function updateLibrary() {
    const add = button('', () => photoInput.click());
    add.className = 'photo-tile add-photo';
    add.append(icon('plus'), document.createTextNode('Add photos'));
    photoButtons = state.photos.map((photo, index) => {
      const el = button('', () => assignPhoto(index));
      el.className = 'photo-tile';
      el.dataset.photo = index;
      el.title = `Assign ${photo.name} to the selected panel`;
      el.setAttribute('aria-label', `Assign ${photo.name}`);
      const thumb = document.createElement('img');
      thumb.src = photo.src;
      thumb.alt = '';
      thumb.draggable = false;
      const name = document.createElement('span');
      name.textContent = photo.name;
      const check = icon('check');
      check.classList.add('tile-check');
      el.append(thumb, name, check);
      return el;
    });
    library.replaceChildren(add, ...photoButtons);
    $('photo-count').textContent = String(state.photos.length).padStart(2, '0');
    syncCrop();
  }

  function assignPhoto(index, snapshot = true) {
    if (snapshot && currentPanel().photo === index) return;
    if (snapshot) remember();
    state.panels[selectedPanel] = { photo: index, x: .5, y: .3, zoom: 1 };
    showCrop = false;
    schedule();
    if (snapshot) notify(`${state.photos[index].name} assigned to panel ${selectedPanel + 1}`, false, 3000);
  }

  async function importPhotos(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;
    notify('Opening photos…');
    const results = await Promise.allSettled(files.map(loadFile));
    const added = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    if (!added.length) { notify('No photos opened. Try a JPG, PNG, or WebP.', true); return; }
    remember();
    const firstImport = !state.photos.some(photo => !photo.sample);
    const firstIndex = firstImport ? 0 : state.photos.length;
    if (firstImport) {
      state.photos = added;
      state.panels = [];
      selectedPanel = 0;
      showCrop = false;
      schedule();
    } else {
      state.photos.push(...added);
      assignPhoto(firstIndex, false);
    }
    updateLibrary();
    const tile = photoButtons[firstIndex]?.getBoundingClientRect();
    if (tile) library.scrollLeft += Math.max(0, tile.right - library.getBoundingClientRect().right + 4);
    const skipped = files.length - added.length;
    const count = `${added.length} ${added.length === 1 ? 'photo' : 'photos'} added`;
    notify(skipped ? `${count}; ${skipped} could not be opened.` : count, !!skipped, skipped ? 0 : 3800);
  }

  function syncSettings() {
    optionButtons.forEach(el => {
      const active = (el.dataset.grade || el.dataset.layout) === (el.dataset.grade ? state.grade : state.layout);
      el.setAttribute('aria-pressed', active);
    });
    layerInputs.forEach(el => { el.checked = state[el.dataset.layer]; });
  }

  function selectPanel(index, outline = true) {
    selectedPanel = index;
    showCrop = outline;
    syncCrop();
  }

  function syncCrop() {
    const count = metadata.length || panelCounts[state.layout];
    selectedPanel = Math.min(selectedPanel, count - 1);
    if (count !== panelButtons.length) {
      panelButtons = Array.from({ length: count }, (_, i) => {
        const el = button(String(i + 1), () => selectPanel(i));
        el.setAttribute('aria-label', `Select panel ${i + 1}`);
        return el;
      });
      panelGroup.replaceChildren(...panelButtons);
    }
    const current = currentPanel();
    panelButtons.forEach((el, i) => el.setAttribute('aria-pressed', i === selectedPanel));
    photoButtons.forEach((el, i) => el.setAttribute('aria-pressed', i === current.photo));
    zoomInput.disabled = !state.photos.length;
    zoomInput.value = current.zoom;
    $('zoom-value').value = `${Math.round(current.zoom * 100)}%`;
    $('reset-crop').disabled = !state.panels[selectedPanel];
    const quad = metadata[selectedPanel]?.quad;
    overlay.classList.toggle('show', showCrop && !!quad);
    if (quad) {
      overlay.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
      overlay.firstElementChild.setAttribute('points', quad.map(point => point.join(',')).join(' '));
    }
  }

  function paint() {
    frame = 0;
    if (!renderer) return;
    const width = coverOnly ? window.innerWidth : preview.width;
    const height = coverOnly ? window.innerHeight : preview.height;
    metadata = renderer.render(canvas, state, width, height) || [];
    if (!coverOnly) syncCrop();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function setZoom(value) {
    if (!state.photos.length) return;
    state.panels[selectedPanel] = { ...currentPanel(), zoom: clamp(value, 1, 3) };
    showCrop = true;
    schedule();
  }

  function resetCrop() {
    const previous = state.panels[selectedPanel];
    if (!previous) return;
    remember();
    delete state.panels[selectedPanel];
    const scratch = document.createElement('canvas');
    const natural = renderer.render(scratch, state, preview.width / 3, preview.height / 3)?.[selectedPanel];
    if (natural?.photo !== previous.photo) state.panels[selectedPanel] = { photo: previous.photo, x: .5, y: .3, zoom: 1 };
    schedule();
    notify(`Panel ${selectedPanel + 1} crop reset`, false, 2200);
  }

  function pointAt(event) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height];
  }

  function panelAt(x, y) {
    for (let index = metadata.length - 1; index >= 0; index--) {
      const quad = metadata[index].quad;
      if (!quad) continue;
      let inside = false;
      for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
        const [ax, ay] = quad[i];
        const [bx, by] = quad[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) return index;
    }
    return -1;
  }

  function closeExports(restoreFocus = false) {
    exportMenu.hidden = true;
    exportButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) exportButton.focus();
  }

  async function exportPNG(size) {
    if (exporting || !renderer) return;
    const [width, height] = size.split('x').map(Number);
    exporting = true;
    closeExports();
    exportButton.focus();
    notify('Preparing PNG…');
    const target = document.createElement('canvas');
    try {
      renderer.render(target, state, width, height);
      const blob = await new Promise(resolve => target.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Empty export');
      const title = state.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vice-coast';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}-${size}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      notify(`Downloaded ${width} × ${height} PNG`, false, 4500);
    } catch (error) {
      console.error(error);
      notify('PNG export failed. Try reimporting the original photos.', true);
    } finally {
      exporting = false;
    }
  }

  function connectEditor() {
    photoInput.addEventListener('change', () => {
      importPhotos(photoInput.files);
      photoInput.value = '';
    });

    let dropDepth = 0;
    const dropBanner = $('drop-banner');
    const hasFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
    document.addEventListener('dragenter', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dropDepth++;
      dropBanner.hidden = false;
    });
    document.addEventListener('dragover', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('dragleave', () => {
      dropDepth = Math.max(0, dropDepth - 1);
      if (!dropDepth) dropBanner.hidden = true;
    });
    document.addEventListener('drop', event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dropDepth = 0;
      dropBanner.hidden = true;
      importPhotos(event.dataTransfer.files);
    });

    copyInputs.forEach(input => {
      input.addEventListener('input', () => {
        if (!input.dataset.undo) { remember(); input.dataset.undo = '1'; }
        if (input.tagName === 'TEXTAREA' && input.value.includes('\n')) input.value = input.value.replace(/\n+/g, ' ');
        state[input.dataset.copy] = input.value;
        showCrop = false;
        schedule();
      });
      input.addEventListener('blur', () => { input.dataset.undo = ''; });
    });
    optionButtons.forEach(el => el.addEventListener('click', () => {
      const key = el.dataset.grade ? 'grade' : 'layout';
      if (state[key] === el.dataset[key]) return;
      remember();
      state[key] = el.dataset[key];
      if (key === 'layout') selectedPanel = Math.min(selectedPanel, panelCounts[state.layout] - 1);
      showCrop = false;
      syncSettings();
      schedule();
    }));
    layerInputs.forEach(input => input.addEventListener('change', () => {
      remember();
      state[input.dataset.layer] = input.checked;
      showCrop = false;
      schedule();
    }));
    zoomInput.addEventListener('input', () => {
      if (!zoomInput.dataset.undo) { remember(); zoomInput.dataset.undo = '1'; }
      setZoom(Number(zoomInput.value));
    });
    zoomInput.addEventListener('change', () => { zoomInput.dataset.undo = ''; });
    zoomInput.addEventListener('blur', () => { zoomInput.dataset.undo = ''; });
    $('reset-crop').addEventListener('click', resetCrop);

    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag || !state.photos.length) return;
      const point = pointAt(event);
      const index = panelAt(...point);
      if (index < 0) return;
      selectPanel(index);
      drag = { pointer: event.pointerId, index, point, start: { ...currentPanel() }, panel: metadata[index], moved: false };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointer) return;
      const [x, y] = pointAt(event);
      const dx = x - drag.point[0];
      const dy = y - drag.point[1];
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      const { overflowX, overflowY } = drag.panel;
      if (!overflowX && !overflowY) return;
      if (!drag.moved) {
        remember();
        drag.moved = true;
        canvas.classList.add('is-dragging');
      }
      state.panels[drag.index] = {
        ...drag.start,
        x: overflowX > 0 ? clamp(drag.start.x - dx / overflowX) : drag.start.x,
        y: overflowY > 0 ? clamp(drag.start.y - dy / overflowY) : drag.start.y,
      };
      schedule();
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      drag = null;
      canvas.classList.remove('is-dragging');
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => canvas.addEventListener(name, endDrag));
    canvas.addEventListener('wheel', event => {
      if (!state.photos.length || document.activeElement !== canvas && matchMedia('(max-width: 680px)').matches) return;
      const index = panelAt(...pointAt(event));
      if (index < 0) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheelTime > 350 || index !== selectedPanel) remember();
      wheelTime = now;
      selectPanel(index);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      setZoom(currentPanel().zoom - clamp(delta * .0015, -.2, .2));
    }, { passive: false });
    canvas.addEventListener('keydown', event => {
      const offset = { ArrowLeft: [.035, 0], ArrowRight: [-.035, 0], ArrowUp: [0, .035], ArrowDown: [0, -.035] }[event.key];
      if (!state.photos.length || !offset || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      if (!event.repeat) remember();
      const panel = currentPanel();
      state.panels[selectedPanel] = { ...panel, x: clamp(panel.x + offset[0]), y: clamp(panel.y + offset[1]) };
      showCrop = true;
      schedule();
    });
    document.addEventListener('pointerdown', event => {
      if (!showCrop || event.target === canvas || event.target.closest('.crop-tools')) return;
      showCrop = false;
      syncCrop();
    });

    exportButton.addEventListener('click', () => {
      if (!exportMenu.hidden) { closeExports(); return; }
      exportMenu.hidden = false;
      exportButton.setAttribute('aria-expanded', 'true');
      exportMenu.querySelector('button')?.focus();
    });
    exportMenu.addEventListener('click', event => {
      const option = event.target.closest('[data-size]');
      if (option) exportPNG(option.dataset.size);
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.export-control')) closeExports();
    });
    $('undo').addEventListener('click', undo);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !exportMenu.hidden) { closeExports(true); return; }
      if (event.key === 'Escape' && showCrop) { showCrop = false; syncCrop(); return; }
      if (event.key.toLowerCase() !== 'z' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      if (copyInputs.includes(document.activeElement) || !history.length) return;
      event.preventDefault();
      undo();
    });
  }

  async function start() {
    if (!renderer) { notify('The cover renderer could not be loaded.', true); return; }
    shot?.apply(state);
    if (!coverOnly) {
      copyInputs.forEach(input => { input.value = state[input.dataset.copy]; });
      syncSettings();
      updateLibrary();
      notify('Loading sample photos…');
    }
    const samples = shot?.photo === 'pier' ? ['pier', 'boulevard'] : ['boulevard', 'pier'];
    const [results] = await Promise.all([
      Promise.allSettled(samples.map(loadSample)),
      Promise.resolve().then(() => renderer.loadFonts()).catch(error => console.warn('Cover fonts unavailable:', error)),
    ]);
    state.photos = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    paint();
    if (coverOnly) {
      canvas.tabIndex = -1;
      window.addEventListener('resize', schedule);
    } else {
      updateLibrary();
      connectEditor();
      notify(state.photos.length === 2 ? '' : 'Some sample photos could not be loaded. You can still add your own.', state.photos.length !== 2);
    }
    shot?.painted();
  }

  start().catch(error => {
    console.error(error);
    notify('The cover studio could not start.', true);
  });
})();
