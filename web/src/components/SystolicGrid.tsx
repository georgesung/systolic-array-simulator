'use client';

import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import type { Tone } from '@/lib/tones';

const formatFloat = (num: number): number => Math.round(num * 100) / 100;

/** The three registers each PE exposes through `get_state()` on the Rust side. */
export interface PERegisters {
  weight: number;
  xOut: number;
  yOut: number;
}

/** One box in the left input queue or the bottom output stack. */
export interface StreamCell {
  val: number;
  /** Omit for the neutral "padding zero" look. */
  tone?: Tone | null;
  /** Solid-fill highlight: the value entering or exiting on this very cycle. */
  active?: boolean;
}

/** Describes the data currently flowing through a PE, if any. */
export interface PEFlow {
  tone: Tone;
  /** Small annotation next to the x register, e.g. `A1(0,2)`. */
  xLabel?: React.ReactNode;
  /** Small annotation next to the y register, e.g. `C1(0,2)`. */
  yLabel?: React.ReactNode;
}

export interface SystolicGridProps {
  /** Physical array dimensions (K rows x N cols). */
  rows: number;
  cols: number;
  peStates: PERegisters[][];
  /** Weight to display before the simulation has been initialized. */
  fallbackWeight?: (r: number, c: number) => number;
  isInitialized: boolean;
  /** Width of the gutter holding the left input queues. */
  leftGutterPx?: number;
  topLabel?: (c: number) => React.ReactNode;
  leftLabel?: (r: number) => React.ReactNode;
  bottomLabel?: (c: number) => React.ReactNode;
  leftQueue?: (r: number) => StreamCell[];
  bottomQueue?: (c: number) => StreamCell[];
  /** Show a "..." marker under a column whose output stack was truncated. */
  bottomOverflow?: (c: number) => boolean;
  flowAt?: (r: number, c: number) => PEFlow | null;
  /** Defaults to `PE(r,c)`. */
  peBadge?: (r: number, c: number) => React.ReactNode;
  /** Dim a PE that holds only zero padding (a partial tile). */
  peMuted?: (r: number, c: number) => boolean;
}

/**
 * Presentational render of a weight-stationary 2D systolic array: the PE grid,
 * the input queues feeding it from the left, and the results stacking up below.
 *
 * This component holds no simulation state of its own. Everything it draws comes
 * from the callbacks above, so the same grid serves both the plain 2D matmul tab
 * and the tiled matmul tab (where it shows one tile at a time).
 */
