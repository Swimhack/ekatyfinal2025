/**
 * Grub Roulette wedge palette — "modern Texas heritage".
 *
 * Warm industrial charcoal, bone linen, field sage and reclaimed-wood honey,
 * alternating dark/light so every restaurant name sits on a deliberately
 * high-contrast background. Shared by the live wheel and the homepage teaser so
 * the two never drift apart.
 */

export interface WedgeTheme {
  fill: string
  /** Label colour, always the high-contrast partner of `fill`. */
  text: string
  /** Faint halo that keeps the label legible over the wedge seams. */
  halo: string
}

export const WEDGE_THEMES: WedgeTheme[] = [
  { fill: '#2b2521', text: '#faf5ea', halo: 'rgba(14,12,10,0.55)' },
  { fill: '#e6d5b6', text: '#221d17', halo: 'rgba(253,250,244,0.5)' },
  { fill: '#3e5245', text: '#f2f7ee', halo: 'rgba(12,18,12,0.55)' },
  { fill: '#cfa267', text: '#251a10', halo: 'rgba(253,246,232,0.5)' },
  { fill: '#3a332c', text: '#faf5ea', halo: 'rgba(14,12,10,0.55)' },
  { fill: '#f0e3c9', text: '#221d17', halo: 'rgba(253,250,244,0.5)' },
  { fill: '#2e3c31', text: '#f2f7ee', halo: 'rgba(12,18,12,0.55)' },
  { fill: '#bd8747', text: '#221709', halo: 'rgba(253,246,232,0.5)' },
]

/** Wheel casing and hub, kept in one place for the same reason. */
export const WHEEL_CHROME = {
  casing: '#1b1815',
  brass: '#cfa267',
  hairline: 'rgba(247,241,230,0.22)',
  seam: 'rgba(27,24,21,0.55)',
  hubFace: '#f7f1e6',
  hubRing: '#b91c1c',
  hubText: '#b91c1c',
  hubSubText: '#7c5228',
  pointer: '#f7f1e6',
}
