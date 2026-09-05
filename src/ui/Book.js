// Recipe book + basket overlay. Used from the hub/garden (browse) and the restaurant (choose).
import { el } from './UI.js';
import { RECIPES } from '../data/recipes.js';
import { INGREDIENTS, stars } from '../data/ingredients.js';
import { audio } from '../engine/Audio.js';

/**
 * openBook(ui, { tab: 'basket'|'recipes', pick: false, onChoose(recipeId), onFreestyle() })
 */
export function openBook(ui, opts = {}) {
  const state = ui.state;
  const body = el('div', 'book');
  const tabs = el('div', 'tabs');
  const content = el('div', 'book-content');
  body.appendChild(tabs); body.appendChild(content);
  let current = opts.tab || 'recipes';
  const handle = ui.modal({ title: null, body, closable: !opts.locked, cls: 'book-modal', buttons: opts.pick ? [
    ...(opts.onFreestyle ? [{ label: '✨ Freestyle', cls: 'secondary', onClick: () => { opts.onFreestyle(); } }] : []),
    { label: opts.cancelLabel || 'Close', cls: 'ghost', onClick: () => opts.onCancel?.() },
  ] : [{ label: 'Close', cls: 'ghost' }] });

  const render = () => {
    tabs.innerHTML = '';
    for (const [id, label] of [['recipes', '📖 Recipes'], ['basket', '🧺 Basket'], ['gallery', '🖼️ Cooked']]) {
      const b = el('button', `tab ${current === id ? 'active' : ''}`, label);
      b.onclick = () => { audio.click(); current = id; render(); };
      tabs.appendChild(b);
    }
    content.innerHTML = '';
    if (current === 'basket') renderBasket(); else if (current === 'recipes') renderRecipes(); else renderGallery();
  };

  const renderBasket = () => {
    const inv = state.inventory;
    content.appendChild(el('p', 'tiny muted', `${inv.length} / ${state.game.basketCapacity} slots used`));
    if (!inv.length) { content.appendChild(el('p', 'center muted', 'The basket is empty. Gather something in the garden!')); return; }
    const grid = el('div', 'grid');
    // group identical id+quality
    const groups = {};
    for (const it of inv) { const k = `${it.id}:${it.q}`; groups[k] = groups[k] || { ...it, n: 0 }; groups[k].n++; }
    for (const g of Object.values(groups).sort((a, b) => a.id.localeCompare(b.id) || b.q - a.q)) {
      const ing = INGREDIENTS[g.id];
      grid.appendChild(el('div', 'cell', `<div class="big">${ing.icon}</div><div class="name">${ing.name}${g.n > 1 ? ` ×${g.n}` : ''}</div><div class="stars">${stars(g.q)}</div>`));
    }
    content.appendChild(grid);
  };

  const renderRecipes = () => {
    const known = state.game.knownRecipes;
    content.appendChild(el('p', 'tiny muted', `${known.length} / ${Object.keys(RECIPES).length} recipes known · discover more with Freestyle or recipe cards`));
    const list = el('div', 'recipe-list');
    const sorted = [...known].sort((a, b) => (state.hasIngredients(RECIPES[b].ingredients) ? 1 : 0) - (state.hasIngredients(RECIPES[a].ingredients) ? 1 : 0));
    for (const id of sorted) {
      const r = RECIPES[id];
      const can = state.hasIngredients(r.ingredients);
      const missing = state.missingIngredients(r.ingredients);
      const row = el('div', `recipe ${can ? 'can' : 'cannot'}`);
      const ingHtml = r.ingredients.map((i) => `<span class="ing ${missing.includes(i) ? 'miss' : 'have'}" title="${INGREDIENTS[i].name}">${INGREDIENTS[i].icon}</span>`).join('');
      const best = state.game.bestScores[id];
      const cooked = state.game.cookedCount[id] || 0;
      row.innerHTML = `<div class="ricon">${r.icon}</div>
        <div class="rbody"><div class="rname">${r.name} <span class="price">${r.price} CP</span></div>
        <div class="rdesc tiny">${r.desc}</div>
        <div class="ings">${ingHtml} ${missing.length ? `<span class="tiny muted">missing: ${missing.map((m) => INGREDIENTS[m].name).join(', ')}</span>` : ''}</div>
        <div class="tiny muted">Steps: ${r.steps.map(cap).join(' → ')} → ${cap(r.cook)}${cooked ? ` · cooked ×${cooked} · best ${stars(best >= 0.85 ? 3 : best >= 0.55 ? 2 : 1)}` : ''}</div></div>`;
      if (opts.pick) {
        const b = el('button', `btn small ${can ? '' : 'ghost'}`, can ? 'Cook' : 'Missing');
        b.disabled = !can;
        b.onclick = () => { audio.click(); handle.close(); opts.onChoose(id); };
        row.appendChild(b);
      }
      list.appendChild(row);
    }
    content.appendChild(list);
  };

  const renderGallery = () => {
    const cooked = Object.keys(state.game.cookedCount);
    if (!cooked.length) { content.appendChild(el('p', 'center muted', 'No dishes served yet. Stickers appear here once you cook.')); return; }
    const grid = el('div', 'grid');
    for (const id of cooked) {
      const r = RECIPES[id]; const best = state.game.bestScores[id] || 0;
      grid.appendChild(el('div', 'cell sticker', `<div class="big">${r.icon}</div><div class="name">${r.name}</div><div class="stars">${stars(best >= 0.85 ? 3 : best >= 0.55 ? 2 : 1)}</div><div class="tiny muted">×${state.game.cookedCount[id]}</div>`));
    }
    content.appendChild(grid);
    const photos = state.game.photos.length;
    if (photos) content.appendChild(el('p', 'tiny muted center', `📷 ${photos} perfect dish photo${photos > 1 ? 'es' : ''} on the restaurant wall`));
  };

  render();
  return handle;
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
