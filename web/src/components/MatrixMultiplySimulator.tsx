'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMatrixMultiply } from '@/hooks/useMatrixMultiply';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, StepForward, RotateCcw, Dices, GraduationCap, ArrowRight, ArrowDown } from 'lucide-react';

export function MatrixMultiplySimulator() {
  const [size, setSize] = useState(3);
  const m = size;
  const k = size;
  const n = size;

  const [matrixA, setMatrixA] = useState<number[][]>([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ]);
  const [matrixB, setMatrixB] = useState<number[][]>([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ]);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Auto-adjust Matrix A & B sizes to maintain square N x N shapes
  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    
    // adjust Matrix A to newSize x newSize
    setMatrixA(prev => {
      return Array(newSize).fill(null).map((_, r) => {
        const row = prev[r] || [];
        return Array(newSize).fill(null).map((_, c) => {
          if (row[c] !== undefined) return row[c];
          return r * newSize + c + 1;
        });
      });
    });

    // adjust Matrix B to newSize x newSize
    setMatrixB(prev => {
      return Array(newSize).fill(null).map((_, r) => {
        const row = prev[r] || [];
        return Array(newSize).fill(null).map((_, c) => {
          if (row[c] !== undefined) return row[c];
          return r === c ? 1 : 0;
        });
      });
    });
  };

  const handleRandomizeA = () => {
    setMatrixA(
      Array(m).fill(null).map(() =>
        Array(k).fill(null).map(() => Math.floor(Math.random() * 21) - 10)
      )
    );
  };

  const handleRandomizeB = () => {
    setMatrixB(
      Array(k).fill(null).map(() =>
        Array(n).fill(null).map(() => Math.floor(Math.random() * 21) - 10)
      )
    );
  };

  const handleRandomizeAll = () => {
    handleRandomizeA();
    handleRandomizeB();
    handleReset();
  };

  const {
    peStates,
    cycle,
    tick,
    reset,
    isLoaded,
    isComplete,
    isInitialized,
    matrixC,
  } = useMatrixMultiply(m, k, n, matrixA, matrixB);

  // Auto-Play Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAutoPlaying && !isComplete && isInitialized) {
      intervalId = setInterval(() => {
        tick();
      }, 1500); // 1.5 seconds per cycle for easy tracing
    } else if ((isComplete || !isInitialized) && isAutoPlaying) {
      const handle = requestAnimationFrame(() => {
        setIsAutoPlaying(false);
      });
      return () => cancelAnimationFrame(handle);
    }
    return () => clearInterval(intervalId);
  }, [isAutoPlaying, isComplete, isInitialized, tick]);

  const handleReset = () => {
    setIsAutoPlaying(false);
    reset();
  };

  // Expected mathematical multiplication result (A * B)
  const expectedC = useMemo(() => {
    const result: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let x = 0; x < k; x++) {
          sum += (matrixA[i]?.[x] || 0) * (matrixB[x]?.[j] || 0);
        }
        result[i][j] = sum;
      }
    }
    return result;
  }, [matrixA, matrixB, m, k, n]);

  // Determine if a cell in Matrix A is currently active/entering the PE array
  const isCellActiveA = (rIdx: number, cIdx: number) => {
    if (cycle === 0) return false;
    // Row cIdx of the PE array receives A(cycle - 1 - cIdx, cIdx)
    return cycle - 1 - cIdx === rIdx;
  };

  // Determine if a cell in Matrix C has just emerged from the bottom
  const isCellJustEmergingC = (rIdx: number, cIdx: number) => {
    // C(rIdx, cIdx) emerges at cycle (1-based) equal to rIdx + K + cIdx
    return cycle === rIdx + k + cIdx;
  };

  // Construct left stream queue elements waiting to enter row r
  const getLeftQueueToDisplay = (r: number) => {
    const stream: number[] = [];
    // Prepend r padding zeros
    for (let i = 0; i < r; i++) {
      stream.push(0);
    }
    // Append column r of Matrix A (A[*, r])
    for (let i = 0; i < m; i++) {
      stream.push(matrixA[i]?.[r] || 0);
    }
    // Slice starting from the current cycle index to see what's left
    const remaining = stream.slice(cycle);
    // Take the next elements matching the matrix dimension N for UI visualization
    const visible = remaining.slice(0, size);
    // Reverse so the element entering first (index 0) is on the right side
    return visible.reverse();
  };

  // Get exited values for bottom column c
  const getExitedForCol = (cIdx: number) => {
    const exited: number[] = [];
    for (let i = 0; i < m; i++) {
      const val = matrixC[i]?.[cIdx];
      if (val !== undefined && val !== null) {
        exited.push(val);
      }
    }
    // Most recently exited first (at the top of our vertical stack)
    return exited.reverse();
  };

  if (!isLoaded) {
    return <div className="p-8 text-center font-mono text-muted-foreground">Loading WASM module...</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
      {/* 1. Configuration Section */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">2D Grid Configuration</CardTitle>
          <CardDescription>Configure dimensions and elements for weight-stationary 2D systolic multiplication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dimension Controls */}
          <div className="grid grid-cols-1 gap-4 max-w-md">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Matrix Dimension (N)</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={size}
                  onChange={e => handleSizeChange(Math.max(2, Math.min(8, parseInt(e.target.value) || 2)))}
                  className="font-mono text-sm w-24"
                />
                <span className="text-xs text-zinc-500">
                  Configures the size of the symmetrical square matrices ({size}×{size}) and the processing grid.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Matrix Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Matrix A Input */}
            <div className="flex flex-col items-center p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-900">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Matrix A ({m}×{k})</span>
                <Button variant="outline" size="sm" onClick={handleRandomizeA} className="h-7 text-xs gap-1 cursor-pointer">
                  <Dices className="w-3.5 h-3.5" /> Randomize A
                </Button>
              </div>
              
              <div className="relative px-5 py-4 border-l-2 border-r-2 border-zinc-400 dark:border-zinc-600 rounded-lg">
                <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tl-sm"></div>
                <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-bl-sm"></div>
                <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tr-sm"></div>
                <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-br-sm"></div>

                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${k}, minmax(0, 1fr))` }}>
                  {matrixA.map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <input
                        key={`a-${rIdx}-${cIdx}`}
                        type="number"
                        value={val}
                        onChange={e => {
                          const newVal = parseInt(e.target.value) || 0;
                          setMatrixA(prev =>
                            prev.map((r, ri) =>
                              r.map((c, ci) => (ri === rIdx && ci === cIdx ? newVal : c))
                            )
                          );
                        }}
                        className={`w-11 h-10 text-center font-mono text-sm border rounded-md bg-white dark:bg-zinc-950 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isCellActiveA(rIdx, cIdx)
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 font-semibold scale-105 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2.5 text-center">Inputs stream in from the left, row-by-row with single-cycle delays.</p>
            </div>

            {/* Matrix B Input */}
            <div className="flex flex-col items-center p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-900">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Matrix B ({k}×{n})</span>
                <Button variant="outline" size="sm" onClick={handleRandomizeB} className="h-7 text-xs gap-1 cursor-pointer">
                  <Dices className="w-3.5 h-3.5" /> Randomize B
                </Button>
              </div>

              <div className="relative px-5 py-4 border-l-2 border-r-2 border-zinc-400 dark:border-zinc-600 rounded-lg">
                <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tl-sm"></div>
                <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-bl-sm"></div>
                <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tr-sm"></div>
                <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-br-sm"></div>

                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                  {matrixB.map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <input
                        key={`b-${rIdx}-${cIdx}`}
                        type="number"
                        value={val}
                        onChange={e => {
                          const newVal = parseInt(e.target.value) || 0;
                          setMatrixB(prev =>
                            prev.map((r, ri) =>
                              r.map((c, ci) => (ri === rIdx && ci === cIdx ? newVal : c))
                            )
                          );
                        }}
                        className="w-11 h-10 text-center font-mono text-sm border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/30"
                      />
                    ))
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2.5 text-center">Weights are static (stationary) and pre-loaded inside the Processing Elements.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Simulation Controller Bar */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardContent className="py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold font-mono bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              Cycle: {cycle}
            </span>
            <span className="text-xs text-zinc-400">
              {isComplete ? (
                <span className="text-emerald-500 font-semibold">Simulation Complete</span>
              ) : isInitialized ? (
                "Simulation running..."
              ) : (
                "Click Play or Step to initialize"
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isInitialized ? (
              <Button onClick={() => { reset(); tick(); }} className="gap-1.5 cursor-pointer bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90">
                <StepForward className="w-4 h-4" /> Initialize & Step
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  disabled={isComplete}
                  className={`gap-1.5 cursor-pointer ${
                    isAutoPlaying 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                      : 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90'
                  }`}
                >
                  {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isAutoPlaying ? 'Pause' : 'Auto-Play'}
                </Button>

                <Button
                  onClick={tick}
                  disabled={isComplete || isAutoPlaying}
                  variant="outline"
                  className="gap-1.5 cursor-pointer"
                >
                  <StepForward className="w-4 h-4" /> Step
                </Button>
              </>
            )}

            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-1.5 cursor-pointer text-destructive border-destructive/20 hover:bg-destructive/10"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>

            <Button
              onClick={handleRandomizeAll}
              variant="outline"
              className="gap-1.5 cursor-pointer"
            >
              <Dices className="w-4 h-4" /> Randomize All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. 2D Systolic Array Visualizer */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950 overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Systolic Array Visualizer (2D)</CardTitle>
              <CardDescription>A weight-stationary 2D grid processing data flowing left-to-right, and accumulating top-to-bottom.</CardDescription>
            </div>
            <span className="self-start sm:self-center inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              WASM Active
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[400px]">
          {/* Main Unified Responsive Grid */}
          <div className="w-full overflow-x-auto py-6 px-2 flex justify-center">
            <div
              className="grid gap-x-14 gap-y-10 relative p-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 min-w-[650px]"
              style={{
                gridTemplateColumns: `${40 + size * 34}px repeat(${n}, minmax(110px, 1fr))`,
              }}
            >
              {/* TOP ROW: B Column Headers */}
              <div key="top-spacer" className="h-6 flex items-center justify-center"></div>
              {Array.from({ length: n }).map((_, c) => (
                <div key={`top-col-${c}`} className="flex flex-col items-center justify-end h-6 text-zinc-400 dark:text-zinc-600 font-mono text-xs font-semibold">
                  <span className="flex flex-col items-center">B<sub>*,{c}</sub><ArrowDown className="w-3.5 h-3.5 mt-0.5 text-zinc-300 dark:text-zinc-700" /></span>
                </div>
              ))}

              {/* MIDDLE ROWS: Left Input + PEs */}
              {Array.from({ length: k }).map((_, r) => (
                <React.Fragment key={`row-${r}`}>
                  {/* Left input queue for row r */}
                  <div className="flex items-center justify-end h-28 pr-2">
                    <div className="flex items-center justify-end gap-1 w-full font-mono">
                      <span className="text-[10px] text-zinc-400 mr-1 font-bold">A<sub>*,{r}</sub></span>
                      {getLeftQueueToDisplay(r).map((val, idx) => {
                        // Check if this element is about to enter (it is the rightmost element in our reversed visible list)
                        const isEntering = idx === getLeftQueueToDisplay(r).length - 1;
                        return (
                          <div
                            key={idx}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold shadow-sm transition-all duration-300 ${
                              isEntering && cycle < m + r && isInitialized
                                ? 'bg-emerald-500 text-white border-emerald-600 scale-105 font-bold'
                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            {val}
                          </div>
                        );
                      })}
                      <ArrowRight className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                    </div>
                  </div>

                  {/* PEs for this row */}
                  {Array.from({ length: n }).map((_, c) => {
                    const state = peStates[r]?.[c] || { weight: matrixB[r]?.[c] || 0, xOut: 0, yOut: 0 };
                    // PE is active if it has processed / is holding any non-zero value
                    const isPeActive = isInitialized && (state.xOut !== 0 || state.yOut !== 0);

                    return (
                      <div
                        key={`pe-${r}-${c}`}
                        className={`relative flex flex-col items-center justify-center p-3 bg-white dark:bg-zinc-950 border-2 rounded-xl shadow-md transition-all duration-300 w-28 h-28 mx-auto ${
                          isPeActive
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:ring-indigo-400/20'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <span className="absolute top-1 right-2 text-[8px] font-bold text-zinc-400">PE({r},{c})</span>
                        
                        <div className="text-center space-y-1 select-none">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">w: {state.weight}</p>
                          <div className="flex flex-col gap-0.5 justify-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-dashed border-zinc-100 dark:border-zinc-900 pt-1 mt-1">
                            <span className={isInitialized && state.xOut !== 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-600"}>
                              x_out: {isInitialized ? state.xOut : 0}
                            </span>
                            <span className={isInitialized && state.yOut !== 0 ? "font-bold text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-600"}>
                              y_out: {isInitialized ? state.yOut : 0}
                            </span>
                          </div>
                        </div>

                        {/* Connection Arrows right and down */}
                        {c < n - 1 && (
                          <div className="absolute top-1/2 -right-10 -translate-y-1/2 flex items-center z-10">
                            <ArrowRight className={`w-5 h-5 transition-colors duration-300 ${isInitialized && state.xOut !== 0 ? 'text-emerald-500 scale-110 font-bold' : 'text-zinc-200 dark:text-zinc-800'}`} />
                          </div>
                        )}
                        {r < k - 1 && (
                          <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 flex flex-col items-center z-10">
                            <ArrowDown className={`w-5 h-5 transition-colors duration-300 ${isInitialized && state.yOut !== 0 ? 'text-blue-500 scale-110 font-bold' : 'text-zinc-200 dark:text-zinc-800'}`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* BOTTOM ROW: bottom output queue for each column */}
              <div key="bottom-spacer" className="min-h-28"></div>
              {Array.from({ length: n }).map((_, c) => {
                const exitedVals = getExitedForCol(c);

                return (
                  <div key={`col-out-${c}`} className="flex flex-col items-center min-h-28">
                    <ArrowDown className="w-4 h-4 text-blue-500 mb-1 shrink-0" />
                    <div className="flex flex-col items-center gap-1 w-full font-mono">
                      {exitedVals.slice(0, size).map((val, idx) => {
                        const isJustExited = idx === 0; // Top element in list is the most recent
                        return (
                          <div
                            key={idx}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold shadow-sm transition-all duration-300 ${
                              isJustExited && isInitialized
                                ? 'bg-blue-500 text-white border-blue-600 scale-105 font-bold animate-pulse'
                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            {val}
                          </div>
                        );
                      })}
                      {exitedVals.length > size && (
                        <span className="text-[8px] text-zinc-400 font-bold leading-none">...</span>
                      )}
                      <span className="text-[9px] text-zinc-400 mt-0.5 font-bold">C<sub>*,{c}</sub></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 text-center max-w-lg space-y-2">
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> Educational Concept
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              For 2D Matrix Multiplication, inputs from Matrix A enter from the left, while Matrix B inputs stream from the top.
              Each Processing Element multiplies its current inputs, adds the partial result, and passes the values downstream with a single-cycle register delay.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Results Matrix Section (Comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expected Mathematical Result */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-md font-bold tracking-tight">Expected Result C (Math)</CardTitle>
            <CardDescription>The exact mathematical result of Matrix A × Matrix B.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <div className="relative px-5 py-4 border-l-2 border-r-2 border-zinc-400 dark:border-zinc-600 rounded-lg">
              <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tl-sm"></div>
              <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-bl-sm"></div>
              <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tr-sm"></div>
              <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-br-sm"></div>

              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {expectedC.map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`expected-${rIdx}-${cIdx}`}
                      className="w-12 h-10 flex items-center justify-center font-mono text-sm border border-zinc-100 dark:border-zinc-900 rounded-md bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-200"
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actual Hardware Outputs */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-md font-bold tracking-tight">Hardware Outputs C (Simulated)</CardTitle>
            <CardDescription>Elements of C as they emerge from the bottom row of PEs cycle-by-cycle.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <div className="relative px-5 py-4 border-l-2 border-r-2 border-zinc-400 dark:border-zinc-600 rounded-lg">
              <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tl-sm"></div>
              <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-bl-sm"></div>
              <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tr-sm"></div>
              <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-br-sm"></div>

              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {matrixC.map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`actual-${rIdx}-${cIdx}`}
                      className={`w-12 h-10 flex items-center justify-center font-mono text-sm border rounded-md transition-all duration-300 ${
                        val === null
                          ? 'bg-zinc-100/50 dark:bg-zinc-900/10 text-zinc-400 border-dashed border-zinc-200 dark:border-zinc-800'
                          : isCellJustEmergingC(rIdx, cIdx)
                          ? 'bg-blue-500 text-white border-blue-600 font-bold scale-105 shadow-md'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      {val === null ? '-' : val}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
