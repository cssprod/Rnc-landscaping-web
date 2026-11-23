// @ts-check
/* Portfolio filters and the before/after slider. Self-initialising: does nothing on a page without [data-filters] or
   [data-ba]. Loaded by main.js in W1 and by the project routes' scripts: ['projects'] (CONTRACT §12). */

/* ---------- portfolio filters ---------- */
const filters = /** @type {HTMLFormElement|null} */ (document.querySelector('[data-filters]'));
if (filters) {
  const grid = document.querySelector('[data-project-grid]');
  const cards = /** @type {HTMLElement[]} */ ([...(grid?.children || [])]);
  const count = /** @type {HTMLElement} */ (filters.querySelector('[data-filters-count]'));
  const empty = /** @type {HTMLElement|null} */ (document.querySelector('[data-filters-empty]'));
  const area = /** @type {HTMLSelectElement} */ (filters.elements.namedItem('area'));
  const service = () => /** @type {HTMLInputElement|null} */ (filters.querySelector('input[name=service]:checked'))?.value || '';
  const q = new URLSearchParams(location.search);
  const qs = q.get('service');
  if (qs) { const r = /** @type {HTMLInputElement|null} */ (filters.querySelector(`input[name=service][value="${CSS.escape(qs)}"]`)); if (r) r.checked = true; }
  if (q.get('area')) area.value = q.get('area') || '';
  const apply = () => {
    const s = service(), a = area.value;
    let n = 0;
    for (const c of cards) { const show = (!s || c.dataset.service === s) && (!a || c.dataset.area === a); c.hidden = !show; if (show) n++; }
    count.textContent = `${n} project${n === 1 ? '' : 's'} shown`;
    if (empty) empty.hidden = n > 0;
    const u = new URL(location.href); s ? u.searchParams.set('service', s) : u.searchParams.delete('service'); a ? u.searchParams.set('area', a) : u.searchParams.delete('area');
    history.replaceState(null, '', u);
  };
  filters.addEventListener('change', apply);
  filters.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  apply();
}

/* ---------- before / after slider ---------- */
for (const ba of document.querySelectorAll('[data-ba]')) {
  const range = /** @type {HTMLInputElement} */ (ba.querySelector('[data-ba-range]'));
  const set = () => { /** @type {HTMLElement} */ (ba).style.setProperty('--pos', `${range.value}%`); range.setAttribute('aria-valuetext', `${100 - Number(range.value)}% after image shown`); };
  ba.classList.add('is-enhanced');
  range.addEventListener('input', set);
  set();
}
