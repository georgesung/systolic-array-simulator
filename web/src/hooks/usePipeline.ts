import { useEffect, useState, useCallback, useRef } from 'react';
import init, { DotProductSim } from 'rust-hw-playground';

interface WasmInstance {
  __wbg_ptr: number;
}

function isValidWasmInstance(sim: DotProductSim | null): sim is DotProductSim & WasmInstance {
  if (sim === null) return false;
  const temp = sim as unknown as WasmInstance;
  return typeof temp.__wbg_ptr === 'number' && temp.__wbg_ptr !== 0;
}

export interface PEState {
  weight: number;
  xOut: number;
  yOut: number;
}

export function usePipeline(n: number, m: number, weights: number[], vectors: number[][]) {
  const simRef = useRef<DotProductSim | null>(null);
  const [peStates, setPeStates] = useState<PEState[]>(() =>
    Array(n).fill(null).map((_, i) => ({
      weight: weights[i] || 0,
      xOut: 0,
      yOut: 0,
    }))
  );
  const [cycle, setCycle] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<{cycle: number, states: PEState[], output: number}[]>([]);
  const [activeVectors, setActiveVectors] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [isInitialized, setIsInitialized] = useState(false);

  // Track previous inputs to detect changes synchronously and reset React states
  const [prevN, setPrevN] = useState(n);
  const [prevM, setPrevM] = useState(m);
  const [prevWeights, setPrevWeights] = useState(weights);
  const [prevVectors, setPrevVectors] = useState(vectors);

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

  // Synchronous state adjustments during render when props change
  if (n !== prevN || m !== prevM || weights !== prevWeights || vectors !== prevVectors) {
    setPrevN(n);
    setPrevM(m);
    setPrevWeights(weights);
    setPrevVectors(vectors);
    setCycle(0);
    setHistory([]);
    setActiveVectors(Array(n).fill(null));
    setIsInitialized(false);
    
    // We can initialize peStates synchronously during render without calling WASM,
    // since all PE registers are initially 0.0 and weights are loaded from props.
    setPeStates(
      Array(n).fill(null).map((_, i) => ({
        weight: weights[i] || 0,
        xOut: 0,
        yOut: 0,
      }))
    );
  }

  // Effect to manage WASM life-cycle (creating/updating the simulator)
  useEffect(() => {
    if (!isLoaded) return;

    // JavaScript's FinalizationRegistry automatically handles freeing of the old 
    // WASM instance when it is dereferenced.
    const newSim = new DotProductSim(n);
    const weightsF32 = new Float32Array(weights.length === n ? weights : Array(n).fill(0));
    newSim.load_weights(weightsF32);
    simRef.current = newSim;
  }, [n, weights, isLoaded]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (simRef.current) {
        simRef.current.free();
        simRef.current = null;
      }
    };
  }, []);

  // Manual reset handler (called from button)
  const reset = useCallback(() => {
    if (!isLoaded) return;

    const newSim = new DotProductSim(n);
    const weightsF32 = new Float32Array(weights.length === n ? weights : Array(n).fill(0));
    newSim.load_weights(weightsF32);
    simRef.current = newSim;
    
    setCycle(0);
    setHistory([]);
    
    setPeStates(
      Array(n).fill(null).map((_, i) => ({
        weight: weights[i] || 0,
        xOut: 0,
        yOut: 0,
      }))
    );
    setActiveVectors(Array(n).fill(null));
    setIsInitialized(true);
  }, [n, weights, isLoaded]);

  const tick = useCallback(() => {
    const sim = simRef.current;
    if (!isValidWasmInstance(sim)) return; // Guard against null and freed/nullified internal pointers

    const nextCycle = cycle + 1;
    const currentXIns = new Float32Array(n);
    const activeVectorIndices: (number | null)[] = Array(n).fill(null);

    for (let i = 0; i < n; i++) {
      const vIdx = nextCycle - i - 1;
      if (vIdx >= 0 && vIdx < m) {
        currentXIns[i] = vectors[vIdx] ? vectors[vIdx][i] : 0;
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
    setActiveVectors(activeVectorIndices);
    setHistory(prev => [...prev, { cycle: nextCycle, states: newPeStates, output }]);

    return { output, activeVectorIndices };
  }, [cycle, n, m, vectors]);

  const isComplete = cycle >= m + n;

  return { 
    peStates, 
    cycle, 
    tick, 
    reset, 
    isLoaded, 
    isComplete, 
    history,
    activeVectors,
    isInitialized
  };
}