export function SystolicGrid({
  rows,
  cols,
  peStates,
  fallbackWeight,
  isInitialized,
  leftGutterPx = 140,
  topLabel,
  leftLabel,
  bottomLabel,
  leftQueue,
  bottomQueue,
  bottomOverflow,
  flowAt,
  peBadge,
  peMuted,
}: SystolicGridProps) {
  return (
    <div className="w-full overflow-x-auto py-6 px-2 flex justify-center">
      <div
        className="grid gap-x-14 gap-y-10 relative p-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 min-w-[650px]"
        style={{
          gridTemplateColumns: `${leftGutterPx}px repeat(${cols}, minmax(110px, 1fr))`,
        }}
      >
        {/* TOP ROW: weight column headers */}
        <div key="top-spacer" className="h-6 flex items-center justify-center"></div>
        {Array.from({ length: cols }).map((_, c) => (
          <div
            key={`top-col-${c}`}
            className="flex flex-col items-center justify-end h-6 text-zinc-400 dark:text-zinc-600 font-mono text-xs font-semibold"
          >
            <span className="flex flex-col items-center">
              {topLabel ? topLabel(c) : <>B<sub>*,{c}</sub></>}
              <ArrowDown className="w-3.5 h-3.5 mt-0.5 text-zinc-300 dark:text-zinc-700" />
            </span>
          </div>
        ))}

        {/* MIDDLE ROWS: left input queue + PEs */}
        {Array.from({ length: rows }).map((_, r) => {
          const queue = leftQueue ? leftQueue(r) : [];

          return (
            <React.Fragment key={`row-${r}`}>
              {/* Left input queue for row r */}
              <div className="flex items-center justify-end h-28 pr-2">
                <div className="flex items-center justify-end gap-1 w-full font-mono">
                  <span className="text-[10px] text-zinc-400 mr-1 font-bold">
                    {leftLabel ? leftLabel(r) : <>A<sub>*,{r}</sub></>}
                  </span>
                  {queue.map((item, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold shadow-sm transition-all duration-300 shrink-0 ${
                        !item.tone
                          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800'
                          : item.active
                          ? `${item.tone.bgActive} scale-105 font-bold`
                          : `${item.tone.bg} ${item.tone.text} ${item.tone.border}`
                      }`}
                    >
                      {formatFloat(item.val)}
                    </div>
                  ))}
                  <ArrowRight className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                </div>
              </div>

              {/* PEs for this row */}
              {Array.from({ length: cols }).map((_, c) => {
                const state =
                  peStates[r]?.[c] ??
                  { weight: fallbackWeight ? fallbackWeight(r, c) : 0, xOut: 0, yOut: 0 };
                const flow = flowAt ? flowAt(r, c) : null;
                const muted = peMuted ? peMuted(r, c) : false;
                const isPeActive = isInitialized && (state.xOut !== 0 || state.yOut !== 0);

                return (
                  <div
                    key={`pe-${r}-${c}`}
                    className={`relative flex flex-col items-center justify-center p-3 bg-white dark:bg-zinc-950 border-2 rounded-xl shadow-md transition-all duration-300 w-28 h-28 mx-auto ${
                      muted
                        ? 'border-dashed border-zinc-200 dark:border-zinc-800 opacity-50'
                        : flow
                        ? `border-2 ${flow.tone.borderActive} ring-2 ring-indigo-500/10`
                        : isPeActive
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:ring-indigo-400/20'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <span className="absolute top-1 right-2 text-[8px] font-bold text-zinc-400">
                      {peBadge ? peBadge(r, c) : `PE(${r},${c})`}
                    </span>

                    <div className="text-center space-y-1 select-none">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        w: {formatFloat(state.weight)}
                      </p>
                      <div className="flex flex-col gap-0.5 justify-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-dashed border-zinc-100 dark:border-zinc-900 pt-1 mt-1">
                        <span
                          className={
                            isInitialized && state.xOut !== 0
                              ? `font-bold ${flow?.tone.text ?? 'text-emerald-600 dark:text-emerald-400'}`
                              : 'text-zinc-400 dark:text-zinc-600'
                          }
                        >
                          x: {isInitialized ? formatFloat(state.xOut) : 0}
                          {flow?.xLabel && (
                            <span className="text-[8px] font-bold opacity-80 ml-1">{flow.xLabel}</span>
                          )}
                        </span>
                        <span
                          className={
                            isInitialized && state.yOut !== 0
                              ? `font-bold ${flow?.tone.text ?? 'text-blue-600 dark:text-blue-400'}`
                              : 'text-zinc-400 dark:text-zinc-600'
                          }
                        >
                          y: {isInitialized ? formatFloat(state.yOut) : 0}
                          {flow?.yLabel && (
                            <span className="text-[8px] font-bold opacity-80 ml-1">{flow.yLabel}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Connection arrows: right (activations) and down (partial sums) */}
                    {c < cols - 1 && (
                      <div className="absolute top-1/2 -right-10 -translate-y-1/2 flex items-center z-10">
                        <ArrowRight
                          className={`w-5 h-5 transition-colors duration-300 scale-110 font-bold ${
                            flow
                              ? flow.tone.arrow
                              : isInitialized && state.xOut !== 0
                              ? 'text-emerald-500'
                              : 'text-zinc-200 dark:text-zinc-800'
                          }`}
                        />
                      </div>
                    )}
                    {r < rows - 1 && (
                      <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 flex flex-col items-center z-10">
                        <ArrowDown
                          className={`w-5 h-5 transition-colors duration-300 scale-110 font-bold ${
                            flow
                              ? flow.tone.arrow
                              : isInitialized && state.yOut !== 0
                              ? 'text-blue-500'
                              : 'text-zinc-200 dark:text-zinc-800'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* BOTTOM ROW: output stack for each column */}
        <div key="bottom-spacer" className="min-h-28"></div>
        {Array.from({ length: cols }).map((_, c) => {
          const outs = bottomQueue ? bottomQueue(c) : [];

          return (
            <div key={`col-out-${c}`} className="flex flex-col items-center min-h-28">
              <ArrowDown className="w-4 h-4 text-blue-500 mb-1 shrink-0" />
              <div className="flex flex-col items-center gap-1 w-full font-mono">
                {outs.map((item, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold shadow-sm transition-all duration-300 ${
                      !item.tone
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800'
                        : item.active
                        ? `${item.tone.bgActive} border-zinc-600 scale-105 font-bold animate-pulse`
                        : `${item.tone.bg} ${item.tone.text} ${item.tone.border}`
                    }`}
                  >
                    {formatFloat(item.val)}
                  </div>
                ))}
                {bottomOverflow?.(c) && (
                  <span className="text-[8px] text-zinc-400 font-bold leading-none">...</span>
                )}
                <span className="text-[9px] text-zinc-400 mt-0.5 font-bold">
                  {bottomLabel ? bottomLabel(c) : <>C<sub>*,{c}</sub></>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
