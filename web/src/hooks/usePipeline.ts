import { useEffect, useState, useCallback, useMemo } from 'react';
import init, { DotProductSim } from 'rust-hw-playground';

export interface PEState {
  weight: number;
  xOut: number;
  yOut: number;
}

export function usePipeline(n: number, m: number, weights: number[], vectors: number[][]) {
  const [sim, setSim] = useState<DotProductSim | null>(null);
  const [peStates, setPeStates] = useState<PEState[]>([]);
  const [cycle, setCycle] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<{cycle: number, states: PEState[], output: number}[]>([]);

  // Initialize WASM and Sim
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

  const reset = useCallback(() => {
    if (!isLoaded) return;
    const newSim = new DotProductSim(n);
    const weightsF32 = new Float32Array(weights.length === n ? weights : Array(n).fill(0));
    newSim.load_weights(weightsF32);
    setSim(newSim);
    setCycle(0);
    setHistory([]);
    
    // Initial PE states
    const rawState = newSim.get_state();
    const initialPeStates: PEState[] = [];
    for (let i = 0; i < n; i++) {
      initialPeStates.push({
        weight: rawState[i * 3],
        xOut: rawState[i * 3 + 1],
        yOut: rawState[i * 3 + 2],
      });
    }
    setPeStates(initialPeStates);
  }, [n, weights, isLoaded]);

  // Reset when n or weights change
  useEffect(() => {
    reset();
  }, [reset]);

  const tick = useCallback(() => {
    if (!sim) return;

    const nextCycle = cycle + 1;
    const currentXIns = new Float32Array(n);
    const activeVectorIndices: (number | null)[] = Array(n).fill(null);

    for (let i = 0; i < n; i++) {
      const vIdx = nextCycle - i - 1;
      if (vIdx >= 0 && vIdx < m) {
        currentXIns[i] = vectors[vIdx][i];
        activeVectorIndices[i] = vIdx;
      } else {
        currentXIns[i] = 0;
      }
    }

    const output = sim.tick(currentXIns);
    const rawState = sim.get_state();
    const newPeStates: PEState[] = [];
    for (let i = 0; i < n; i++) {
      newPeStates.push({
        weight: rawState[i * 3],
        xOut: rawState[i * 3 + 1],
        yOut: rawState[i * 3 + 2],
      });
    }

    setPeStates(newPeStates);
    setCycle(nextCycle);
    setHistory(prev => [...prev, { cycle: nextCycle, states: newPeStates, output }]);

    return { output, activeVectorIndices };
  }, [sim, cycle, n, m, vectors]);

  const isComplete = cycle >= m + n;

  return { 
    peStates, 
    cycle, 
    tick, 
    reset, 
    isLoaded, 
    isComplete, 
    history 
  };
}
