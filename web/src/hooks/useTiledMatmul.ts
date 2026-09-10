import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import init, { SystolicArray2DSim } from 'rust-hw-playground';
import type { PERegisters } from '@/components/SystolicGrid';

/**
 * Tiled matrix multiply on a fixed-size systolic array.
 *
 * The Rust core only knows how to run ONE weight-stationary pass over an array
 * of a given size. Real hardware has a fixed array (256x256 on a TPU) and much
 * larger matrices, so it chops the problem into tiles and runs one pass per
 * tile, reloading weights each time and summing partial results in an
 * accumulator buffer.
 *
 * This hook is that scheduler. It owns:
 *   - the list of tile passes,
 *   - a fresh SystolicArray2DSim per pass (the physical array, reused),
 *   - the accumulator holding C while partial sums arrive from several K-tiles.
 *
 * Tiles are visited in `for each N-tile { for each K-tile { ... } }` order, so
 * one column-block of C is driven all the way to its final value before the
 * next one starts.
 */

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
  /** Cycles to stream M rows through a tk x tn array and drain it. */
  cycles: number;
}

export interface TiledSnapshot {
  passIdx: number;
  /** Cycles elapsed within the current pass, 0..pass.cycles. */
  cycleInPass: number;
  /** Cycles elapsed across every pass so far. */
  globalCycle: number;
  /** Registers of the physical array, tk x tn. */
  peStates: PERegisters[][];
  /** Accumulator buffer: partial (or final) values of C, m x n. */
  matrixC: number[][];
  /** How many K-tiles have landed in each C cell. Equal to kTileCount => final. */
  contributions: number[][];
  /** C cells written on the most recent cycle, for highlighting. */
  lastUpdated: { i: number; j: number }[];
  /** Values that have left the bottom of each physical column during this pass. */
  passOutputs: { i: number; val: number }[][];
  /** How many times weights have been pushed into the array. */
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

function buildPasses(m: number, k: number, n: number, tk: number, tn: number): TilePass[] {
  const kTiles = tileEdges(k, tk);
  const nTiles = tileEdges(n, tn);
  const passes: TilePass[] = [];
  // N outer, K inner: finish one column-block of C before moving on.
  nTiles.forEach((nTile, nt) => {
    kTiles.forEach((kTile, kt) => {
      passes.push({
        index: passes.length,
        kt,
        nt,
        k0: kTile.start,
        n0: nTile.start,
        kSpan: kTile.span,
        nSpan: nTile.span,
        cycles: m + tk + tn - 1,
      });
    });
  });
  return passes;
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

/** A freshly loaded array: weights in place, both data registers still zero. */
function peStatesFromWeights(weights: Float32Array, tk: number, tn: number): PERegisters[][] {
  return Array.from({ length: tk }, (_, r) =>
    Array.from({ length: tn }, (_, c) => ({ weight: weights[r * tn + c], xOut: 0, yOut: 0 }))
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
  matrixB: number[][]
) {
  const [isLoaded, setIsLoaded] = useState(false);

  const passes = useMemo(() => buildPasses(m, k, n, tk, tn), [m, k, n, tk, tn]);
  const kTileCount = useMemo(() => Math.ceil(k / tk), [k, tk]);

  /**
   * The physical array, plus enough context to tell whether it is still the one
   * the schedule needs. It is only valid for the pass it was loaded for, and
   * only after exactly the number of ticks the snapshot has recorded — so a
   * restart (which rewinds cycleInPass to 0) correctly forces a rebuild.
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
      peStates: peStatesFromWeights(weightsForPass(passes[0], matrixB, tk, tn), tk, tn),
      matrixC: zeros(m, n),
      contributions: zeros(m, n),
      lastUpdated: [],
      passOutputs: Array.from({ length: tn }, () => []),
      weightLoads: 1,
      activeMacs: 0,
      done: false,
    }),
    [passes, matrixB, tk, tn, m, n]
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
   * (and reloading weights) whenever the current pass drains.
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

      let { passIdx, cycleInPass, globalCycle, weightLoads, activeMacs } = state;
      let peStates = state.peStates;
      let passOutputs = state.passOutputs.map(col => [...col]);
      const matrixC = state.matrixC.map(row => [...row]);
      const contributions = state.contributions.map(row => [...row]);
      let lastUpdated: { i: number; j: number }[] = [];
      let done = false;

      let sim = arrayFor(passes[passIdx], cycleInPass);

      for (let step = 0; step < count; step++) {
        let pass = passes[passIdx];

        // Current pass has drained: move to the next tile and reload weights.
        if (cycleInPass >= pass.cycles) {
          if (passIdx + 1 >= passes.length) {
            done = true;
            break;
          }
          passIdx += 1;
          pass = passes[passIdx];
          cycleInPass = 0;
          weightLoads += 1;
          sim = arrayFor(pass, 0);
          peStates = peStatesFromWeights(weightsForPass(pass, matrixB, tk, tn), tk, tn);
          passOutputs = Array.from({ length: tn }, () => []);
        }

        const nextCycle = cycleInPass + 1;

        // Row r of the array is fed column (k0 + r) of A, skewed by r cycles.
        const leftIns = new Float32Array(tk);
        for (let r = 0; r < tk; r++) {
          const aRow = nextCycle - 1 - r;
          leftIns[r] = aRow >= 0 && aRow < m ? matrixA[aRow]?.[pass.k0 + r] ?? 0 : 0;
        }
        // Nothing enters the top: partial sums across K-tiles are summed in the
        // accumulator below rather than fed back into the array.
        const topIns = new Float32Array(tn);

        const bottomOuts = Array.from(sim.tick(leftIns, topIns));
        peStates = peStatesFromRaw(sim.get_state(), tk, tn);
        if (cacheRef.current) cacheRef.current.ticks = nextCycle;

        for (let r = 0; r < pass.kSpan; r++) {
          for (let c = 0; c < pass.nSpan; c++) {
            const aRow = nextCycle - 1 - r - c;
            if (aRow >= 0 && aRow < m) activeMacs += 1;
          }
        }

        // C(i, n0 + j) leaves the bottom of physical column j on cycle i + tk + j.
        lastUpdated = [];
        for (let j = 0; j < pass.nSpan; j++) {
          const i = nextCycle - tk - j;
          if (i >= 0 && i < m) {
            matrixC[i][pass.n0 + j] += bottomOuts[j];
            contributions[i][pass.n0 + j] += 1;
            lastUpdated.push({ i, j: pass.n0 + j });
            passOutputs[j].push({ i, val: bottomOuts[j] });
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
        peStates,
        matrixC,
        contributions,
        lastUpdated,
        passOutputs,
        weightLoads,
        activeMacs,
        done,
      });
    },
    [isLoaded, state, passes, matrixA, matrixB, m, tk, tn]
  );

  const tick = useCallback(() => advance(1), [advance]);

  /** Run out the rest of the current tile pass in one go. */
  const stepTile = useCallback(() => {
    if (state.done) return;
    const remaining = passes[state.passIdx].cycles - state.cycleInPass;
    // Already drained: one step rolls into the next tile, then runs it out.
    advance(remaining > 0 ? remaining : passes[state.passIdx + 1]?.cycles ?? 0);
  }, [advance, passes, state]);

  const totalCycles = useMemo(() => passes.reduce((acc, p) => acc + p.cycles, 0), [passes]);

  return {
    isLoaded,
    isInitialized: isLoaded,
    snapshot: state,
    passes,
    kTileCount,
    totalCycles,
    tick,
    stepTile,
    reset: restart,
  };
}
