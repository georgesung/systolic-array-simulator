// Color "tones" shared by the systolic array visualizers.
//
// The 2D matmul tab uses one tone per input matrix in a batch (A1/A2/A3), while
// the tiled matmul tab uses one tone per K-tile. Both just need a consistent set
// of Tailwind class strings, so they live here rather than in either component.
//
// NOTE: these must be written as complete literal class names — Tailwind scans
// source text and will not see classes assembled at runtime.

export interface Tone {
  /** Foreground text color for idle values. */
  text: string;
  /** Subtle background for idle values. */
  bg: string;
  /** Border for idle values. */
  border: string;
  /** Border for a PE that currently has this tone's data flowing through it. */
  borderActive: string;
  /** Solid fill for the single value entering/exiting right now. */
  bgActive: string;
  /** Color for the flow arrows between PEs. */
  arrow: string;
}

export const TONES = {
  teal: {
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    border: 'border-teal-200 dark:border-teal-800',
    borderActive: 'border-teal-500 dark:border-teal-700',
    bgActive: 'bg-teal-500 text-white',
    arrow: 'text-teal-500 dark:text-teal-400',
  },
  purple: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    borderActive: 'border-purple-500 dark:border-purple-700',
    bgActive: 'bg-purple-500 text-white',
    arrow: 'text-purple-500 dark:text-purple-400',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    borderActive: 'border-amber-500 dark:border-amber-700',
    bgActive: 'bg-amber-500 text-white',
    arrow: 'text-amber-500 dark:text-amber-400',
  },
  sky: {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-800',
    borderActive: 'border-sky-500 dark:border-sky-700',
    bgActive: 'bg-sky-500 text-white',
    arrow: 'text-sky-500 dark:text-sky-400',
  },
  rose: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-800',
    borderActive: 'border-rose-500 dark:border-rose-700',
    bgActive: 'bg-rose-500 text-white',
    arrow: 'text-rose-500 dark:text-rose-400',
  },
  zinc: {
    text: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-50 dark:bg-zinc-950/20',
    border: 'border-zinc-200 dark:border-zinc-800',
    borderActive: 'border-zinc-500 dark:border-zinc-700',
    bgActive: 'bg-zinc-500 text-white',
    arrow: 'text-zinc-500 dark:text-zinc-400',
  },
} as const satisfies Record<string, Tone>;

export type ToneName = keyof typeof TONES;

/** Tones used when cycling through an indexed series (batch slot, K-tile, ...). */
const TONE_CYCLE: ToneName[] = ['teal', 'purple', 'amber', 'sky', 'rose'];

export function toneForIndex(index: number): Tone {
  return TONES[TONE_CYCLE[index % TONE_CYCLE.length]];
}
