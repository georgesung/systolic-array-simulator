'use client';

import React, { useState, useMemo } from 'react';
import { usePipeline } from '@/hooks/usePipeline';

export function Simulator() {
  const [n, setN] = useState(3);
  const [m, setM] = useState(2);
  const [weightsStr, setWeightsStr] = useState("1, 2, 3");
  const [vectorsStr, setVectorsStr] = useState("10, 20, 30\n5, 10, 15");

  const weights = useMemo(() => 
    weightsStr.split(',').map(v => parseFloat(v.trim()) || 0), 
    [weightsStr]
  );

  const vectors = useMemo(() => 
    vectorsStr.split('\n').filter(line => line.trim() !== '').map(line => 
      line.split(',').map(v => parseFloat(v.trim()) || 0)
    ), 
    [vectorsStr]
  );

  const { peStates, cycle, tick, reset, isLoaded, isComplete, history } = usePipeline(n, m, weights, vectors);

  if (!isLoaded) {
    return <div className="p-8 text-center font-mono">Loading WASM module...</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto px-4 pb-20">
      {/* Configuration Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Pipeline Config</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Vector Length (n)</label>
              <input 
                type="number" 
                value={n} 
                onChange={e => setN(Math.max(1, parseInt(e.target.value) || 1))} 
                className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800" 
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Num Vectors (m)</label>
              <input 
                type="number" 
                value={m} 
                onChange={e => setM(Math.max(1, parseInt(e.target.value) || 1))} 
                className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800" 
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Weights (W)</label>
            <input 
              type="text" 
              value={weightsStr} 
              onChange={e => setWeightsStr(e.target.value)} 
              className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 font-mono text-sm" 
              placeholder="1, 2, 3" 
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg">Input Vectors (X)</h3>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">One vector per line, comma separated</label>
            <textarea 
              value={vectorsStr} 
              onChange={e => setVectorsStr(e.target.value)} 
              rows={4}
              className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 font-mono text-sm"
              placeholder="10, 20, 30&#10;5, 10, 15"
            />
          </div>
          <button 
            onClick={reset} 
            className="w-full py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold rounded hover:opacity-90 transition"
          >
            Apply & Reset Simulation
          </button>
        </div>
      </div>

      {/* Execution Section */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Simulation Stage</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">Cycle: {cycle}</span>
            <button 
              onClick={() => tick()} 
              disabled={isComplete}
              className={`px-8 py-2 rounded-lg font-bold text-white transition shadow-lg active:scale-[0.98] ${isComplete ? 'bg-zinc-300 dark:bg-zinc-800 cursor-not-allowed text-zinc-500' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
            >
              {isComplete ? 'Finished' : 'Tick Clock'}
            </button>
          </div>
        </div>

        {/* Pipeline Visualization (Table) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">PE Index</th>
                <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Weight (W)</th>
                <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">X Output</th>
                <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Y Output (Accum)</th>
              </tr>
            </thead>
            <tbody>
              {peStates.map((pe, i) => (
                <tr key={i} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="py-4 font-mono text-sm font-bold">PE[{i}]</td>
                  <td className="py-4 font-mono text-sm text-center font-bold">{pe.weight.toFixed(2)}</td>
                  <td className="py-4 font-mono text-sm text-center text-blue-600 dark:text-blue-400 font-bold">{pe.xOut.toFixed(2)}</td>
                  <td className="py-4 font-mono text-sm text-center text-green-600 dark:text-green-400 font-bold">{pe.yOut.toFixed(2)}</td>
                </tr>
              ))}
              {peStates.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400 italic">No PEs initialized. Check your config.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results History */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          Results Log
          {isComplete && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Simulation Finished</span>}
        </h3>
        <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-sm scrollbar-thin">
          {[...history].reverse().map((h, i) => {
            const finishedV = h.cycle - n;
            // Note: In our current logic, Vector 0 result emerges at Cycle n+1.
            // Wait, let's re-verify: Cycle 1: X0,0 enters PE0. Cycle n: X0,n-1 enters PEn-1. 
            // Result of DotProduct(V0) is available AFTER cycle n's tick.
            // So at end of cycle n, we have the result.
            const vectorCompleted = finishedV >= 0 && finishedV < m;
            
            return (
              <div key={h.cycle} className={`flex justify-between p-2 rounded ${vectorCompleted ? 'bg-green-50 dark:bg-green-950/30' : ''}`}>
                <span className="text-zinc-500">Cycle {h.cycle.toString().padStart(2, '0')}:</span>
                {vectorCompleted ? (
                  <span className="text-green-600 dark:text-green-400 font-bold">
                    [Vector {finishedV}] Done! Result = {h.output.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-zinc-400 italic">Data propagating...</span>
                )}
              </div>
            );
          })}
          {history.length === 0 && <div className="text-zinc-400 italic text-center py-4">No cycles executed yet.</div>}
        </div>
      </div>
    </div>
  );
}
