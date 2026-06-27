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

  // Perform one tick/step (wrapped in useCallback to satisfy dependency rules)
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
                  <Dices className="w-3 h-3 mr-1" /> RNG
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
          
          {/* Main Visual Canvas */}
          <div className="w-full max-w-4xl bg-zinc-50/50 dark:bg-black rounded-2xl border p-12 relative flex flex-col items-center justify-center min-h-[420px] mb-8 overflow-hidden shadow-inner">
            
            {/* Input Queues Visualizer */}
            <div className="absolute top-4 left-6 flex flex-col gap-1 text-[11px] text-zinc-400 font-mono bg-white dark:bg-zinc-950 p-2.5 rounded-lg border shadow-sm max-w-[200px]">
              <span className="font-bold text-zinc-500 border-b pb-1 mb-1">Queue Status</span>
              <span>Next X_in: {currentXIn} (Index {cycle})</span>
              <span>Next Y_in: {currentYIn} (Index {cycle})</span>
              <span>Remaining Cycles: {Math.max(0, maxCycles - cycle)}</span>
            </div>

            {/* PE Structure Drawing */}
            <div className="flex items-center justify-center relative w-[500px] h-[320px] mt-6">
              
              {/* Top Y Input Arrow & Bubble */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                  Y_in = {currentYIn}
                </span>
                <ArrowDown className="w-5 h-5 text-green-500 animate-bounce" />
              </div>

              {/* Left X Input Arrow & Bubble */}
              <div className="absolute left-0 top-[35%] -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  X_in = {currentXIn}
                </span>
                <ArrowRight className="w-5 h-5 text-blue-500 animate-pulse" />
              </div>

              {/* Main Processing Element Boundary Box */}
              <div className="absolute top-[20%] bottom-[10%] left-[25%] right-[25%] bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-md p-6 flex flex-col justify-between">
                
                {/* Header Label inside box */}
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Processing Element (PE)</span>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">MAC Unit</span>
                </div>

                {/* Internal Logic Diagrams */}
                <div className="flex-1 grid grid-cols-2 gap-4 items-center py-4 relative">
                  
                  {/* Left Column: Register W & Multiplier */}
                  <div className="flex flex-col items-center gap-4 relative">
                    {/* Weight Register Box */}
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/80 rounded-lg p-2 w-20 text-center shadow-sm">
                      <span className="text-[9px] text-amber-500 uppercase font-bold block">Reg W</span>
                      <span className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {parsedWeight.toFixed(1)}
                      </span>
                    </div>

                    {/* Multiplier Icon/Symbol */}
                    <div className="bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                      ×
                    </div>
                    {/* Floating internal signal path X_in -> multiplier */}
                    <div className="text-[10px] text-zinc-400 font-mono absolute -left-4 top-[65%]">
                      {currentXIn}
                    </div>
                  </div>

                  {/* Right Column: Adder & Register Accumulator */}
                  <div className="flex flex-col items-center gap-4 relative">
                    {/* Adder Symbol */}
                    <div className="bg-green-50 dark:bg-green-950/40 border-2 border-green-200 dark:border-green-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                      +
                    </div>

                    {/* Temporary Accumulator Bubble */}
                    <div className="text-[10px] text-green-600 dark:text-green-400 font-mono border border-dashed border-green-200 p-1 rounded">
                      MAC: { (currentXIn * parsedWeight + currentYIn).toFixed(1) }
                    </div>
                  </div>

                  {/* Connector lines (abstracted) */}
                  <div className="absolute left-[30%] right-[30%] top-[65%] border-t border-zinc-300 dark:border-zinc-700 border-dashed z-0" />
                </div>

                {/* Registered Outputs (Represent Clock registers) */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex justify-between gap-4">
                  {/* Reg X Out (Horizontal Output Buffer) */}
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg px-2 py-1.5 border flex justify-between items-center text-[11px] font-mono">
                    <span className="text-zinc-400">Reg_X:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {peState.regXOut.toFixed(1)}
                    </span>
                  </div>

                  {/* Reg Y Out (Vertical Accumulator Buffer) */}
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg px-2 py-1.5 border flex justify-between items-center text-[11px] font-mono">
                    <span className="text-zinc-400">Reg_Y:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {peState.regYOut.toFixed(1)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right X Output Arrow & Bubble */}
              <div className="absolute right-0 top-[35%] -translate-y-1/2 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  Reg_X_out = {peState.regXOut}
                </span>
              </div>

              {/* Bottom Y Output Arrow & Bubble */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <ArrowDown className="w-5 h-5 text-green-500" />
                <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                  Reg_Y_out = {peState.regYOut}
                </span>
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
                  <TableHead className="text-center font-bold text-green-600">Y Input (Y_in)</TableHead>
                  <TableHead className="text-center">Computed MAC (X * W + Y)</TableHead>
                  <TableHead className="text-center font-bold text-blue-500">Reg X Out (Next)</TableHead>
                  <TableHead className="text-center font-bold text-green-500">Reg Y Out (Next)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, i) => (
                  <TableRow key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <TableCell className="font-mono font-bold text-zinc-600 dark:text-zinc-400">#{h.cycle}</TableCell>
                    <TableCell className="font-mono text-center text-blue-600/90">{h.xIn.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center text-amber-600/90">{h.weight.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center text-green-600/90">{h.yIn.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500">
                      ({h.xIn} * {h.weight}) + {h.yIn} = { (h.xIn * h.weight + h.yIn).toFixed(1) }
                    </TableCell>
                    <TableCell className="font-mono text-center text-blue-500 font-semibold">{h.xOut.toFixed(1)}</TableCell>
                    <TableCell className="font-mono text-center text-green-500 font-semibold">{h.yOut.toFixed(1)}</TableCell>
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
