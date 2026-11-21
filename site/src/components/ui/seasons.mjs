// @ts-check
/**
 * Seasons: the seasonal planner cards.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html } from '../../lib/html.mjs';
import { icon, SEASON_ICON } from '../sprite.mjs';

/** Seasonal planner cards. @param {{ season: string, items: string[] }[]} list */
export const seasons = (list) => html`<div class="seasons">${list.map((x) => html`<div class="glass-card season season--${String(x.season).toLowerCase()}">
  <h3>${icon(SEASON_ICON[/** @type {keyof typeof SEASON_ICON} */ (x.season)] || 'leaf', { size: 20 })}${x.season}</h3>
  <ul>${x.items.map((i) => html`<li>${i}</li>`)}</ul>
</div>`)}</div>`;
