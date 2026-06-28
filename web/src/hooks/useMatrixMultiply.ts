import { useEffect, useState, useCallback, useRef } from 'react';
import init, { SystolicArray2DSim } from 'rust-hw-playground';

interface WasmInstance {
  __wbg_ptr: number;
}

function isValidWasmInstance(sim: SystolicArray2DSim | null): sim is SystolicArray2DSim & WasmInstance {
  if (sim === null) return false;
  const temp = sim as unknown as WasmInstance;
  return typeof temp.__wbg_ptr === 'number' && temp.__wbg_ptr !== 0;
}

export interface PEState2D {
  weight: number;
  xOut: number;
  yOut: number;
}

export function useMatrixMultiply(
  m: number,
  k: number,
  n: number,
  matrixA: number[][],
  matrixB: number[][]
) {
  const simRef = useRef<SystolicArray2DSim | null>(null);
  const [cycle, setCycle] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // peStates is a 2D array of size K x N
  const [peStates, setPeStates] = useState<PEState2D[][]>(() =>
    Array(k).fill(null).map((_, r) =>
      Array(n).fill(null).map((_, c) => ({
        weight: matrixB[r]?.[c] || 0,
        xOut: 0,
        yOut: 0,
      }))
    )
  );

  // matrixC is the accumulated results of size M x N
  const [matrixC, setMatrixC] = useState<(number | null)[][]>(() =>
    Array(m).fill(null).map(() => Array(n).fill(null))
  );

  const [history, setHistory] = useState<{
    cycle: number;
    peStates: PEState2D[][];
    matrixC: (number | null)[][];
    bottomOuts: number[];
  }[]>([]);

  // Track previous inputs to detect changes and reset
  const [prevM, setPrevM] = useState(m);
  const [prevK, setPrevK] = useState(k);
  const [prevN, setPrevN] = useState(n);
  const [prevMatrixA, setPrevMatrixA] = useState(matrixA);
  const [prevMatrixB, setPrevMatrixB] = useState(matrixB);

  // Initialize WASM
  useEffect(() => {
    async function setup() {
      try {
        await init();
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to initialize WASM:", err);
      }
    }
    setup();
  }, []);

  // Synchronous resets when properties change
  if (m !== prevM || k !== prevK || n !== prevN || matrixA !== prevMatrixA || matrixB !== prevMatrixB) {
    setPrevM(m);
    setPrevK(k);
    setPrevN(n);
    setPrevMatrixA(matrixA);
    setPrevMatrixB(matrixB);
    setCycle(0);
    setHistory([]);
    setIsInitialized(false);
    setMatrixC(Array(m).fill(null).map(() => Array(n).fill(null)));
    setPeStates(
      Array(k).fill(null).map((_, r) =>
        Array(n).fill(null).map((_, c) => ({
          weight: matrixB[r]?.[c] || 0,
          xOut: 0,
          yOut: 0,
        }))
      )
    );
  }

  // Manage WASM instance
  useEffect(() => {
    if (!isLoaded) return;

    const newSim = new SystolicArray2DSim(k, n);
    const weightsF32 = new Float32Array(k * n);
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < n; c++) {
        weightsF32[r * n + c] = matrixB[r]?.[c] || 0;
      }
    }
    newSim.load_weights(weightsF32);
    simRef.current = newSim;
  }, [k, n, matrixB, isLoaded]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (simRef.current) {
        simRef.current.free();
        simRef.current = null;
      }
    };
  }, []);

  // Reset
  const reset = useCallback(() => {
    if (!isLoaded) return;

    const newSim = new SystolicArray2DSim(k, n);
    const weightsF32 = new Float32Array(k * n);
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < n; c++) {
        weightsF32[r * n + c] = matrixB[r]?.[c] || 0;
      }
    }
    newSim.load_weights(weightsF32);
    simRef.current = newSim;

    setCycle(0);
    setHistory([]);
    setMatrixC(Array(m).fill(null).map(() => Array(n).fill(null)));
    setPeStates(
      Array(k).fill(null).map((_, r) =>
        Array(n).fill(null).map((_, c) => ({
          weight: matrixB[r]?.[c] || 0,
          xOut: 0,
          yOut: 0,
        }))
      )
    );
    setIsInitialized(true);
  }, [m, k, n, matrixB, isLoaded]);

  const tick = useCallback(() => {
    const sim = simRef.current;
    if (!isValidWasmInstance(sim)) return;

    const nextCycle = cycle + 1;

    // Prepare inputs
    // For Matrix A (left inputs entering each row of the array, length K)
    const leftIns = new Float32Array(k);
    for (let r = 0; r < k; r++) {
      // row r receives A(nextCycle - 1 - r, r)
      const aRowIdx = nextCycle - 1 - r;
      if (aRowIdx >= 0 && aRowIdx < m) {
        leftIns[r] = matrixA[aRowIdx]?.[r] ?? 0;
      } else {
        leftIns[r] = 0;
      }
    }

    // Top inputs are all 0
    const topIns = new Float32Array(n).fill(0);

    // Tick the simulation
    const bottomOutsRaw = sim.tick(leftIns, topIns);
    const bottomOuts = Array.from(bottomOutsRaw);

    // Get the updated PE states
    const rawState = sim.get_state();
    const newPeStates: PEState2D[][] = Array(k).fill(null).map(() => Array(n).fill(null));
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < n; c++) {
        const idx = r * n + c;
        newPeStates[r][c] = {
          weight: rawState[idx * 3],
          xOut: rawState[idx * 3 + 1],
          yOut: rawState[idx * 3 + 2],
        };
      }
    }

    // Update Matrix C results
    // C(i, j) emerges at bottom col j at nextCycle (1-based) if i = nextCycle - k - j >= 0 and < M
    const newMatrixC = matrixC.map(row => [...row]);
    for (let j = 0; j < n; j++) {
      const aRowIdx = nextCycle - k - j;
      if (aRowIdx >= 0 && aRowIdx < m) {
        newMatrixC[aRowIdx][j] = bottomOuts[j];
      }
    }

    setCycle(nextCycle);
    setPeStates(newPeStates);
    setMatrixC(newMatrixC);
    setHistory(prev => [
      ...prev,
      {
        cycle: nextCycle,
        peStates: newPeStates,
        matrixC: newMatrixC,
        bottomOuts,
      },
    ]);
  }, [cycle, m, k, n, matrixA, matrixC]);

  const isComplete = cycle >= m + k + n - 2;

  return {
    peStates,
    cycle,
    tick,
    reset,
    isLoaded,
    isComplete,
    history,
    isInitialized,
    matrixC,
  };
}
