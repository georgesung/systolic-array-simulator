import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import init, { SystolicArray2DSim } from 'rust-hw-playground';
import type { PERegisters } from '@/components/SystolicGrid';

/**
 * Tiled matrix multiply on a fixed-size weight-stationary systolic array — the
 * TPU model.
 *
 * The Rust core only knows how to run ONE weight-stationary pass over an array
 * of a given size. Real accelerators have a fixed array (256x256 on a TPU v1)
 * and much larger matrices, so they chop B into tiles, load one tile at a time
 * into the PEs, stream A through it, and sum partial results from different
 * K-tiles in an accumulator.
 *
 * This hook is that scheduler. It owns:
 *   - the list of tile passes,
 *   - a fresh SystolicArray2DSim per pass (the physical array, reused),
 *   - the weight FIFO that stages the next tile while the current one computes,
 *   - the accumulator holding C while partial sums arrive from several K-tiles.
 *
 * Tiles are visited in `for each N-tile { for each K-tile { ... } }` order, with
 * all M rows streamed innermost. That is the Goto/BLIS loop order: B is read
 * once, A is re-read once per N-tile, and each C cell is written once per
 * K-tile.
 */

/** Where a cycle sits in the classic pipeline timing diagram. */
export type Phase = 'load' | 'fill' | 'steady' | 'drain';

/** One pass over the physical array: load a B tile, stream the matching A panel. */
export interface TilePass {
  index: number;
  /** Tile coordinates within the logical problem. */
  kt: number;
  nt: number;
  /** Where this tile starts in the logical matrices. */
  k0: number;
  n0: number;
  /** Real (unpadded) extent of the tile. Smaller than tk/tn on edge tiles. */
  kSpan: number;
  nSpan: number;
  /**
   * Weight-load cycles this pass actually stalls for. Shifting a tile into the
   * array costs one cycle per row; with the weight FIFO enabled that shift
   * happens during the previous pass's compute, so only the very first pass
   * pays for it out in the open.
   */
  loadCycles: number;
  /** Cycles to stream M rows through a tk x tn array and drain it. */
  computeCycles: number;
  /** loadCycles + computeCycles. */
  cycles: number;
}

export interface TiledSnapshot {
  passIdx: number;
  /** Cycles elapsed within the current pass, including its weight load. */
  cycleInPass: number;
  /** Cycles elapsed across every pass so far. */
  globalCycle: number;
  phase: Phase;
  /** Registers of the physical array, tk x tn. */
  peStates: PERegisters[][];
  /** Rows of the NEXT tile staged in the weight FIFO, 0..tk. */
  fifoRows: number;
  /** Which pass the staged tile belongs to, or null when nothing is staging. */
  fifoPassIdx: number | null;
  /** Accumulator buffer: partial (or final) values of C, m x n. */
  matrixC: number[][];
  /** How many K-tiles have landed in each C cell. Equal to kTileCount => final. */
  contributions: number[][];
  /** C cells written on the most recent cycle, for highlighting. */
  lastUpdated: { i: number; j: number }[];
  /** Values that have left the bottom of each physical column during this pass. */
  passOutputs: { i: number; val: number }[][];
  /** How many tiles have been shifted into the array. */
  weightLoads: number;
  /** Running count of PEs doing useful (non-padding) work, summed over cycles. */
  activeMacs: number;
  done: boolean;
}

