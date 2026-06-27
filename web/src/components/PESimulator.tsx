'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, Pause, StepForward, RotateCcw, Dices, ArrowRight, ArrowDown } from 'lucide-react';

interface PEState {
  regXOut: number;
  regYOut: number;
}

interface PEHistoryEntry {
  cycle: number;
  xIn: number;
  yIn: number;
  weight: number;
  xOut: number;
  yOut: number;
}

const X_COLORS = [
  'bg-blue-500 text-white dark:bg-blue-600 border-blue-400',
  'bg-indigo-500 text-white dark:bg-indigo-600 border-indigo-400',
  'bg-sky-500 text-white dark:bg-sky-600 border-sky-400',
  'bg-cyan-500 text-white dark:bg-cyan-600 border-cyan-400',
  'bg-purple-500 text-white dark:bg-purple-600 border-purple-400',
];

const Y_COLORS = [
  'bg-orange-500 text-white dark:bg-orange-600 border-orange-400',
  'bg-amber-500 text-white dark:bg-amber-600 border-amber-400',
  'bg-rose-500 text-white dark:bg-rose-600 border-rose-400',
  'bg-red-500 text-white dark:bg-red-600 border-red-400',
  'bg-pink-500 text-white dark:bg-pink-600 border-pink-400',
];

