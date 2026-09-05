// Shared dress-up panel for the character creator, wardrobe and shop.
import { el } from './UI.js';
import { ITEMS, ITEM_IDS, COSMETIC_SLOTS, SLOT_NAMES } from '../data/shop.js';
import { PALETTE } from '../world/materials.js';
import { audio } from '../engine/Audio.js';

const LOOK_TABS = [
  { key: 'skin', name: 'Skin', colors: PALETTE.skin },
  { key: 'eyes', name: 'Eyes', colors: PALETTE.eyes },
  { key: 'hairTint', name: 'Hair colour', colors: PALETTE.hairTints, lockedAfter: 3, lockItem: 'hair_tints' },
];

/**
 * buildDressUp({ state, mode: 'creator'|'wardrobe'|'shop', equipped, look, onEquip(slot,id), onLook(key,idx), onBuy(id), onTry(id), tryOn, extraTop })
 * Returns { el, refresh() }.
 */
export function buildDressUp(opts) {
  const { state, mode } = opts;
  const root = el('div', `dressup card ${mode}`);
  const tabs = el('div', 'du-tabs'); const body = el('div', 'du-body'); const foot = el('div', 'du-foot');
  root.appendChild(tabs); root.appendChild(body); root.appendChild(foot);
  let current = mode === 'shop' ? 'new' : 'hair';

  const slotTabs = mode === 'shop'
    ? [['new', '✨ New today'], ...COSMETIC_SLOTS.map((s) => [s, SLOT_NAMES[s]]), ['upgrade', SLOT_NAMES.upgrade], ['recipe', SLOT_NAMES.recipe], ['decor', SLOT_NAMES.decor]]
    : [...COSMETIC_SLOTS.map((s) => [s, SLOT_NAMES[s]]), ...LOOK_TABS.map((t) => [t.key, t.name])];

  const render = () => {
    tabs.innerHTML = '';
    for (const [id, label] of slotTabs) {
      if (mode === 'shop' && id === 'unlock') continue;
      const b = el('button', `du-tab ${current === id ? 'active' : ''}`, label);
      b.onclick = () => { audio.click(); current = id; render(); };
      tabs.appendChild(b);
    }
    body.innerHTML = '';
    const lookTab = LOOK_TABS.find((t) => t.key === current);
    if (lookTab) return renderLook(lookTab);
    if (current === 'new') return renderItems(opts.newToday || [], true);
    renderItems(ITEM_IDS.filter((id) => ITEMS[id].slot === current || (current === 'upgrade' && ITEMS[id].slot === 'unlock')), false);
  };

  const renderLook = (tab) => {
    const unlocked = !tab.lockItem || state.owns(tab.lockItem);
    const row = el('div', 'du-grid');
    tab.colors.forEach((c, i) => {
      const locked = !unlocked && i >= tab.lockedAfter;
      const chip = el('button', `du-item swatch ${opts.look[tab.key] === i ? 'selected' : ''} ${locked ? 'locked' : ''}`);
      chip.innerHTML = `<span class="sw" style="background:#${c.toString(16).padStart(6, '0')}"></span>${locked ? '<span class="lock">🔒</span>' : ''}`;
      chip.onclick = () => { if (locked) { audio.wobble(); return; } audio.click(); opts.onLook(tab.key, i); render(); };
      row.appendChild(chip);
    });
    body.appendChild(row);
    if (!unlocked) body.appendChild(el('p', 'tiny muted', `More colours unlock with “${ITEMS[tab.lockItem].name}” from the shop.`));
  };

  const renderItems = (ids, isNew) => {
    const grid = el('div', 'du-grid');
    let shown = 0;
    for (const id of ids) {
      const it = ITEMS[id]; const owned = state.owns(id);
      if (mode !== 'shop' && !owned) continue;
      if (mode === 'shop' && it.starter) continue;
      shown++;
      const equipped = COSMETIC_SLOTS.includes(it.slot) && opts.equipped[it.slot] === id;
      const trying = opts.tryOn === id;
      const cell = el('div', `du-item ${equipped ? 'selected' : ''} ${trying ? 'trying' : ''} ${owned ? 'owned' : ''}`);
      const colorDot = it.color != null ? `<span class="dot" style="background:#${it.color.toString(16).padStart(6, '0')}"></span>` : '';
      cell.innerHTML = `<div class="ico">${it.icon}${colorDot}</div><div class="nm">${it.name}</div>${it.desc ? `<div class="tiny muted">${it.desc}</div>` : ''}`;
      if (mode === 'shop') {
        const price = el('div', `price ${owned ? 'owned' : state.cp >= it.price ? '' : 'poor'}`, owned ? '✓ Owned' : `🪙 ${it.price}`);
        cell.appendChild(price);
        const row = el('div', 'du-actions');
        if (!owned && COSMETIC_SLOTS.includes(it.slot)) { const t = el('button', 'btn small ghost', trying ? 'Trying…' : 'Try on'); t.onclick = (e) => { e.stopPropagation(); audio.click(); opts.onTry(trying ? null : id); render(); }; row.appendChild(t); }
        if (!owned) {
          const needs = it.requires && !state.owns(it.requires);
          const b = el('button', 'btn small', needs ? `Needs ${ITEMS[it.requires].name}` : 'Buy'); b.disabled = needs || state.cp < it.price;
          b.onclick = (e) => { e.stopPropagation(); opts.onBuy(id); render(); }; row.appendChild(b);
        } else if (COSMETIC_SLOTS.includes(it.slot)) { const w = el('button', 'btn small secondary', equipped ? 'Wearing' : 'Wear'); w.disabled = equipped; w.onclick = (e) => { e.stopPropagation(); audio.click(); opts.onEquip(it.slot, id); render(); }; row.appendChild(w); }
        cell.appendChild(row);
      } else {
        cell.onclick = () => { audio.click(); opts.onEquip(it.slot, id); render(); };
      }
      grid.appendChild(cell);
    }
    if (!shown) grid.appendChild(el('p', 'muted center', isNew ? 'Nothing new today.' : 'Nothing here yet.'));
    body.appendChild(grid);
  };

  render();
  return { el: root, refresh: render, foot, setTab: (t) => { current = t; render(); } };
}
