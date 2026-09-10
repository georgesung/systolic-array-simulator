'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTiledMatmul } from '@/hooks/useTiledMatmul';
import { SystolicGrid, type PEFlow, type StreamCell } from '@/components/SystolicGrid';
import { toneForIndex } from '@/lib/tones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, StepForward, SkipForward, RotateCcw, Dices, GraduationCap } from 'lucide-react';

const formatFloat = (num: number): number => Math.round(num * 100) / 100;

/** How many queued input values to show in the array's left gutter. */
const QUEUE_PREVIEW = 4;

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
}: {
  rows: number;
  cols: number;
  cell: (r: number, c: number) => { text: React.ReactNode; className: string; title?: string };
  tileRows?: number;
  tileCols?: number;
}) {
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
              className={`w-10 h-9 flex items-center justify-center font-mono text-[11px] border rounded-sm transition-all duration-300 ${className} ${
                edgeRight ? 'mr-2' : ''
              } ${edgeBottom ? 'mb-2' : ''}`}
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
      {hint && <span className="text-[10px] text-zinc-400 text-center max-w-[180px]">{hint}</span>}
    </div>
  );
}

export function TiledMatmulSimulator() {
  // Logical problem: square, size x size. The physical array is tile x tile.
  const [size, setSize] = useState(4);
  const [tile, setTile] = useState(2);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const makeMatrix = (dim: number, seed: number) =>
    Array.from({ length: dim }, (_, r) =>
      Array.from({ length: dim }, (_, c) => String(((r * dim + c + seed) % 9) - 4))
    );

  const [matrixA, setMatrixA] = useState<string[][]>(() => makeMatrix(4, 1));
  const [matrixB, setMatrixB] = useState<string[][]>(() => makeMatrix(4, 5));

  const resize = (matrix: string[][], dim: number, seed: number) =>
    Array.from({ length: dim }, (_, r) =>
      Array.from({ length: dim }, (_, c) => matrix[r]?.[c] ?? String(((r * dim + c + seed) % 9) - 4))
    );

  const handleSizeChange = (raw: number) => {
    const next = Math.max(2, Math.min(8, raw || 2));
    setSize(next);
    setMatrixA(prev => resize(prev, next, 1));
    setMatrixB(prev => resize(prev, next, 5));
    // A tile can never be larger than the matrix it slices.
    setTile(t => Math.min(t, next));
  };

  const handleTileChange = (raw: number) => {
    setTile(Math.max(1, Math.min(Math.min(4, size), raw || 1)));
  };

  const randomize = (setter: React.Dispatch<React.SetStateAction<string[][]>>) => {
    setter(
      Array.from({ length: size }, () =>
        Array.from({ length: size }, () => String(Math.floor(Math.random() * 11) - 5))
      )
    );
  };

  const parsedA = useMemo(
    () => matrixA.map(row => row.map(v => parseFloat(v) || 0)),
    [matrixA]
  );
  const parsedB = useMemo(
    () => matrixB.map(row => row.map(v => parseFloat(v) || 0)),
    [matrixB]
  );

  const m = size;
  const k = size;
  const n = size;

  const {
    isLoaded,
    isInitialized,
    snapshot,
    passes,
    kTileCount,
    totalCycles,
    tick,
    stepTile,
    reset,
  } = useTiledMatmul(m, k, n, tile, tile, parsedA, parsedB);

  const done = snapshot?.done ?? false;

  useEffect(() => {
    if (!isAutoPlaying) return;
    if (done || !isInitialized) {
      const handle = requestAnimationFrame(() => setIsAutoPlaying(false));
      return () => cancelAnimationFrame(handle);
    }
    const id = setInterval(() => tick(), 1000);
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

  if (!isLoaded || !snapshot) {
    return (
      <div className="p-8 text-center font-mono text-muted-foreground">Loading WASM module...</div>
    );
  }

  const pass = passes[snapshot.passIdx];
  const tone = toneForIndex(pass.kt);
  const cycleInPass = snapshot.cycleInPass;

  // --- Adapters for <SystolicGrid /> -----------------------------------------

  const leftQueueCells = (r: number): StreamCell[] => {
    const stream: { val: number; real: boolean }[] = [];
    // Row r's data is delayed by r cycles, so r padding zeros lead the stream.
    for (let i = 0; i < r; i++) stream.push({ val: 0, real: false });
    for (let i = 0; i < m; i++) {
      stream.push({ val: parsedA[i]?.[pass.k0 + r] ?? 0, real: r < pass.kSpan });
    }
    const visible = stream.slice(cycleInPass).slice(0, QUEUE_PREVIEW).reverse();
    return visible.map((item, idx) => ({
      val: item.val,
      tone: item.real ? tone : null,
      active: idx === visible.length - 1 && cycleInPass < m + r,
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
    const i = cycleInPass - 1 - r - c;
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
      : Math.round((snapshot.activeMacs / (snapshot.globalCycle * tile * tile)) * 100);
  const idealCycles = m + k + n - 1;

  const isFinal = (i: number, j: number) => snapshot.contributions[i][j] === kTileCount;
  const justUpdated = (i: number, j: number) =>
    snapshot.lastUpdated.some(u => u.i === i && u.j === j);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
      {/* 1. Configuration */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">Tiling Configuration</CardTitle>
          <CardDescription>
            A big matrix multiply run on a small array, one tile at a time — the way real
            accelerators do it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Matrix Dimension (N)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={size}
                  onChange={e => handleSizeChange(parseInt(e.target.value))}
                  className="font-mono text-sm w-24"
                />
                <span className="text-xs text-zinc-500">The logical problem: {m}×{k} × {k}×{n}.</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Physical Array Size
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={1}
                  max={Math.min(4, size)}
                  value={tile}
                  onChange={e => handleTileChange(parseInt(e.target.value))}
                  className="font-mono text-sm w-24"
                />
                <span className="text-xs text-zinc-500">
                  The hardware you actually have: {tile}×{tile} PEs.
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3">
            <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              A <strong>{k}×{n}</strong> weight matrix does not fit in a <strong>{tile}×{tile}</strong> array,
              so B is chopped into <strong>{passes.length}</strong> tiles. Each one is loaded into the array
              in turn and the matching slice of A is streamed through it. Partial sums from different
              K-tiles are summed in the accumulator below.
            </p>
          </div>

          {/* Matrix editors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {[
              { label: 'Inputs (Matrix A)', matrix: matrixA, setter: setMatrixA },
              { label: 'Weights (Matrix B)', matrix: matrixB, setter: setMatrixB },
            ].map(({ label, matrix, setter }) => (
              <div
                key={label}
                className="flex flex-col items-center p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-900"
              >
                <div className="flex justify-between items-center w-full mb-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {label}: {size}×{size}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => randomize(setter)}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5" /> RNG
                  </Button>
                </div>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
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
            Pass {snapshot.passIdx + 1} of {passes.length} — loading B[{pass.k0}..{pass.k0 + pass.kSpan - 1},{' '}
            {pass.n0}..{pass.n0 + pass.nSpan - 1}] and streaming A[*, {pass.k0}..{pass.k0 + pass.kSpan - 1}].
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto">
          <div className="flex items-center justify-center gap-4 min-w-fit">
            <MatrixPanel label="A (inputs)" hint="Highlighted columns feed the array this pass.">
              <MiniGrid
                rows={m}
                cols={k}
                tileCols={tile}
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

            <span className="text-xl text-zinc-300 dark:text-zinc-700 font-light">×</span>

            <MatrixPanel label="B (weights)" hint="One tile at a time is resident in the PEs.">
              <MiniGrid
                rows={k}
                cols={n}
                tileRows={tile}
                tileCols={tile}
                cell={(r, c) => {
                  const inTile =
                    r >= pass.k0 &&
                    r < pass.k0 + pass.kSpan &&
                    c >= pass.n0 &&
                    c < pass.n0 + pass.nSpan;
                  return {
                    text: formatFloat(parsedB[r]?.[c] ?? 0),
                    className: inTile
                      ? `${tone.bgActive} ${tone.borderActive} font-bold scale-105 shadow-sm`
                      : 'bg-white dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800',
                  };
                }}
              />
            </MatrixPanel>

            <span className="text-xl text-zinc-300 dark:text-zinc-700 font-light">=</span>

            <MatrixPanel
              label="C (accumulator)"
              hint={`Dashed = still accumulating. Solid = all ${kTileCount} K-tiles landed.`}
            >
              <MiniGrid
                rows={m}
                cols={n}
                tileCols={tile}
                cell={(r, c) => {
                  const count = snapshot.contributions[r][c];
                  const val = snapshot.matrixC[r][c];
                  if (justUpdated(r, c)) {
                    return {
                      text: formatFloat(val),
                      className: `${tone.bgActive} border-zinc-600 font-bold scale-110 shadow-md`,
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
                      ? `${pTone.bgActive} ${pTone.borderActive} scale-110 shadow-sm`
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
                Physical Array ({tile}×{tile})
              </CardTitle>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                WASM Active
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
            Tile cycle {cycleInPass} / {pass.cycles}
          </span>
          <span className="text-xs font-bold font-mono bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800">
            Weight loads: {snapshot.weightLoads}
          </span>
          <span className="text-xs font-bold font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">
            MAC utilization: {utilization}%
          </span>
        </div>

        <CardContent className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[360px]">
          <SystolicGrid
            rows={tile}
            cols={tile}
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
              An untiled {n}×{n} multiply would finish in <strong>{idealCycles} cycles</strong> — but it
              would need <strong>{k * n} PEs</strong>. On this {tile}×{tile} array the same work takes{' '}
              <strong>{totalCycles} cycles</strong> and <strong>{passes.length} weight loads</strong>,
              because every tile pays the pipeline fill and drain cost again. That gap is why real
              accelerators build arrays as large as they can and feed them matrices big enough to keep
              them full.
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
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <MiniGrid
            rows={m}
            cols={n}
            tileCols={tile}
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
