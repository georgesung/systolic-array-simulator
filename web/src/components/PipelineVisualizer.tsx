import React from 'react';
import { PEState } from '@/hooks/usePipeline';
import { ArrowDown, ArrowRight } from 'lucide-react';

interface PipelineVisualizerProps {
  n: number;
  m: number;
  cycle: number;
  peStates: PEState[];
  activeVectors: (number | null)[];
  vectors: number[][];
}

const VECTOR_COLORS = [
  'bg-blue-500 text-white dark:bg-blue-600',
  'bg-purple-500 text-white dark:bg-purple-600',
  'bg-orange-500 text-white dark:bg-orange-600',
  'bg-pink-500 text-white dark:bg-pink-600',
  'bg-teal-500 text-white dark:bg-teal-600',
  'bg-indigo-500 text-white dark:bg-indigo-600',
  'bg-yellow-500 text-white dark:bg-yellow-600',
  'bg-red-500 text-white dark:bg-red-600',
];

export function PipelineVisualizer({ n, m, cycle, peStates, activeVectors, vectors }: PipelineVisualizerProps) {
  const getVectorColor = (vIdx: number | null) => {
    if (vIdx === null) return 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600';
    return VECTOR_COLORS[vIdx % VECTOR_COLORS.length];
  };

  return (
    <div className="flex flex-col items-center w-full py-8 overflow-x-auto">
      <div className="flex flex-col relative">
        
        {/* Top Input Y */}
        <div className="flex flex-col items-center mb-2 z-10 w-48 relative ml-64">
          <span className="text-xs font-bold text-zinc-500 mb-1 tracking-widest uppercase">Y In (0)</span>
          <ArrowDown className="text-zinc-300 dark:text-zinc-700 w-5 h-5 animate-pulse" />
        </div>

        {Array.from({ length: n }).map((_, i) => {
          const pe = peStates[i];
          const activeV = activeVectors[i];
          
          // Render a fixed number of slots representing the incoming data stream
          const maxQueueSlots = 6;
          // Max stream length is n + m - 1
          const maxStreamLength = n + m - 1;
          const slots = Array.from({ length: maxQueueSlots })
            .map((_, j) => j)
            .filter(j => cycle + j <= maxStreamLength)
            .reverse();

          return (
            <div key={i} className="flex relative items-center mb-2">
              {/* Left Input Queue */}
              <div className="flex w-64 justify-end items-center pr-4 gap-2 overflow-visible">
                {slots.map(j => {
                   const k = cycle + j;
                   const isVector = k >= i && k < i + m;
                   const vIdx = k - i;
                   
                   let cellColor = 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700';
                   let val = 0;
                   const isVisible = true;

                   if (isVector) {
                     cellColor = getVectorColor(vIdx);
                     val = vectors[vIdx]?.[i] ?? 0;
                   }

                   if (!isVisible) return <div key={`q-${k}`} className="w-8 h-8" />;

                   return (
                     <div 
                       key={`q-${k}`} 
                       className={`w-8 h-8 rounded-md shadow-sm flex items-center justify-center text-[10px] font-bold ${cellColor} transition-all duration-300 border`}
                     >
                       {val}
                     </div>
                   );
                })}
                {slots.length > 0 && cycle <= maxStreamLength && <ArrowRight className="text-zinc-300 dark:text-zinc-700 w-4 h-4 ml-1 shrink-0" />}
              </div>

              {/* Hardware Block (PE) */}
              <div className={`w-48 border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 relative z-10 ${activeV !== null ? 'ring-2 ring-blue-400/50 dark:ring-blue-500/50 scale-[1.02]' : ''}`}>
                <div className="bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <span className="font-bold text-xs text-zinc-500">PE {i}</span>
                  <span className="font-mono text-[10px] bg-white dark:bg-black px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                    W = {pe?.weight.toFixed(2)}
                  </span>
                </div>
                
                <div className="p-3 grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold mb-1">X In/Out</span>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner ${getVectorColor(activeV)} transition-colors duration-300`}>
                      {activeV !== null ? (vectors[activeV]?.[i] ?? 0) : '-'}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Y Accum</span>
                    <div className="w-12 h-12 rounded-lg bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400 transition-all duration-300">
                      {pe?.yOut.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Output X (flowing to nowhere, just visualizing out) */}
              <div className="flex items-center pl-2 w-16 opacity-50">
                 {activeV !== null && (
                   <>
                     <ArrowRight className="text-zinc-300 dark:text-zinc-700 w-4 h-4 mr-1" />
                     <span className={`text-[10px] font-bold px-1.5 rounded ${getVectorColor(activeV)}`}>{pe?.xOut.toFixed(1)}</span>
                   </>
                 )}
              </div>
            </div>
          );
        })}

        {/* Bottom Output Y */}
        <div className="flex flex-col items-center mt-2 z-10 w-48 relative ml-64">
          <ArrowDown className="text-green-500/50 w-6 h-6 animate-pulse mb-1" />
          <span className="text-xs font-bold text-green-600 dark:text-green-400 tracking-widest uppercase bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-200 dark:border-green-900/50 shadow-sm">
            Final Out
          </span>
        </div>

        {/* Connecting vertical line behind PEs */}
        <div className="absolute left-64 ml-24 top-8 bottom-12 w-1 bg-zinc-200 dark:bg-zinc-800 -z-0"></div>
      </div>
    </div>
  );
}
