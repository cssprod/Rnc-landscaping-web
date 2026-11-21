// @ts-check
/**
 * Living vector art (CONTRACT §10, frozen signatures). W1 stub: every function
 * returns '' so pages can already call them; W2 `living` implements the layered,
 * theme-reactive scenes (site/COMPONENTS.md "New primitives").
 */

/**
 * A layered landscape scene: `div.scene.scene--{variant}` holding 4–6 outer `svg.scene__layer` boxes.
 * @param {string} sceneId `home`, `area-<slug>`, `svc-<slug>`, `process`, `cta`, `404`…
 * @param {{ variant?: 'hero'|'band'|'card', aspect?: string, priority?: boolean, label?: string }} [o]
 * @returns {any}
 */
export function livingScene(sceneId, o = {}) {
  void sceneId; void o;
  return '';
}

/**
 * Per-project art (replaces stock under /projects/).
 * @param {any} project project object (CONTRACT §6)
 * @param {{ aspect?: string, variant?: string }} [o]
 * @returns {any}
 */
export function projectArt(project, o = {}) {
  void project; void o;
  return '';
}

/** Visible "Illustration" chip (`span.media__chip.media__chip--art`). @returns {any} */
export function illustrationChip() {
  return '';
}
