// Deterministic scenes for the screenshot runner. Only recognized options affect a shot.
(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const allowed = (key, values) => values.includes(query.get(key)) ? query.get(key) : undefined;
  const shot = allowed('shot', ['cover', 'editor']);

  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot) window.__shotReady = false;

  window.ViceShots = {
    shot,
    photo: shot && allowed('photo', ['boulevard', 'pier']),
    apply(state) {
      if (!shot) return;
      const replacements = {
        title: query.get('caption'),
        subtitle: query.get('subtitle'),
        layout: allowed('layout', ['keyart', 'triple', 'poster']),
        grade: allowed('grade', ['sunset', 'neon', 'golden', 'teal']),
      };
      for (const [key, value] of Object.entries(replacements)) {
        if (value != null) state[key] = typeof value === 'string' && (key === 'title' || key === 'subtitle') ? value.slice(0, 48) : value;
      }
    },
    painted() {
      if (shot) requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
    },
  };
})();