export function PESimulator() {
  const [weightInput, setWeightInput] = useState<string>('3.0');
  const [xStreamInput, setXStreamInput] = useState<string>('2, 4, 6, 8');
  const [yStreamInput, setYStreamInput] = useState<string>('0, 10, 5, -3');
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Simulation State
  const [cycle, setCycle] = useState<number>(0);
  const [peState, setPeState] = useState<PEState>({ regXOut: 0, regYOut: 0 });
  const [history, setHistory] = useState<PEHistoryEntry[]>([]);

  // Parse Streams
  const xStream = useMemo(() => 
    xStreamInput.split(',').map(v => parseFloat(v.trim()) || 0),
    [xStreamInput]
  );

  const yStream = useMemo(() => 
    yStreamInput.split(',').map(v => parseFloat(v.trim()) || 0),
    [yStreamInput]
  );

  const maxCycles = Math.max(xStream.length, yStream.length);
  const isComplete = cycle >= maxCycles && maxCycles > 0;

  // Parse weight
  const parsedWeight = useMemo(() => parseFloat(weightInput) || 0, [weightInput]);

  // Compute inputs for the current cycle
  const currentXIn = cycle < xStream.length ? xStream[cycle] : 0;
  const currentYIn = cycle < yStream.length ? yStream[cycle] : 0;

  // RNG functions
  const handleRandomizeWeight = () => {
    const r = (Math.floor(Math.random() * 21) - 10); // -10 to 10
    setWeightInput(r.toFixed(1));
  };

  const handleRandomizeStreams = () => {
    const len = 4;
    const xs = Array.from({ length: len }, () => Math.floor(Math.random() * 11)); // 0 to 10
    const ys = Array.from({ length: len }, () => Math.floor(Math.random() * 11)); // 0 to 10
    setXStreamInput(xs.join(', '));
    setYStreamInput(ys.join(', '));
  };

  // Perform one tick/step
  const tick = useCallback(() => {
    if (cycle >= maxCycles) {
      setIsAutoPlaying(false);
      return;
    }

    const xIn = cycle < xStream.length ? xStream[cycle] : 0;
    const yIn = cycle < yStream.length ? yStream[cycle] : 0;

    // Combinational logic: multiplication and addition
    const macResult = xIn * parsedWeight + yIn;
    const nextX = xIn;

    // Clock update (Synchronous)
    setPeState({
      regXOut: nextX,
      regYOut: macResult,
    });

    // Record history
    const entry: PEHistoryEntry = {
      cycle: cycle + 1,
      xIn,
      yIn,
      weight: parsedWeight,
      xOut: nextX,
      yOut: macResult,
    };

    setHistory(prev => [...prev, entry]);
    setCycle(prev => {
      const nextCycle = prev + 1;
      if (nextCycle >= maxCycles) {
        setIsAutoPlaying(false);
      }
      return nextCycle;
    });
  }, [cycle, maxCycles, xStream, yStream, parsedWeight]);

  // Reset simulation
  const handleReset = () => {
    setIsAutoPlaying(false);
    setCycle(0);
    setPeState({ regXOut: 0, regYOut: 0 });
    setHistory([]);
  };

  // Auto-play effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAutoPlaying && !isComplete) {
      intervalId = setInterval(() => {
        tick();
      }, 1500); // 1.5 seconds per cycle for educational speed
    }
    return () => clearInterval(intervalId);
  }, [isAutoPlaying, isComplete, tick]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PE Configuration Card */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">PE Configuration</CardTitle>
            <CardDescription>Configure the Processing Element&apos;s static weight register.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-muted-foreground uppercase">Weight Register (W)</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs" 
                  onClick={handleRandomizeWeight}
                  disabled={cycle > 0}
                >
                  <Dices className="w-3.5 h-3.5 mr-1" /> RNG
                </Button>
              </div>
              <Input 
                type="text" 
                value={weightInput} 
                onChange={e => setWeightInput(e.target.value)} 
                className="font-mono text-sm" 
                placeholder="3.0"
                disabled={cycle > 0}
              />
              <p className="text-[11px] text-zinc-400">The weight remains resident in the PE during execution (Weight Stationary).</p>
            </div>
          </CardContent>
        </Card>

        {/* Input Streams Configuration Card */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">Input Streams</CardTitle>
            <CardDescription>Define streaming values that enter the PE cycle-by-cycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">X Stream (Left)</label>
                <Input 
                  type="text" 
                  value={xStreamInput} 
                  onChange={e => setXStreamInput(e.target.value)} 
                  className="font-mono text-sm" 
                  placeholder="2, 4, 6"
                  disabled={cycle > 0}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Y Stream (Top)</label>
                <Input 
                  type="text" 
                  value={yStreamInput} 
                  onChange={e => setYStreamInput(e.target.value)} 
                  className="font-mono text-sm" 
                  placeholder="0, 10, 5"
                  disabled={cycle > 0}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs ml-auto"
                onClick={handleRandomizeStreams}
                disabled={cycle > 0}
              >
                <Dices className="w-3.5 h-3.5 mr-1" /> Randomize Streams
              </Button>
            </div>
            <Button onClick={handleReset} className="w-full" variant="secondary">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset & Load Configurations
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Simulation stage (Vertical stacked layout) */}
      <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between pb-8 space-y-0 border-b border-zinc-100 dark:border-zinc-900 mb-6">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">PE Microarchitecture Stage</CardTitle>
            <CardDescription className="text-zinc-500">Trace signals propagating through internal combinational multipliers and adders.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-md mr-2 border border-zinc-200 dark:border-zinc-800">
              Cycle: {cycle}
            </span>
            <Button 
              onClick={() => setIsAutoPlaying(!isAutoPlaying)} 
              disabled={isComplete}
              variant={isAutoPlaying ? "secondary" : "default"}
              className="w-32 shadow-sm cursor-pointer"
            >
              {isAutoPlaying ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Auto-Play</>}
            </Button>
            <Button 
              onClick={tick} 
              disabled={isComplete || isAutoPlaying}
              variant="outline"
              className="w-32 shadow-sm cursor-pointer"
            >
              <StepForward className="w-4 h-4 mr-2" /> Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          
          {/* Main Visual Canvas (Horizontal-centric queue and structural map) */}
          <div className="w-full max-w-4xl bg-zinc-50/50 dark:bg-black rounded-2xl border p-6 relative flex flex-col items-center justify-center min-h-[480px] mb-8 overflow-hidden shadow-inner">
            
            {/* Input Queues Metadata Bubble */}
            <div className="absolute top-4 left-6 flex flex-col gap-1 text-[11px] text-zinc-400 font-mono bg-white dark:bg-zinc-950 p-2.5 rounded-lg border shadow-sm max-w-[200px] z-10">
              <span className="font-bold text-zinc-500 border-b pb-1 mb-1 font-sans">Queue Status</span>
              <span>Next X_in: {cycle < xStream.length ? xStream[cycle] : 0} (Index {cycle})</span>
              <span>Next Y_in: {cycle < yStream.length ? yStream[cycle] : 0} (Index {cycle})</span>
              <span>Remaining: {Math.max(0, maxCycles - cycle)} cycles</span>
            </div>

            {/* Structured Simulation Layout */}
            <div className="flex flex-col items-center w-full max-w-3xl mt-8 relative gap-4">
              
              {/* Row 1: Top Y Input Queue */}
              <div className="flex flex-col items-center h-48 justify-end">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans">Y Input Stream</span>
                <div className="flex flex-col gap-2 items-center">
                  {Array.from({ length: 4 })
                    .map((_, idx) => idx)
                    .reverse()
                    .map(j => {
                      const k = cycle + j;
                      if (k >= yStream.length) return null;
                      return (
                        <div
                          key={`y-q-${k}`}
                          className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center text-xs font-bold border transform transition-all duration-300 ${
                            Y_COLORS[k % Y_COLORS.length]
                          }`}
                        >
                          {yStream[k]}
                        </div>
                      );
                    })}
                </div>
                <ArrowDown className="w-5 h-5 text-zinc-300 dark:text-zinc-700 mt-2 animate-bounce" />
              </div>

              {/* Row 2: Left X Queue | Center PE | Right X Register Out */}
              <div className="flex items-center justify-center w-full gap-4">
                
                {/* Left X Input Queue */}
                <div className="flex items-center justify-end w-64 pr-2">
                  <div className="flex flex-col items-end mr-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-sans">X Input Stream</span>
                    <div className="flex gap-2 items-center">
                      {Array.from({ length: 4 })
                        .map((_, idx) => idx)
                        .reverse()
                        .map(j => {
                          const k = cycle + j;
                          if (k >= xStream.length) return null;
                          return (
                            <div
                              key={`x-q-${k}`}
                              className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center text-xs font-bold border transform transition-all duration-300 ${
                                X_COLORS[k % X_COLORS.length]
                              }`}
                            >
                              {xStream[k]}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700 animate-pulse shrink-0" />
                </div>

                {/* Center: The Processing Element Boundary Box */}
                <div className="w-[320px] h-[190px] bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-md p-5 flex flex-col justify-between relative z-10">
                  
                  {/* Header Label inside box */}
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-sans">Processing Element</span>
                    <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-bold font-sans">MAC Unit</span>
                  </div>

                  {/* Internal Logic Diagrams */}
                  <div className="flex-1 grid grid-cols-2 gap-4 items-center py-2 relative">
                    
                    {/* Left Column: Register W & Multiplier */}
                    <div className="flex flex-col items-center gap-3 relative">
                      {/* Weight Register Box */}
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/80 rounded-lg p-1.5 w-20 text-center shadow-sm">
                        <span className="text-[8px] text-amber-500 uppercase font-bold block font-sans">Reg W</span>
                        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                          {parsedWeight.toFixed(1)}
                        </span>
                      </div>

                      {/* Multiplier Symbol */}
                      <div className="bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                        ×
                      </div>
                    </div>

                    {/* Right Column: Adder */}
                    <div className="flex flex-col items-center justify-center gap-2 relative">
                      {/* Adder Symbol */}
                      <div className="bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-200 dark:border-orange-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-orange-600 dark:text-orange-400 font-mono">
                        +
                      </div>
                      
                      {/* Live combinational calculation display */}
                      <div className="text-[9px] text-orange-600 dark:text-orange-400 font-mono border border-dashed border-orange-200 dark:border-orange-900/50 p-1 rounded bg-zinc-50 dark:bg-zinc-950">
                        ({currentXIn} × {parsedWeight}) + {currentYIn} = {(currentXIn * parsedWeight + currentYIn).toFixed(1)}
                      </div>
                    </div>

                    {/* Connector lines (dashed) */}
                    <div className="absolute left-[25%] right-[25%] top-[60%] border-t border-zinc-200 dark:border-zinc-800 border-dashed z-0" />
                  </div>

                </div>

                {/* Right X Output Visualizer */}
                <div className="flex items-center w-64 pl-2 gap-2">
                  <ArrowRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-sans">Reg_X Output</span>
                    {cycle > 0 ? (
                      <div
                        className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                          X_COLORS[(cycle - 1) % X_COLORS.length]
                        }`}
                      >
                        {peState.regXOut}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-xs font-bold font-mono">
                        -
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Row 3: Bottom Y Output Visualizer */}
              <div className="flex flex-col items-center h-28 mt-2">
                <ArrowDown className="w-5 h-5 text-zinc-300 dark:text-zinc-700 mb-2" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 font-sans">Reg_Y Output</span>
                {cycle > 0 ? (
                  <div
                    className={`w-12 h-12 rounded-xl shadow-md flex flex-col items-center justify-center border text-xs font-bold transition-all duration-300 ${
                      Y_COLORS[(cycle - 1) % Y_COLORS.length]
                    }`}
                  >
                    <span className="text-[8px] opacity-75 font-mono uppercase font-bold">Accum</span>
                    <span>{peState.regYOut}</span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-xs font-bold font-mono">
                    -
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Trace table list */}
          <div className="w-full rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Cycle</TableHead>
                  <TableHead className="text-center font-bold text-blue-600">X Input (X_in)</TableHead>
                  <TableHead className="text-center font-bold text-amber-600">Weight (W)</TableHead>
                  <TableHead className="text-center font-bold text-orange-600">Y Input (Y_in)</TableHead>
                  <TableHead className="text-center">Computed MAC (X * W + Y)</TableHead>
                  <TableHead className="text-center font-bold text-blue-500">Reg X Out (Next)</TableHead>
                  <TableHead className="text-center font-bold text-orange-500">Reg Y Out (Next)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, i) => (
                  <TableRow key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <TableCell className="font-mono font-bold text-zinc-600 dark:text-zinc-400">#{h.cycle}</TableCell>
                    <TableCell className="font-mono text-center text-blue-600/90">{h.xIn.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center text-amber-600/90">{h.weight.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center text-orange-600/90">{h.yIn.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500">
                      ({h.xIn} * {h.weight}) + {h.yIn} = { (h.xIn * h.weight + h.yIn).toFixed(1) }
                    </TableCell>
                    <TableCell className="font-mono text-center text-blue-500 font-semibold">{h.xOut.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center text-orange-500 font-semibold">{h.yOut.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                      Click &quot;Step&quot; or &quot;Auto-Play&quot; to run cycle simulation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
