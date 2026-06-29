'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMatrixMultiply } from '@/hooks/useMatrixMultiply';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, StepForward, RotateCcw, Dices, GraduationCap, ArrowRight, ArrowDown } from 'lucide-react';

const formatFloat = (num: number): number => {
  return Math.round(num * 100) / 100;
};

export function MatrixMultiplySimulator() {
  const [size, setSize] = useState(3);
  const m = size;
  const k = size;
  const n = size;

  const [numMatrices, setNumMatrices] = useState<number>(1);
  const [activeInputTab, setActiveInputTab] = useState<0 | 1 | 2>(0);

  const [matrixA1, setMatrixA1] = useState<string[][]>([
    ['-1', '2', '3'],
    ['4', '-5', '6'],
    ['7', '8', '-9']
  ]);
  const [matrixA2, setMatrixA2] = useState<string[][]>([
    ['2', '-1', '0'],
    ['3', '5', '-2'],
    ['1', '1', '4']
  ]);
  const [matrixA3, setMatrixA3] = useState<string[][]>([
    ['1', '0', '1'],
    ['0', '2', '0'],
    ['3', '-1', '2']
  ]);

  const [matrixB, setMatrixB] = useState<string[][]>([
    ['1', '9', '-8'],
    ['-7', '1', '6'],
    ['5', '-4', '1']
  ]);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Helper to change number of matrices in batch and safety-reset active input tab
  const changeNumMatrices = (num: number) => {
    setNumMatrices(num);
    if (activeInputTab >= num) {
      setActiveInputTab(0);
    }
  };

  const resizeMatrix = (matrix: string[][], newSize: number) => {
    return Array(newSize).fill(null).map((_, r) => {
      const row = matrix[r] || [];
      return Array(newSize).fill(null).map((_, c) => {
        if (row[c] !== undefined) return row[c];
        return String(r * newSize + c + 1);
      });
    });
  };

  // Auto-adjust Matrix A & B sizes to maintain square N x N shapes
  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setMatrixA1(prev => resizeMatrix(prev, newSize));
    setMatrixA2(prev => resizeMatrix(prev, newSize));
    setMatrixA3(prev => resizeMatrix(prev, newSize));

    // adjust Matrix B to newSize x newSize
    setMatrixB(prev => {
      return Array(newSize).fill(null).map((_, r) => {
        const row = prev[r] || [];
        return Array(newSize).fill(null).map((_, c) => {
          if (row[c] !== undefined) return row[c];
          return r === c ? '1' : '0';
        });
      });
    });
  };

  const handleRandomizeA1 = () => {
    setMatrixA1(
      Array(m).fill(null).map(() =>
        Array(k).fill(null).map(() => String(Math.floor(Math.random() * 21) - 10))
      )
    );
  };

  const handleRandomizeA2 = () => {
    setMatrixA2(
      Array(m).fill(null).map(() =>
        Array(k).fill(null).map(() => String(Math.floor(Math.random() * 21) - 10))
      )
    );
  };

  const handleRandomizeA3 = () => {
    setMatrixA3(
      Array(m).fill(null).map(() =>
        Array(k).fill(null).map(() => String(Math.floor(Math.random() * 21) - 10))
      )
    );
  };

  const handleRandomizeB = () => {
    setMatrixB(
      Array(k).fill(null).map(() =>
        Array(n).fill(null).map(() => String(Math.floor(Math.random() * 21) - 10))
      )
    );
  };

  const handleRandomizeAll = () => {
    handleRandomizeA1();
    handleRandomizeA2();
    handleRandomizeA3();
    handleRandomizeB();
    handleReset();
  };

  // Convert raw string matrices to float number matrices for calculations and WASM
  const parsedMatrixA1 = useMemo(() =>
    matrixA1.map(row => row.map(val => parseFloat(val) || 0)),
    [matrixA1]
  );

  const parsedMatrixA2 = useMemo(() =>
    matrixA2.map(row => row.map(val => parseFloat(val) || 0)),
    [matrixA2]
  );

  const parsedMatrixA3 = useMemo(() =>
    matrixA3.map(row => row.map(val => parseFloat(val) || 0)),
    [matrixA3]
  );

  const combinedParsedA = useMemo(() => {
    if (numMatrices === 1) return parsedMatrixA1;
    if (numMatrices === 2) return [...parsedMatrixA1, ...parsedMatrixA2];
    return [...parsedMatrixA1, ...parsedMatrixA2, ...parsedMatrixA3];
  }, [numMatrices, parsedMatrixA1, parsedMatrixA2, parsedMatrixA3]);

  const parsedMatrixB = useMemo(() =>
    matrixB.map(row => row.map(val => parseFloat(val) || 0)),
    [matrixB]
  );

  const {
    peStates,
    cycle,
    tick,
    reset,
    isLoaded,
    isComplete,
    isInitialized,
    matrixC,
  } = useMatrixMultiply(m * numMatrices, k, n, combinedParsedA, parsedMatrixB);

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

  // Helper color map for different matrices in batch pipeline
  const getMatrixColorClasses = (globalRowIdx: number) => {
    const matrixId = Math.floor(globalRowIdx / size) + 1;
    switch (matrixId) {
      case 1:
        return {
          text: 'text-teal-600 dark:text-teal-400',
          bg: 'bg-teal-50 dark:bg-teal-950/20',
          border: 'border-teal-200 dark:border-teal-800',
          borderActive: 'border-teal-500 dark:border-teal-700',
          bgActive: 'bg-teal-500 text-white',
          textActive: 'text-teal-900 dark:text-teal-300',
          name: 'A1',
          cName: 'C1',
        };
      case 2:
        return {
          text: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/20',
          border: 'border-purple-200 dark:border-purple-800',
          borderActive: 'border-purple-500 dark:border-purple-700',
          bgActive: 'bg-purple-500 text-white',
          textActive: 'text-purple-900 dark:text-purple-300',
          name: 'A2',
          cName: 'C2',
        };
      case 3:
        return {
          text: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800',
          borderActive: 'border-amber-500 dark:border-amber-700',
          bgActive: 'bg-amber-500 text-white',
          textActive: 'text-amber-900 dark:text-amber-300',
          name: 'A3',
          cName: 'C3',
        };
      default:
        return {
          text: 'text-zinc-600 dark:text-zinc-400',
          bg: 'bg-zinc-50 dark:bg-zinc-950/20',
          border: 'border-zinc-200 dark:border-zinc-800',
          borderActive: 'border-zinc-500 dark:border-zinc-700',
          bgActive: 'bg-zinc-500 text-white',
          textActive: 'text-zinc-900 dark:text-zinc-300',
          name: 'A',
          cName: 'C',
        };
    }
  };

  const getArrowColorClass = (globalRowIdx: number) => {
    const matrixId = Math.floor(globalRowIdx / size) + 1;
    switch (matrixId) {
      case 1: return 'text-teal-500 dark:text-teal-400';
      case 2: return 'text-purple-500 dark:text-purple-400';
      case 3: return 'text-amber-500 dark:text-amber-400';
      default: return 'text-zinc-300 dark:text-zinc-700';
    }
  };

  // Expected mathematical multiplication result (A * B) for each matrix
  const expectedC1 = useMemo(() => {
    const result: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let x = 0; x < k; x++) {
          sum += (parsedMatrixA1[i]?.[x] || 0) * (parsedMatrixB[x]?.[j] || 0);
        }
        result[i][j] = sum;
      }
    }
    return result;
  }, [parsedMatrixA1, parsedMatrixB, m, k, n]);

  const expectedC2 = useMemo(() => {
    const result: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let x = 0; x < k; x++) {
          sum += (parsedMatrixA2[i]?.[x] || 0) * (parsedMatrixB[x]?.[j] || 0);
        }
        result[i][j] = sum;
      }
    }
    return result;
  }, [parsedMatrixA2, parsedMatrixB, m, k, n]);

  const expectedC3 = useMemo(() => {
    const result: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let x = 0; x < k; x++) {
          sum += (parsedMatrixA3[i]?.[x] || 0) * (parsedMatrixB[x]?.[j] || 0);
        }
        result[i][j] = sum;
      }
    }
    return result;
  }, [parsedMatrixA3, parsedMatrixB, m, k, n]);

  const actualC1 = useMemo(() => {
    return matrixC.slice(0, m);
  }, [matrixC, m]);

  const actualC2 = useMemo(() => {
    return matrixC.slice(m, 2 * m);
  }, [matrixC, m]);

  const actualC3 = useMemo(() => {
    return matrixC.slice(2 * m, 3 * m);
  }, [matrixC, m]);

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
    const stream: { val: number; globalRowIdx: number }[] = [];
    // Prepend r padding zeros
    for (let i = 0; i < r; i++) {
      stream.push({ val: 0, globalRowIdx: -1 });
    }
    // Append column r of Matrix A (A[*, r])
    for (let i = 0; i < m * numMatrices; i++) {
      stream.push({ val: combinedParsedA[i]?.[r] || 0, globalRowIdx: i });
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
    const exited: { val: number; globalRowIdx: number }[] = [];
    for (let i = 0; i < m * numMatrices; i++) {
      const val = matrixC[i]?.[cIdx];
      if (val !== undefined && val !== null) {
        exited.push({ val, globalRowIdx: i });
      }
    }
    // Most recently exited first (at the top of our vertical stack)
    return exited.reverse();
  };

  // Real-time PE utilization metric %
  const peUtilization = useMemo(() => {
    if (!isInitialized || cycle === 0) return 0;
    let activePECount = 0;
    const totalPECount = k * n;
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < n; c++) {
        const i = cycle - 1 - r - c;
        if (i >= 0 && i < m * numMatrices) {
          activePECount++;
        }
      }
    }
    return Math.round((activePECount / totalPECount) * 100);
  }, [cycle, isInitialized, k, n, m, numMatrices]);

  if (!isLoaded) {
    return <div className="p-8 text-center font-mono text-muted-foreground">Loading WASM module...</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
      {/* 1. Configuration Section */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">2D Grid Configuration</CardTitle>
          <CardDescription>Configure dimensions and elements for weight-stationary 2D systolic array matrix multiplication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            {/* Dimension Controls */}
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
                  Size of square matrices and processing grid.
                </span>
              </div>
            </div>

            {/* Pipelined Batch Mode Control */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pipelined Batch Mode</label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => changeNumMatrices(1)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    numMatrices === 1
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-bold'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
                  }`}
                >
                  Single Matrix
                </button>
                <button
                  onClick={() => changeNumMatrices(2)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    numMatrices === 2
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-bold'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
                  }`}
                >
                  2x Batch Pipeline
                </button>
                <button
                  onClick={() => changeNumMatrices(3)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    numMatrices === 3
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-bold'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
                  }`}
                >
                  3x Batch Pipeline
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Multiply multiple separate inputs back-to-back to see the pipeline stay 100% full.
              </p>
            </div>
          </div>

          {/* Interactive Matrix Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Matrix A Input */}
            <div className="flex flex-col items-center p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-900">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Inputs ({numMatrices > 1 ? `Matrix A${activeInputTab + 1}` : 'Matrix A'}: {m}×{k})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeInputTab === 0) handleRandomizeA1();
                    else if (activeInputTab === 1) handleRandomizeA2();
                    else handleRandomizeA3();
                  }}
                  className="h-7 text-xs gap-1 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5" /> RNG
                </Button>
              </div>

              {/* Tabs for Multiple Matrices */}
              {numMatrices > 1 && (
                <div className="flex gap-1.5 mb-4 w-full justify-start border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <button
                    onClick={() => setActiveInputTab(0)}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer border ${
                      activeInputTab === 0
                        ? 'bg-teal-500 text-white border-teal-600 shadow-sm font-extrabold'
                        : 'bg-zinc-100 text-zinc-600 border-transparent hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Matrix A1 (Teal)
                  </button>
                  <button
                    onClick={() => setActiveInputTab(1)}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer border ${
                      activeInputTab === 1
                        ? 'bg-purple-500 text-white border-purple-600 shadow-sm font-extrabold'
                        : 'bg-zinc-100 text-zinc-600 border-transparent hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Matrix A2 (Purple)
                  </button>
                  {numMatrices === 3 && (
                    <button
                      onClick={() => setActiveInputTab(2)}
                      className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer border ${
                        activeInputTab === 2
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-extrabold'
                          : 'bg-zinc-100 text-zinc-600 border-transparent hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      Matrix A3 (Amber)
                    </button>
                  )}
                </div>
              )}

              <div className="relative px-5 py-4 border-l-2 border-r-2 border-zinc-400 dark:border-zinc-600 rounded-lg">
                <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tl-sm"></div>
                <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-bl-sm"></div>
                <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-zinc-400 dark:border-zinc-600 rounded-tr-sm"></div>
                <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-zinc-400 dark:border-zinc-600 rounded-br-sm"></div>

                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${k}, minmax(0, 1fr))` }}>
                  {(() => {
                    const activeMatrix = activeInputTab === 0 ? matrixA1 : activeInputTab === 1 ? matrixA2 : matrixA3;
                    const setActiveMatrix = activeInputTab === 0 ? setMatrixA1 : activeInputTab === 1 ? setMatrixA2 : setMatrixA3;
                    const activeColor = getMatrixColorClasses(activeInputTab * size);

                    return activeMatrix.map((row, rIdx) =>
                      row.map((val, cIdx) => {
                        const globalRowIdx = activeInputTab * size + rIdx;
                        const active = isCellActiveA(globalRowIdx, cIdx);

                        return (
                          <input
                            key={`a-${activeInputTab}-${rIdx}-${cIdx}`}
                            type="number"
                            step="any"
                            value={val}
                            onChange={e => {
                              const newVal = e.target.value;
                              setActiveMatrix(prev =>
                                prev.map((r, ri) =>
                                  r.map((c, ci) => (ri === rIdx && ci === cIdx ? newVal : c))
                                )
                              );
                            }}
                            className={`w-11 h-10 text-center font-mono text-sm border rounded-md bg-white dark:bg-zinc-950 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              active
                                ? `font-semibold scale-105 shadow-sm ${activeColor.bgActive} border-zinc-500`
                                : `border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:${activeColor.bg}`
                            }`}
                          />
                        );
                      })
                    );
                  })()}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2.5 text-center">
                {numMatrices > 1
                  ? "Select a matrix tab above to edit. They will enter the pipeline back-to-back."
                  : "Inputs stream in from the left, row-by-row with single-cycle delays."}
              </p>
            </div>

            {/* Matrix B Input */}
            <div className="flex flex-col items-center p-5 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-900">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Weights (Matrix B: {k}×{n})</span>
                <Button variant="outline" size="sm" onClick={handleRandomizeB} className="h-7 text-xs gap-1 cursor-pointer">
                  <Dices className="w-3.5 h-3.5" /> RNG
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
                        step="any"
                        value={val}
                        onChange={e => {
                          const newVal = e.target.value;
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

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleReset}
              className="flex-1 gap-1.5 cursor-pointer"
              variant={isInitialized ? "secondary" : "default"}
            >
              <RotateCcw className="w-4 h-4" /> Load/Reset Simulation
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

      {/* 2. 2D Systolic Array Visualizer */}
      <Card className="border-none shadow-md bg-white dark:bg-zinc-950 overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight">Systolic Array Visualizer (2D)</CardTitle>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                WASM Active
              </span>
            </div>
            <CardDescription>A weight-stationary 2D grid processing data flowing left-to-right, and accumulating top-to-bottom.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold font-mono bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-md mr-2 border border-zinc-200 dark:border-zinc-800">
              Cycle: {cycle}
            </span>
            <Button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              disabled={isComplete || !isInitialized}
              variant={isAutoPlaying ? "secondary" : "default"}
              className="w-32 shadow-sm gap-1.5"
            >
              {isAutoPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Auto-Play</>}
            </Button>
            <Button
              onClick={tick}
              disabled={isComplete || isAutoPlaying || !isInitialized}
              variant="outline"
              className="w-32 shadow-sm gap-1.5"
            >
              <StepForward className="w-4 h-4" /> Step
            </Button>
            {isInitialized && cycle > 0 && (
              <span className="text-sm font-bold font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                PE Utilization: {peUtilization}%
              </span>
            )}
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
                      {getLeftQueueToDisplay(r).map((item, idx) => {
                        const { val, globalRowIdx } = item;
                        // Check if this element is about to enter (it is the rightmost element in our reversed visible list)
                        const isEntering = idx === getLeftQueueToDisplay(r).length - 1;
                        const colors = globalRowIdx >= 0 ? getMatrixColorClasses(globalRowIdx) : null;

                        return (
                          <div
                            key={idx}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold shadow-sm transition-all duration-300 ${
                              globalRowIdx === -1
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800'
                                : isEntering && cycle < m * numMatrices + r && isInitialized
                                ? `${colors?.bgActive || 'bg-emerald-500 text-white border-emerald-600'} scale-105 font-bold`
                                : `${colors?.bg || 'bg-zinc-50'} ${colors?.text || 'text-zinc-400'} ${colors?.border || 'border-zinc-200'}`
                            }`}
                          >
                            {formatFloat(val)}
                          </div>
                        );
                      })}
                      <ArrowRight className="w-4 h-4 text-emerald-500 ml-1 shrink-0" />
                    </div>
                  </div>

                  {/* PEs for this row */}
                  {Array.from({ length: n }).map((_, c) => {
                    const state = peStates[r]?.[c] || { weight: matrixB[r]?.[c] || 0, xOut: 0, yOut: 0 };
                    // PE has active data flowing through it if globalRowIdx is valid
                    const globalRowIdx = cycle - 1 - r - c;
                    const hasActiveData = isInitialized && globalRowIdx >= 0 && globalRowIdx < m * numMatrices;
                    const colors = hasActiveData ? getMatrixColorClasses(globalRowIdx) : null;
                    const isPeActive = isInitialized && (state.xOut !== 0 || state.yOut !== 0);

                    return (
                      <div
                        key={`pe-${r}-${c}`}
                        className={`relative flex flex-col items-center justify-center p-3 bg-white dark:bg-zinc-950 border-2 rounded-xl shadow-md transition-all duration-300 w-28 h-28 mx-auto ${
                          hasActiveData && colors
                            ? `border-2 ${colors.borderActive} ring-2 ring-indigo-500/10`
                            : isPeActive
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:ring-indigo-400/20'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <span className="absolute top-1 right-2 text-[8px] font-bold text-zinc-400">PE({r},{c})</span>

                        <div className="text-center space-y-1 select-none">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">w: {formatFloat(state.weight)}</p>
                          <div className="flex flex-col gap-0.5 justify-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-dashed border-zinc-100 dark:border-zinc-900 pt-1 mt-1">
                            <span className={isInitialized && state.xOut !== 0 ? `font-bold ${colors?.text || "text-emerald-600 dark:text-emerald-400"}` : "text-zinc-400 dark:text-zinc-600"}>
                              x: {isInitialized ? formatFloat(state.xOut) : 0}
                              {hasActiveData && colors && (
                                <span className="text-[8px] font-bold opacity-80 ml-1">
                                  ({colors.name}<sub>{Math.floor(globalRowIdx % m)},{r}</sub>)
                                </span>
                              )}
                            </span>
                            <span className={isInitialized && state.yOut !== 0 ? `font-bold ${colors?.text || "text-blue-600 dark:text-blue-400"}` : "text-zinc-400 dark:text-zinc-600"}>
                              y: {isInitialized ? formatFloat(state.yOut) : 0}
                              {hasActiveData && colors && (
                                <span className="text-[8px] font-bold opacity-80 ml-1">
                                  ({colors.cName}<sub>{Math.floor(globalRowIdx % m)},{c}</sub>)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Connection Arrows right and down */}
                        {c < n - 1 && (
                          <div className="absolute top-1/2 -right-10 -translate-y-1/2 flex items-center z-10">
                            <ArrowRight className={`w-5 h-5 transition-colors duration-300 ${
                              hasActiveData
                                ? getArrowColorClass(globalRowIdx)
                                : isInitialized && state.xOut !== 0
                                ? 'text-emerald-500'
                                : 'text-zinc-200 dark:text-zinc-800'
                            } scale-110 font-bold`} />
                          </div>
                        )}
                        {r < k - 1 && (
                          <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 flex flex-col items-center z-10">
                            <ArrowDown className={`w-5 h-5 transition-colors duration-300 ${
                              hasActiveData
                                ? getArrowColorClass(globalRowIdx)
                                : isInitialized && state.yOut !== 0
                                ? 'text-blue-500'
                                : 'text-zinc-200 dark:text-zinc-800'
                            } scale-110 font-bold`} />
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
                      {exitedVals.slice(0, size * numMatrices).map((item, idx) => {
                        const { val, globalRowIdx } = item;
                        const isJustExited = idx === 0; // Top element in list is the most recent
                        const colors = getMatrixColorClasses(globalRowIdx);

                        return (
                          <div
                            key={idx}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs font-semibold shadow-sm transition-all duration-300 ${
                              isJustExited && isInitialized
                                ? `${colors.bgActive} border-zinc-600 scale-105 font-bold animate-pulse`
                                : `${colors.bg} ${colors.text} ${colors.border}`
                            }`}
                          >
                            {formatFloat(val)}
                          </div>
                        );
                      })}
                      {exitedVals.length > size * numMatrices && (
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
              {numMatrices > 1 ? (
                <span>
                  <strong>Pipelined Batch Mode:</strong> You are streaming <strong>{numMatrices} distinct input matrices</strong> (colored Teal, Purple, Amber) back-to-back through the array. 
                  Because the weight matrix is stationary (already loaded into the PEs), we do not need to pause or clear the hardware between multiplies! 
                  They flow continuously, achieving maximum PE hardware utilization (up to 100%) and zero idle cycle stalls.
                </span>
              ) : (
                <span>
                  For 2D Matrix Multiplication, inputs from Matrix A enter from the left, while Matrix B inputs stream from the top.
                  Each Processing Element multiplies its current inputs, adds the partial result, and passes the values downstream with a single-cycle register delay.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Results Matrix Section (Comparison) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expected Mathematical Result */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-md font-bold tracking-tight">Expected Results C (Math)</CardTitle>
            <CardDescription>The exact mathematical result of Matrix A × Matrix B.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 gap-6">
            <div className="flex flex-wrap gap-8 justify-center items-center">
              {/* Matrix 1 */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">C1 (Teal)</span>
                <div className="relative px-5 py-4 border-l-2 border-r-2 border-teal-400 dark:border-teal-600 rounded-lg">
                  <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-teal-400 dark:border-teal-600 rounded-tl-sm"></div>
                  <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-teal-400 dark:border-teal-600 rounded-bl-sm"></div>
                  <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-teal-400 dark:border-teal-600 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-teal-400 dark:border-teal-600 rounded-br-sm"></div>

                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                    {expectedC1.map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <div
                          key={`expected1-${rIdx}-${cIdx}`}
                          className="w-12 h-10 flex items-center justify-center font-mono text-sm border border-teal-100 dark:border-teal-900/30 rounded-md bg-teal-50/20 dark:bg-teal-950/10 text-zinc-800 dark:text-zinc-200"
                        >
                          {formatFloat(val)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Matrix 2 */}
              {numMatrices >= 2 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">C2 (Purple)</span>
                  <div className="relative px-5 py-4 border-l-2 border-r-2 border-purple-400 dark:border-purple-600 rounded-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-purple-400 dark:border-purple-600 rounded-tl-sm"></div>
                    <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-purple-400 dark:border-purple-600 rounded-bl-sm"></div>
                    <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-purple-400 dark:border-purple-600 rounded-tr-sm"></div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-purple-400 dark:border-purple-600 rounded-br-sm"></div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                      {expectedC2.map((row, rIdx) =>
                        row.map((val, cIdx) => (
                          <div
                            key={`expected2-${rIdx}-${cIdx}`}
                            className="w-12 h-10 flex items-center justify-center font-mono text-sm border border-purple-100 dark:border-purple-900/30 rounded-md bg-purple-50/20 dark:bg-purple-950/10 text-zinc-800 dark:text-zinc-200"
                          >
                            {formatFloat(val)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Matrix 3 */}
              {numMatrices === 3 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">C3 (Amber)</span>
                  <div className="relative px-5 py-4 border-l-2 border-r-2 border-amber-400 dark:border-amber-600 rounded-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-amber-400 dark:border-amber-600 rounded-tl-sm"></div>
                    <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-amber-400 dark:border-amber-600 rounded-bl-sm"></div>
                    <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-amber-400 dark:border-amber-600 rounded-tr-sm"></div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-amber-400 dark:border-amber-600 rounded-br-sm"></div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                      {expectedC3.map((row, rIdx) =>
                        row.map((val, cIdx) => (
                          <div
                            key={`expected3-${rIdx}-${cIdx}`}
                            className="w-12 h-10 flex items-center justify-center font-mono text-sm border border-amber-100 dark:border-amber-900/30 rounded-md bg-amber-50/20 dark:bg-amber-950/10 text-zinc-800 dark:text-zinc-200"
                          >
                            {formatFloat(val)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actual Hardware Outputs */}
        <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-md font-bold tracking-tight">Hardware Outputs C (Simulated)</CardTitle>
            <CardDescription>Elements of C as they emerge from the bottom row of PEs cycle-by-cycle.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 gap-6">
            <div className="flex flex-wrap gap-8 justify-center items-center">
              {/* Actual Matrix 1 */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">C1 (Teal)</span>
                <div className="relative px-5 py-4 border-l-2 border-r-2 border-teal-400 dark:border-teal-600 rounded-lg">
                  <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-teal-400 dark:border-teal-600 rounded-tl-sm"></div>
                  <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-teal-400 dark:border-teal-600 rounded-bl-sm"></div>
                  <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-teal-400 dark:border-teal-600 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-teal-400 dark:border-teal-600 rounded-br-sm"></div>

                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                    {actualC1.map((row, rIdx) =>
                      row.map((val, cIdx) => {
                        const globalRowIdx = rIdx;
                        const isEmerging = isCellJustEmergingC(globalRowIdx, cIdx);
                        return (
                          <div
                            key={`actual1-${rIdx}-${cIdx}`}
                            className={`w-12 h-10 flex items-center justify-center font-mono text-sm border rounded-md transition-all duration-300 ${
                              val === null
                                ? 'bg-zinc-100/50 dark:bg-zinc-900/10 text-zinc-400 border-dashed border-zinc-200 dark:border-zinc-800'
                                : isEmerging
                                ? 'bg-teal-500 text-white border-teal-600 font-bold scale-105 shadow-md'
                                : 'bg-teal-50/25 dark:bg-teal-950/5 text-zinc-800 dark:text-zinc-200 border-teal-100 dark:border-teal-900'
                            }`}
                          >
                            {val === null ? '-' : formatFloat(val)}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Actual Matrix 2 */}
              {numMatrices >= 2 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">C2 (Purple)</span>
                  <div className="relative px-5 py-4 border-l-2 border-r-2 border-purple-400 dark:border-purple-600 rounded-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-purple-400 dark:border-purple-600 rounded-tl-sm"></div>
                    <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-purple-400 dark:border-purple-600 rounded-bl-sm"></div>
                    <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-purple-400 dark:border-purple-600 rounded-tr-sm"></div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-purple-400 dark:border-purple-600 rounded-br-sm"></div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                      {actualC2.map((row, rIdx) =>
                        row.map((val, cIdx) => {
                          const globalRowIdx = m + rIdx;
                          const isEmerging = isCellJustEmergingC(globalRowIdx, cIdx);
                          return (
                            <div
                              key={`actual2-${rIdx}-${cIdx}`}
                              className={`w-12 h-10 flex items-center justify-center font-mono text-sm border rounded-md transition-all duration-300 ${
                                val === null
                                  ? 'bg-zinc-100/50 dark:bg-zinc-900/10 text-zinc-400 border-dashed border-zinc-200 dark:border-zinc-800'
                                  : isEmerging
                                  ? 'bg-purple-500 text-white border-purple-600 font-bold scale-105 shadow-md'
                                  : 'bg-purple-50/25 dark:bg-purple-950/5 text-zinc-800 dark:text-zinc-200 border-purple-100 dark:border-purple-900'
                              }`}
                            >
                              {val === null ? '-' : formatFloat(val)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actual Matrix 3 */}
              {numMatrices === 3 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">C3 (Amber)</span>
                  <div className="relative px-5 py-4 border-l-2 border-r-2 border-amber-400 dark:border-amber-600 rounded-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-1 border-t-2 border-amber-400 dark:border-amber-600 rounded-tl-sm"></div>
                    <div className="absolute bottom-0 left-0 w-2.5 h-1 border-b-2 border-amber-400 dark:border-amber-600 rounded-bl-sm"></div>
                    <div className="absolute top-0 right-0 w-2.5 h-1 border-t-2 border-amber-400 dark:border-amber-600 rounded-tr-sm"></div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-1 border-b-2 border-amber-400 dark:border-amber-600 rounded-br-sm"></div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                      {actualC3.map((row, rIdx) =>
                        row.map((val, cIdx) => {
                          const globalRowIdx = 2 * m + rIdx;
                          const isEmerging = isCellJustEmergingC(globalRowIdx, cIdx);
                          return (
                            <div
                              key={`actual3-${rIdx}-${cIdx}`}
                              className={`w-12 h-10 flex items-center justify-center font-mono text-sm border rounded-md transition-all duration-300 ${
                                val === null
                                  ? 'bg-zinc-100/50 dark:bg-zinc-900/10 text-zinc-400 border-dashed border-zinc-200 dark:border-zinc-800'
                                  : isEmerging
                                  ? 'bg-amber-500 text-white border-amber-600 font-bold scale-105 shadow-md'
                                  : 'bg-amber-50/25 dark:bg-amber-950/5 text-zinc-800 dark:text-zinc-200 border-amber-100 dark:border-amber-900'
                              }`}
                            >
                              {val === null ? '-' : formatFloat(val)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
