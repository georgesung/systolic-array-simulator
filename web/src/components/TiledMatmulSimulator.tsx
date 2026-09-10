'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTiledMatmul, macsAt, phaseAt, type Phase } from '@/hooks/useTiledMatmul';
import { SystolicGrid, type PEFlow, type StreamCell } from '@/components/SystolicGrid';
import { toneForIndex } from '@/lib/tones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, StepForward, SkipForward, RotateCcw, Dices, GraduationCap } from 'lucide-react';

const formatFloat = (num: number): number => Math.round(num * 100) / 100;

/** How many queued input values to show in the array's left gutter. */
const QUEUE_PREVIEW = 4;

const MAX_M = 16;
const MAX_KN = 8;
const MAX_ARRAY = 4;

const PHASE_STYLE: Record<Phase, { bar: string; chip: string; label: string }> = {
  load: {
    bar: 'bg-violet-400 dark:bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    label: 'Weight load',
  },
  fill: {
    bar: 'bg-amber-400 dark:bg-amber-500',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    label: 'Pipeline fill',
  },
  steady: {
    bar: 'bg-emerald-500 dark:bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    label: 'Steady state',
  },
  drain: {
    bar: 'bg-sky-400 dark:bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    label: 'Pipeline drain',
  },
};

/**
 * A small matrix rendered as a grid of cells, with extra spacing drawn at tile
 * boundaries so the tiling is visible at a glance.
 */
function MiniGrid({
  rows,
  cols,
  cell,
  tileRows,
  tileCols,
  compact = false,
}: {
  rows: number;
  cols: number;
  cell: (r: number, c: number) => { text: React.ReactNode; className: string; title?: string };
  tileRows?: number;
  tileCols?: number;
  compact?: boolean;
}) {
  const size = compact ? 'w-7 h-6 text-[9px]' : 'w-10 h-9 text-[11px]';
  const gapR = compact ? 'mr-1.5' : 'mr-2';
  const gapB = compact ? 'mb-1.5' : 'mb-2';
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const { text, className, title } = cell(r, c);
          const edgeRight = tileCols && (c + 1) % tileCols === 0 && c < cols - 1;
          const edgeBottom = tileRows && (r + 1) % tileRows === 0 && r < rows - 1;
          return (
            <div
              key={`${r}-${c}`}
              title={title}
              className={`${size} flex items-center justify-center font-mono border rounded-sm transition-all duration-300 ${className} ${
                edgeRight ? gapR : ''
              } ${edgeBottom ? gapB : ''}`}
            >
              {text}
            </div>
          );
        })
      )}
    </div>
  );
}

function MatrixPanel({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-zinc-400 text-center max-w-[190px]">{hint}</span>}
    </div>
  );
}

function DimensionInput({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="font-mono text-sm w-full"
      />
      <p className="text-[10px] text-zinc-500 leading-snug">{hint}</p>
    </div>
  );
}

