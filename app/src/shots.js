// Screenshot scenes share the exact same renderer and assets as the offline editor.
window.runShot = async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const name = ['boulevard', 'pier'].includes(query.get('photo')) ? query.get('photo') : 'boulevard';
  await load(name, query.get('caption') || 'VICE COAST', {
    subtitle: query.get('subtitle'), layout: query.get('layout'), grade: query.get('grade')
  });
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
};