function zeros(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function tileEdges(total: number, tile: number): { start: number; span: number }[] {
  const out: { start: number; span: number }[] = [];
  for (let s = 0; s < total; s += tile) {
    out.push({ start: s, span: Math.min(tile, total - s) });
  }
  return out;
}

function buildPasses(
  m: number,
  k: number,
  n: number,
  tk: number,
  tn: number,
  weightFifo: boolean
): TilePass[] {
  const kTiles = tileEdges(k, tk);
  const nTiles = tileEdges(n, tn);
  const computeCycles = m + tk + tn - 1;
  const passes: TilePass[] = [];
  // N outer, K inner: finish one column-block of C before moving on.
  nTiles.forEach((nTile, nt) => {
    kTiles.forEach((kTile, kt) => {
      // Shifting a tile in costs one cycle per array row. The FIFO hides every
      // load but the first, because there is no earlier pass to hide it behind.
      const loadCycles = !weightFifo || passes.length === 0 ? tk : 0;
      passes.push({
        index: passes.length,
        kt,
        nt,
        k0: kTile.start,
        n0: nTile.start,
        kSpan: kTile.span,
        nSpan: nTile.span,
        loadCycles,
        computeCycles,
        cycles: loadCycles + computeCycles,
      });
    });
  });
  return passes;
}

/** PEs doing useful (non-padding) work on a given cycle of a pass. */
export function macsAt(pass: TilePass, cycle: number, m: number): number {
  if (cycle <= pass.loadCycles) return 0;
  const c = cycle - pass.loadCycles;
  let count = 0;
  for (let r = 0; r < pass.kSpan; r++) {
    for (let j = 0; j < pass.nSpan; j++) {
      const i = c - 1 - r - j;
      if (i >= 0 && i < m) count += 1;
    }
  }
  return count;
}

export function phaseAt(pass: TilePass, cycle: number, m: number): Phase {
  if (cycle <= pass.loadCycles) return 'load';
  const c = cycle - pass.loadCycles;
  // Once the last row of A has entered, nothing new arrives — the array empties.
  if (c > m) return 'drain';
  // Until the wavefront has reached the far corner, some PEs are still idle.
  return c < pass.kSpan + pass.nSpan - 1 ? 'fill' : 'steady';
}

/** The B tile for `pass`, zero-padded out to the full physical array. */
function weightsForPass(
  pass: TilePass,
  matrixB: number[][],
  tk: number,
  tn: number
): Float32Array {
  const w = new Float32Array(tk * tn);
  for (let r = 0; r < pass.kSpan; r++) {
    for (let c = 0; c < pass.nSpan; c++) {
      w[r * tn + c] = matrixB[pass.k0 + r]?.[pass.n0 + c] ?? 0;
    }
  }
  return w;
}

/** A fully loaded array: weights in place, both data registers still zero. */
function peStatesFromWeights(weights: Float32Array, tk: number, tn: number): PERegisters[][] {
  return Array.from({ length: tk }, (_, r) =>
    Array.from({ length: tn }, (_, c) => ({ weight: weights[r * tn + c], xOut: 0, yOut: 0 }))
  );
}

/**
 * The array partway through a weight shift-in. Rows enter at the top and shift
 * down one row per cycle, so the row that ends up at the bottom is pushed first.
 * After `loaded` cycles the top `loaded` rows hold in-flight weights and the
 * rest still hold whatever the previous tile left there.
 */
function peStatesShiftingIn(
  weights: Float32Array,
  loaded: number,
  tk: number,
  tn: number,
  previous: PERegisters[][]
): PERegisters[][] {
  return Array.from({ length: tk }, (_, r) =>
    Array.from({ length: tn }, (_, c) => {
      if (r >= loaded) {
        return { weight: previous[r]?.[c]?.weight ?? 0, xOut: 0, yOut: 0 };
      }
      // Array row r currently holds the tile row pushed `loaded - r` cycles ago.
      const sourceRow = tk - (loaded - r);
      return { weight: weights[sourceRow * tn + c], xOut: 0, yOut: 0 };
    })
  );
}

/** Unpack the flat `[weight, x_out, y_out, ...]` layout from the Rust side. */
function peStatesFromRaw(raw: Float32Array | number[], tk: number, tn: number): PERegisters[][] {
  return Array.from({ length: tk }, (_, r) =>
    Array.from({ length: tn }, (_, c) => {
      const idx = (r * tn + c) * 3;
      return { weight: raw[idx], xOut: raw[idx + 1], yOut: raw[idx + 2] };
    })
  );
}

export function useTiledMatmul(
  m: number,
  k: number,
  n: number,
  tk: number,
  tn: number,
  matrixA: number[][],
  matrixB: number[][],
  weightFifo: boolean
) {
  const [isLoaded, setIsLoaded] = useState(false);

  const passes = useMemo(
    () => buildPasses(m, k, n, tk, tn, weightFifo),
    [m, k, n, tk, tn, weightFifo]
  );
  const kTileCount = useMemo(() => Math.ceil(k / tk), [k, tk]);

  /**
   * The physical array, plus enough context to tell whether it is still the one
   * the schedule needs. It is only valid for the pass it was loaded for, and
   * only after exactly the number of ticks the snapshot has recorded — so a
   * restart (which rewinds the cycle counter) correctly forces a rebuild.
   */
  interface CachedArray {
    sim: SystolicArray2DSim;
    pass: TilePass;
    matrixB: number[][];
    tk: number;
    tn: number;
    ticks: number;
  }
  const cacheRef = useRef<CachedArray | null>(null);

  const buildFresh = useCallback(
    (): TiledSnapshot => ({
      passIdx: 0,
      cycleInPass: 0,
      globalCycle: 0,
      phase: 'load',
      // The array starts empty; the first cycles shift the first tile in.
      peStates: peStatesFromWeights(new Float32Array(tk * tn), tk, tn),
      fifoRows: 0,
      fifoPassIdx: null,
      matrixC: zeros(m, n),
      contributions: zeros(m, n),
      lastUpdated: [],
      passOutputs: Array.from({ length: tn }, () => []),
      weightLoads: 0,
      activeMacs: 0,
      done: false,
    }),
    [tk, tn, m, n]
  );

  const [snapshot, setSnapshot] = useState<TiledSnapshot>(buildFresh);

  useEffect(() => {
    async function setup() {
      try {
        await init();
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to initialize WASM:', err);
      }
    }
    setup();
  }, []);

  const restart = useCallback(() => setSnapshot(buildFresh()), [buildFresh]);

  // Restart synchronously when the problem changes, rather than in an effect, so
  // a render never shows a schedule that disagrees with the current inputs.
  // `state` (not `snapshot`) is what the rest of this render sees: the stale
  // snapshot still points at the old pass list, and indexing it with the new
  // dimensions would blow up before React could re-render.
  const [prevPasses, setPrevPasses] = useState(passes);
  const [prevA, setPrevA] = useState(matrixA);
  const [prevB, setPrevB] = useState(matrixB);
  let state = snapshot;
  if (passes !== prevPasses || matrixA !== prevA || matrixB !== prevB) {
    setPrevPasses(passes);
    setPrevA(matrixA);
    setPrevB(matrixB);
    state = buildFresh();
    setSnapshot(state);
  }

  useEffect(() => {
    return () => {
      cacheRef.current?.sim.free();
      cacheRef.current = null;
    };
  }, []);

  /**
   * Advance the schedule by `count` cycles, rolling over into the next tile pass
   * whenever the current one finishes.
   */
  const advance = useCallback(
    (count: number) => {
      if (!isLoaded || state.done) return;

      /** Reuse the resident array if it still matches, otherwise reload weights. */
      const arrayFor = (pass: TilePass, ticks: number): SystolicArray2DSim => {
        const cached = cacheRef.current;
        if (
          cached &&
          cached.pass === pass &&
          cached.matrixB === matrixB &&
          cached.tk === tk &&
          cached.tn === tn &&
          cached.ticks === ticks
        ) {
          return cached.sim;
        }
        cached?.sim.free();
        const sim = new SystolicArray2DSim(tk, tn);
        sim.load_weights(weightsForPass(pass, matrixB, tk, tn));
        cacheRef.current = { sim, pass, matrixB, tk, tn, ticks };
        return sim;
      };

      let { passIdx, cycleInPass, globalCycle, weightLoads, activeMacs, phase } = state;
      let peStates = state.peStates;
      let fifoRows = state.fifoRows;
      let fifoPassIdx = state.fifoPassIdx;
      let passOutputs = state.passOutputs.map(col => [...col]);
      const matrixC = state.matrixC.map(row => [...row]);
      const contributions = state.contributions.map(row => [...row]);
      let lastUpdated: { i: number; j: number }[] = [];
      let done = false;

      for (let step = 0; step < count; step++) {
        let pass = passes[passIdx];

        // Current pass has finished: move to the next tile.
        if (cycleInPass >= pass.cycles) {
          if (passIdx + 1 >= passes.length) {
            done = true;
            break;
          }
          passIdx += 1;
          pass = passes[passIdx];
          cycleInPass = 0;
          passOutputs = Array.from({ length: tn }, () => []);
          // With the FIFO on, this tile was staged during the previous pass and
          // swaps in for free. Without it, the array is about to stall while the
          // tile shifts in, so it still holds the old weights.
          if (pass.loadCycles === 0) {
            weightLoads += 1;
            peStates = peStatesFromWeights(weightsForPass(pass, matrixB, tk, tn), tk, tn);
            fifoRows = 0;
            fifoPassIdx = null;
          }
        }

        const nextCycle = cycleInPass + 1;
        const weights = weightsForPass(pass, matrixB, tk, tn);

        if (nextCycle <= pass.loadCycles) {
          // --- Weight shift-in cycle: the array stalls, one row arrives. ---
          peStates = peStatesShiftingIn(weights, nextCycle, tk, tn, peStates);
          phase = 'load';
          lastUpdated = [];
          if (nextCycle === pass.loadCycles) weightLoads += 1;
        } else {
          // --- Compute cycle. ---
          const computeCycle = nextCycle - pass.loadCycles;
          const sim = arrayFor(pass, computeCycle - 1);

          // Row r of the array is fed column (k0 + r) of A, skewed by r cycles.
          const leftIns = new Float32Array(tk);
          for (let r = 0; r < tk; r++) {
            const aRow = computeCycle - 1 - r;
            leftIns[r] = aRow >= 0 && aRow < m ? matrixA[aRow]?.[pass.k0 + r] ?? 0 : 0;
          }
          // Nothing enters the top: partial sums across K-tiles are summed in the
          // accumulator below rather than fed back into the array.
          const topIns = new Float32Array(tn);

          const bottomOuts = Array.from(sim.tick(leftIns, topIns));
          peStates = peStatesFromRaw(sim.get_state(), tk, tn);
          if (cacheRef.current) cacheRef.current.ticks = computeCycle;

          activeMacs += macsAt(pass, nextCycle, m);
          phase = phaseAt(pass, nextCycle, m);

          // The FIFO shifts the next tile in behind the scenes while we compute.
          if (weightFifo && passIdx + 1 < passes.length) {
            fifoRows = Math.min(computeCycle, tk);
            fifoPassIdx = passIdx + 1;
          } else {
            fifoRows = 0;
            fifoPassIdx = null;
          }

          // C(i, n0 + j) leaves the bottom of physical column j on cycle i + tk + j.
          lastUpdated = [];
          for (let j = 0; j < pass.nSpan; j++) {
            const i = computeCycle - tk - j;
            if (i >= 0 && i < m) {
              matrixC[i][pass.n0 + j] += bottomOuts[j];
              contributions[i][pass.n0 + j] += 1;
              lastUpdated.push({ i, j: pass.n0 + j });
              passOutputs[j].push({ i, val: bottomOuts[j] });
            }
          }
        }

        cycleInPass = nextCycle;
        globalCycle += 1;

        if (passIdx === passes.length - 1 && cycleInPass >= pass.cycles) {
          done = true;
          break;
        }
      }

      setSnapshot({
        passIdx,
        cycleInPass,
        globalCycle,
        phase,
        peStates,
        fifoRows,
        fifoPassIdx,
        matrixC,
        contributions,
        lastUpdated,
        passOutputs,
        weightLoads,
        activeMacs,
        done,
      });
    },
    [isLoaded, state, passes, matrixA, matrixB, m, tk, tn, weightFifo]
  );

  const tick = useCallback(() => advance(1), [advance]);

  /** Run out the rest of the current tile pass in one go. */
  const stepTile = useCallback(() => {
    if (state.done) return;
    const remaining = passes[state.passIdx].cycles - state.cycleInPass;
    // Already finished: one step rolls into the next tile, then runs it out.
    advance(remaining > 0 ? remaining : passes[state.passIdx + 1]?.cycles ?? 0);
  }, [advance, passes, state]);

  const totalCycles = useMemo(() => passes.reduce((acc, p) => acc + p.cycles, 0), [passes]);

  /** Cycles this schedule would take with the weight FIFO switched off. */
  const totalCyclesUnbuffered = useMemo(
    () => passes.reduce((acc, p) => acc + tk + p.computeCycles, 0),
    [passes, tk]
  );

  return {
    isLoaded,
    isInitialized: isLoaded,
    snapshot: state,
    passes,
    kTileCount,
    totalCycles,
    totalCyclesUnbuffered,
    tick,
    stepTile,
    reset: restart,
  };
}