export function TiledMatmulSimulator() {
  // The logical problem is (M x K) x (K x N). The physical array is `array` square.
  const [m, setM] = useState(6);
  const [k, setK] = useState(4);
  const [n, setN] = useState(4);
  const [array, setArray] = useState(2);
  const [weightFifo, setWeightFifo] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const fill = (rows: number, cols: number, seed: number) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => String(((r * cols + c + seed) % 9) - 4))
    );

  const [matrixA, setMatrixA] = useState<string[][]>(() => fill(6, 4, 1));
  const [matrixB, setMatrixB] = useState<string[][]>(() => fill(4, 4, 5));

  const reshape = (matrix: string[][], rows: number, cols: number, seed: number) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => matrix[r]?.[c] ?? String(((r * cols + c + seed) % 9) - 4))
    );

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v || lo));

  const handleM = (raw: number) => {
    const next = clamp(raw, 1, MAX_M);
    setM(next);
    setMatrixA(prev => reshape(prev, next, k, 1));
  };
  const handleK = (raw: number) => {
    const next = clamp(raw, 1, MAX_KN);
    setK(next);
    setMatrixA(prev => reshape(prev, m, next, 1));
    setMatrixB(prev => reshape(prev, next, n, 5));
    setArray(a => Math.min(a, next));
  };
  const handleN = (raw: number) => {
    const next = clamp(raw, 1, MAX_KN);
    setN(next);
    setMatrixB(prev => reshape(prev, k, next, 5));
    setArray(a => Math.min(a, next));
  };
  const handleArray = (raw: number) => setArray(clamp(raw, 1, Math.min(MAX_ARRAY, k, n)));

  const randomize = (
    setter: React.Dispatch<React.SetStateAction<string[][]>>,
    rows: number,
    cols: number
  ) => {
    setter(
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => String(Math.floor(Math.random() * 11) - 5))
      )
    );
  };

  const parsedA = useMemo(() => matrixA.map(row => row.map(v => parseFloat(v) || 0)), [matrixA]);
  const parsedB = useMemo(() => matrixB.map(row => row.map(v => parseFloat(v) || 0)), [matrixB]);

  const {
    isInitialized,
    snapshot,
    passes,
    kTileCount,
    totalCycles,
    totalCyclesUnbuffered,
    tick,
    stepTile,
    reset,
  } = useTiledMatmul(m, k, n, array, array, parsedA, parsedB, weightFifo);

  const done = snapshot.done;

  useEffect(() => {
    if (!isAutoPlaying) return;
    if (done || !isInitialized) {
      const handle = requestAnimationFrame(() => setIsAutoPlaying(false));
      return () => cancelAnimationFrame(handle);
    }
    const id = setInterval(() => tick(), 700);
    return () => clearInterval(id);
  }, [isAutoPlaying, done, isInitialized, tick]);

  const handleReset = useCallback(() => {
    setIsAutoPlaying(false);
    reset();
  }, [reset]);

  const expectedC = useMemo(() => {
    const out = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let x = 0; x < k; x++) sum += (parsedA[i]?.[x] ?? 0) * (parsedB[x]?.[j] ?? 0);
        out[i][j] = sum;
      }
    }
    return out;
  }, [parsedA, parsedB, m, k, n]);

  const pass = passes[snapshot.passIdx];
  const tone = toneForIndex(pass.kt);
  // Compute cycles elapsed in this pass, excluding any weight-load stall.
  const computeCycle = Math.max(0, snapshot.cycleInPass - pass.loadCycles);
  const loading = snapshot.cycleInPass > 0 && snapshot.cycleInPass <= pass.loadCycles;
  const compact = m > 6 || k > 6 || n > 6;

  // --- Adapters for <SystolicGrid /> -----------------------------------------

  const leftQueueCells = (r: number): StreamCell[] => {
    const stream: { val: number; real: boolean }[] = [];
    // Row r's data is delayed by r cycles, so r padding zeros lead the stream.
    for (let i = 0; i < r; i++) stream.push({ val: 0, real: false });
    for (let i = 0; i < m; i++) {
      stream.push({ val: parsedA[i]?.[pass.k0 + r] ?? 0, real: r < pass.kSpan });
    }
    const visible = stream.slice(computeCycle).slice(0, QUEUE_PREVIEW).reverse();
    return visible.map((item, idx) => ({
      val: item.val,
      tone: item.real ? tone : null,
      active: idx === visible.length - 1 && !loading && computeCycle < m + r,
    }));
  };

  const bottomQueueCells = (c: number): StreamCell[] =>
    [...(snapshot.passOutputs[c] ?? [])]
      .reverse()
      .slice(0, QUEUE_PREVIEW)
      .map((item, idx) => ({
        val: item.val,
        tone: c < pass.nSpan ? tone : null,
        active: idx === 0,
      }));

  const flowAt = (r: number, c: number): PEFlow | null => {
    if (loading) return null;
    const i = computeCycle - 1 - r - c;
    if (i < 0 || i >= m || r >= pass.kSpan || c >= pass.nSpan) return null;
    return {
      tone,
      xLabel: <>(A<sub>{i},{pass.k0 + r}</sub>)</>,
      yLabel: <>(C<sub>{i},{pass.n0 + c}</sub>)</>,
    };
  };

  // --- Stats -----------------------------------------------------------------

  const utilization =
    snapshot.globalCycle === 0
      ? 0
      : Math.round((snapshot.activeMacs / (snapshot.globalCycle * array * array)) * 100);
  const idealCycles = m + k + n - 1;
  const fifoSavings = totalCyclesUnbuffered - totalCycles;
  // Useful MACs per weight load — the amortization ratio the M knob controls.
  const macsPerLoad = Math.round((m * k * n) / passes.length);

  const isFinal = (i: number, j: number) => snapshot.contributions[i][j] === kTileCount;
  const justUpdated = (i: number, j: number) =>
    snapshot.lastUpdated.some(u => u.i === i && u.j === j);

  // Per-cycle MAC profile of the current pass: the pipeline timing diagram.
  const profile = useMemo(() => {
    const peak = pass.kSpan * pass.nSpan;
    return Array.from({ length: pass.cycles }, (_, i) => {
      const cycle = i + 1;
      return { cycle, macs: macsAt(pass, cycle, m), phase: phaseAt(pass, cycle, m), peak };
    });
  }, [pass, m]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
      {/* 1. Configuration */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">Tiling Configuration</CardTitle>
          <CardDescription>
            A big matrix multiply run on a small array, one tile at a time — the way a TPU does it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DimensionInput
              label="M (rows of A)"
              hint="How many rows stream per weight load. Raise it to amortize."
              value={m}
              min={1}
              max={MAX_M}
              onChange={handleM}
            />
            <DimensionInput
              label="K (shared dim)"
              hint="Tiled across array rows. Each K-tile is a partial sum."
              value={k}
              min={1}
              max={MAX_KN}
              onChange={handleK}
            />
            <DimensionInput
              label="N (cols of B)"
              hint="Tiled across array columns."
              value={n}
              min={1}
              max={MAX_KN}
              onChange={handleN}
            />
            <DimensionInput
              label="Array size"
              hint="The fixed hardware. A TPU v1 is 256×256."
              value={array}
              min={1}
              max={Math.min(MAX_ARRAY, k, n)}
              onChange={handleArray}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3">
            <button
              onClick={() => setWeightFifo(!weightFifo)}
              className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                weightFifo
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                  : 'bg-white text-zinc-600 border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-700'
              }`}
            >
              Weight FIFO: {weightFifo ? 'ON' : 'OFF'}
            </button>
            <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              Shifting a tile into the array costs <strong>{array} cycles</strong>, one per row. With the
              FIFO on, the next tile shifts into a staging buffer <em>while the current tile computes</em>,
              so only the very first load is exposed — {fifoSavings} cycles saved across{' '}
              {passes.length} passes.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/30 px-4 py-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              B is <strong>{k}×{n}</strong> and the array is <strong>{array}×{array}</strong>, so B is chopped
              into <strong>{passes.length}</strong> tiles. Each is loaded in turn and the matching{' '}
              <strong>{m}</strong>-row slice of A is streamed through it. Partial sums from the{' '}
              <strong>{kTileCount}</strong> K-tiles are summed in the accumulator.
            </p>
          </div>

          {/* Matrix editors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {[
              { label: 'Inputs (Matrix A)', matrix: matrixA, setter: setMatrixA, rows: m, cols: k },
              { label: 'Weights (Matrix B)', matrix: matrixB, setter: setMatrixB, rows: k, cols: n },
            ].map(({ label, matrix, setter, rows, cols }) => (
              <div
                key={label}
                className="flex flex-col items-center p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-900"
              >
                <div className="flex justify-between items-center w-full mb-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {label}: {rows}×{cols}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => randomize(setter, rows, cols)}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5" /> RNG
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto w-full flex justify-center">
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                  >
                    {matrix.map((row, r) =>
                      row.map((val, c) => (
                        <input
                          key={`${r}-${c}`}
                          type="number"
                          step="any"
                          value={val}
                          onChange={e => {
                            const v = e.target.value;
                            setter(prev =>
                              prev.map((pr, ri) => pr.map((pc, ci) => (ri === r && ci === c ? v : pc)))
                            );
                          }}
                          className="w-10 h-9 text-center font-mono text-xs border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button onClick={handleReset} variant="secondary" className="w-full gap-1.5 cursor-pointer">
              <RotateCcw className="w-4 h-4" /> Restart Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Tile map + accumulator */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Tile Map &amp; Accumulator</CardTitle>
          <CardDescription>
            Pass {snapshot.passIdx + 1} of {passes.length} — B[{pass.k0}..{pass.k0 + pass.kSpan - 1},{' '}
            {pass.n0}..{pass.n0 + pass.nSpan - 1}] resident, streaming A[*, {pass.k0}..
            {pass.k0 + pass.kSpan - 1}].
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto">
          <div className="flex items-start justify-center gap-4 min-w-fit">
            <MatrixPanel label={`A (${m}×${k})`} hint="Highlighted columns feed the array this pass.">
              <MiniGrid
                rows={m}
                cols={k}
                tileCols={array}
                compact={compact}
                cell={(r, c) => {
                  const inPanel = c >= pass.k0 && c < pass.k0 + pass.kSpan;
                  return {
                    text: formatFloat(parsedA[r]?.[c] ?? 0),
                    className: inPanel
                      ? `${tone.bg} ${tone.text} ${tone.borderActive} font-bold`
                      : 'bg-white dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800',
                  };
                }}
              />
            </MatrixPanel>

            <span className="text-xl text-zinc-300 dark:text-zinc-700 font-light pt-8">×</span>

            <MatrixPanel label={`B (${k}×${n})`} hint="One tile at a time is resident in the PEs.">
              <MiniGrid
                rows={k}
                cols={n}
                tileRows={array}
                tileCols={array}
                compact={compact}
                cell={(r, c) => {
                  const inTile =
                    r >= pass.k0 && r < pass.k0 + pass.kSpan && c >= pass.n0 && c < pass.n0 + pass.nSpan;
                  return {
                    text: formatFloat(parsedB[r]?.[c] ?? 0),
                    className: inTile
                      ? `${tone.bgActive} ${tone.borderActive} font-bold shadow-sm`
                      : 'bg-white dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800',
                  };
                }}
              />
            </MatrixPanel>

            <span className="text-xl text-zinc-300 dark:text-zinc-700 font-light pt-8">=</span>

            <MatrixPanel
              label={`C (${m}×${n})`}
              hint={`Dashed = still accumulating. Solid = all ${kTileCount} K-tiles landed.`}
            >
              <MiniGrid
                rows={m}
                cols={n}
                tileCols={array}
                compact={compact}
                cell={(r, c) => {
                  const count = snapshot.contributions[r][c];
                  const val = snapshot.matrixC[r][c];
                  if (justUpdated(r, c)) {
                    return {
                      text: formatFloat(val),
                      className: `${tone.bgActive} border-zinc-600 font-bold shadow-md`,
                      title: `${count} of ${kTileCount} K-tiles accumulated`,
                    };
                  }
                  if (count === 0) {
                    return {
                      text: '-',
                      className:
                        'bg-zinc-50 dark:bg-zinc-900/40 text-zinc-300 dark:text-zinc-700 border-dashed border-zinc-200 dark:border-zinc-800',
                      title: 'No partial sums yet',
                    };
                  }
                  if (isFinal(r, c)) {
                    return {
                      text: formatFloat(val),
                      className:
                        'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold',
                      title: `Final (${count} of ${kTileCount} K-tiles)`,
                    };
                  }
                  return {
                    text: formatFloat(val),
                    className:
                      'bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-dashed border-amber-300 dark:border-amber-800 italic',
                    title: `Partial: ${count} of ${kTileCount} K-tiles accumulated`,
                  };
                }}
              />
            </MatrixPanel>
          </div>

          {/* Pass schedule strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            {passes.map(p => {
              const state =
                p.index < snapshot.passIdx ? 'done' : p.index === snapshot.passIdx ? 'current' : 'todo';
              const pTone = toneForIndex(p.kt);
              return (
                <span
                  key={p.index}
                  title={`Pass ${p.index + 1}: B tile (k${p.kt}, n${p.nt})`}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                    state === 'current'
                      ? `${pTone.bgActive} ${pTone.borderActive} shadow-sm`
                      : state === 'done'
                      ? `${pTone.bg} ${pTone.text} ${pTone.border} opacity-70`
                      : 'bg-white dark:bg-zinc-950 text-zinc-300 dark:text-zinc-700 border-dashed border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  k{p.kt}n{p.nt}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. The physical array */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950 overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight">
                Physical Array ({array}×{array})
              </CardTitle>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${PHASE_STYLE[snapshot.phase].chip}`}
              >
                {PHASE_STYLE[snapshot.phase].label}
              </span>
            </div>
            <CardDescription>
              The same hardware for every tile. Only the resident weights change.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              disabled={done || !isInitialized}
              variant={isAutoPlaying ? 'secondary' : 'default'}
              className="w-32 shadow-sm gap-1.5"
            >
              {isAutoPlaying ? (
                <><Pause className="w-4 h-4" /> Pause</>
              ) : (
                <><Play className="w-4 h-4" /> Auto-Play</>
              )}
            </Button>
            <Button
              onClick={tick}
              disabled={done || isAutoPlaying || !isInitialized}
              variant="outline"
              className="shadow-sm gap-1.5"
            >
              <StepForward className="w-4 h-4" /> Cycle
            </Button>
            <Button
              onClick={stepTile}
              disabled={done || isAutoPlaying || !isInitialized}
              variant="outline"
              className="shadow-sm gap-1.5"
            >
              <SkipForward className="w-4 h-4" /> Tile
            </Button>
          </div>
        </CardHeader>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 px-6 py-3 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/30">
          <span className="text-xs font-bold font-mono bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800">
            Cycle {snapshot.globalCycle} / {totalCycles}
          </span>
          <span className="text-xs font-bold font-mono bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800">
            Tile cycle {snapshot.cycleInPass} / {pass.cycles}
          </span>
          <span className="text-xs font-bold font-mono bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800">
            Weight loads: {snapshot.weightLoads} / {passes.length}
          </span>
          <span className="text-xs font-bold font-mono bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800">
            MACs per load: {macsPerLoad}
          </span>
          <span className="text-xs font-bold font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">
            MAC utilization: {utilization}%
          </span>
        </div>

        <CardContent className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[360px]">
          {/* Pipeline timing diagram for the current pass */}
          <div className="w-full max-w-3xl mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Pass timeline
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                peak {pass.kSpan * pass.nSpan} MACs/cycle
              </span>
            </div>
            <div className="flex items-end gap-px h-16 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">
              {profile.map(({ cycle, macs, phase, peak }) => {
                const isNow = cycle === snapshot.cycleInPass;
                const height = phase === 'load' ? 12 : Math.max((macs / peak) * 100, 4);
                return (
                  <div
                    key={cycle}
                    title={`cycle ${cycle}: ${PHASE_STYLE[phase].label}, ${macs} MACs`}
                    className="flex-1 min-w-[2px] h-full flex items-end"
                  >
                    <div
                      className={`w-full rounded-sm transition-all duration-200 ${PHASE_STYLE[phase].bar} ${
                        isNow ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-900' : ''
                      } ${cycle > snapshot.cycleInPass ? 'opacity-30' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {(Object.keys(PHASE_STYLE) as Phase[]).map(ph => (
                <span key={ph} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className={`w-2.5 h-2.5 rounded-sm ${PHASE_STYLE[ph].bar}`} />
                  {PHASE_STYLE[ph].label}
                </span>
              ))}
            </div>
          </div>

          {/* Weight FIFO staging buffer */}
          {weightFifo && (
            <div className="w-full max-w-3xl mb-6 flex items-center gap-4 rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 px-4 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                  Weight FIFO
                </span>
                <div className="flex flex-col gap-0.5">
                  {Array.from({ length: array }).map((_, r) => {
                    // Rows are pushed bottom-first, so after `fifoRows` cycles the
                    // last `fifoRows` rows of the next tile are staged.
                    const staged = r >= array - snapshot.fifoRows;
                    const next = snapshot.fifoPassIdx !== null ? passes[snapshot.fifoPassIdx] : null;
                    return (
                      <div key={r} className="flex gap-0.5">
                        {Array.from({ length: array }).map((_, c) => (
                          <div
                            key={c}
                            className={`w-6 h-5 flex items-center justify-center font-mono text-[9px] border rounded-sm transition-all ${
                              staged && next
                                ? 'bg-violet-500 text-white border-violet-600 font-bold'
                                : 'bg-white/60 dark:bg-zinc-950/60 text-zinc-300 dark:text-zinc-700 border-dashed border-violet-200 dark:border-violet-900'
                            }`}
                          >
                            {staged && next
                              ? formatFloat(parsedB[next.k0 + r]?.[next.n0 + c] ?? 0)
                              : '·'}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-violet-900 dark:text-violet-200 leading-relaxed">
                {snapshot.fifoPassIdx !== null ? (
                  <>
                    Staging tile <strong>k{passes[snapshot.fifoPassIdx].kt}n
                    {passes[snapshot.fifoPassIdx].nt}</strong> ({snapshot.fifoRows}/{array} rows) while the
                    array computes with the current one. When this pass ends the staged tile swaps in with
                    zero stall — that is the whole point of the FIFO.
                  </>
                ) : done ? (
                  <>Schedule complete — nothing left to stage.</>
                ) : (
                  <>
                    Nothing staged yet. The first tile has to shift in the hard way ({array} cycles), because
                    there is no earlier pass to hide it behind.
                  </>
                )}
              </p>
            </div>
          )}

          <SystolicGrid
            rows={array}
            cols={array}
            peStates={snapshot.peStates}
            isInitialized={isInitialized}
            leftGutterPx={40 + QUEUE_PREVIEW * 34}
            topLabel={c =>
              c < pass.nSpan ? <>B<sub>*,{pass.n0 + c}</sub></> : <span className="opacity-40">pad</span>
            }
            leftLabel={r =>
              r < pass.kSpan ? <>A<sub>*,{pass.k0 + r}</sub></> : <span className="opacity-40">pad</span>
            }
            bottomLabel={c =>
              c < pass.nSpan ? <>C<sub>*,{pass.n0 + c}</sub></> : <span className="opacity-40">pad</span>
            }
            leftQueue={leftQueueCells}
            bottomQueue={bottomQueueCells}
            bottomOverflow={c => (snapshot.passOutputs[c]?.length ?? 0) > QUEUE_PREVIEW}
            flowAt={flowAt}
            peMuted={(r, c) => r >= pass.kSpan || c >= pass.nSpan}
          />

          <div className="mt-8 text-center max-w-2xl space-y-2">
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> Educational Concept
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Every tile pass pays two fixed taxes no matter how much work it does: shifting{' '}
              <strong>{array} rows</strong> of weights in, and filling then draining the pipeline. The only
              way to make them cheap is to spread them over more work — so raise <strong>M</strong> and watch
              the steady-state plateau widen and utilization climb toward 100%. This is why accelerators
              want large batches, and why a {m}×{k} × {k}×{n} multiply that would take {idealCycles} cycles
              on a full {k}×{n} array takes {totalCycles} on this {array}×{array} one.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Verification */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-md font-bold tracking-tight">Expected Result C (Math)</CardTitle>
          <CardDescription>
            The plain A × B result. The accumulator above must converge to exactly this.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-6 overflow-x-auto">
          <MiniGrid
            rows={m}
            cols={n}
            tileCols={array}
            compact={compact}
            cell={(r, c) => {
              const matched = isFinal(r, c) && Math.abs(snapshot.matrixC[r][c] - expectedC[r][c]) < 1e-3;
              return {
                text: formatFloat(expectedC[r][c]),
                className: matched
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold'
                  : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
              };
            }}
          />
          {done && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Schedule complete — {passes.length} tile passes, {snapshot.globalCycle} cycles.
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
