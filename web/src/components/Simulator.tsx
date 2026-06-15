'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePipeline } from '@/hooks/usePipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PipelineVisualizer } from '@/components/PipelineVisualizer';
import { Play, Pause, StepForward, RotateCcw } from 'lucide-react';

export function Simulator() {
  const [n, setN] = useState(3);
  const [m, setM] = useState(2);
  const [weightsStr, setWeightsStr] = useState("1, 2, 3");
  const [vectorsStr, setVectorsStr] = useState("10, 20, 30\n5, 10, 15");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

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

  const { peStates, cycle, tick, reset, isLoaded, isComplete, history, activeVectors } = usePipeline(n, m, weights, vectors);

  // Auto-Play Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAutoPlaying && !isComplete) {
      intervalId = setInterval(() => {
        tick();
      }, 1000); // 1 second per cycle
    } else if (isComplete && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
    return () => clearInterval(intervalId);
  }, [isAutoPlaying, isComplete, tick]);

  const handleReset = () => {
    setIsAutoPlaying(false);
    reset();
  };

  if (!isLoaded) {
    return <div className="p-8 text-center font-mono text-muted-foreground">Loading WASM module...</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Section */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">Pipeline Config</CardTitle>
            <CardDescription>Setup your processing elements and weights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Vector Length (n)</label>
                <Input 
                  type="number" 
                  value={n} 
                  onChange={e => setN(Math.max(1, parseInt(e.target.value) || 1))} 
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Num Vectors (m)</label>
                <Input 
                  type="number" 
                  value={m} 
                  onChange={e => setM(Math.max(1, parseInt(e.target.value) || 1))} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Weights (W)</label>
              <Input 
                type="text" 
                value={weightsStr} 
                onChange={e => setWeightsStr(e.target.value)} 
                className="font-mono" 
                placeholder="1, 2, 3" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Inputs Section */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">Input Vectors (X)</CardTitle>
            <CardDescription>Define the data to flow through the pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">One vector per line, comma separated</label>
              <Textarea 
                value={vectorsStr} 
                onChange={e => setVectorsStr(e.target.value)} 
                rows={4}
                className="font-mono resize-none"
                placeholder="10, 20, 30&#10;5, 10, 15"
              />
            </div>
            <Button onClick={handleReset} className="w-full" variant="secondary">
              <RotateCcw className="w-4 h-4 mr-2" /> Apply & Reset Simulation
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Execution Section */}
      <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between pb-8 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Simulation Stage</CardTitle>
            <CardDescription className="text-zinc-500">Real-time visualization of the hardware state.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md mr-2 border">Cycle: {cycle}</span>
            <Button 
              onClick={() => setIsAutoPlaying(!isAutoPlaying)} 
              disabled={isComplete}
              variant={isAutoPlaying ? "secondary" : "default"}
              className="w-32 shadow-sm"
            >
              {isAutoPlaying ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Auto-Play</>}
            </Button>
            <Button 
              onClick={() => tick()} 
              disabled={isComplete || isAutoPlaying}
              variant="outline"
              className="w-32 shadow-sm"
            >
              <StepForward className="w-4 h-4 mr-2" /> Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-50/50 dark:bg-black border rounded-xl shadow-inner mb-8">
             <PipelineVisualizer n={n} m={m} cycle={cycle} peStates={peStates} activeVectors={activeVectors} vectors={vectors} />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">PE Index</TableHead>
                  <TableHead className="text-center">Weight (W)</TableHead>
                  <TableHead className="text-center">X Output</TableHead>
                  <TableHead className="text-center">Y Output (Accum)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peStates.map((pe, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono font-medium">PE[{i}]</TableCell>
                    <TableCell className="font-mono text-center">{pe.weight.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-center text-blue-600 dark:text-blue-400 font-medium">{pe.xOut.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-center text-green-600 dark:text-green-400 font-medium">{pe.yOut.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {peStates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No PEs initialized. Check your config.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Results History */}
      <Card className="border-none shadow-lg bg-zinc-900 dark:bg-zinc-900 text-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-white">Results Log</CardTitle>
            {isComplete && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Completed</span>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-sm pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {[...history].reverse().map((h, i) => {
              const finishedV = h.cycle - n;
              const vectorCompleted = finishedV >= 0 && finishedV < m;
              
              return (
                <div key={h.cycle} className={`flex justify-between p-2 rounded-md transition-colors ${vectorCompleted ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}>
                  <span className="text-zinc-400">Cycle {h.cycle.toString().padStart(2, '0')}:</span>
                  {vectorCompleted ? (
                    <span className="text-green-400 font-bold">
                      [Vector {finishedV}] Done! Result = {h.output.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-zinc-500 italic">Data propagating...</span>
                  )}
                </div>
              );
            })}
            {history.length === 0 && <div className="text-zinc-500 italic text-center py-8">No cycles executed yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
