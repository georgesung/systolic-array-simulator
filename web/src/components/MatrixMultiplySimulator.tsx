'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMatrixMultiply } from '@/hooks/useMatrixMultiply';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, StepForward, RotateCcw, Dices, GraduationCap } from 'lucide-react';
import { SystolicGrid, type PEFlow, type StreamCell } from '@/components/SystolicGrid';
import { TONES, toneForIndex } from '@/lib/tones';

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

  // One tone per input matrix in the batch: A1 teal, A2 purple, A3 amber.
  const getMatrixColorClasses = (globalRowIdx: number) => {
    const matrixId = Math.floor(globalRowIdx / size);
    if (matrixId < 0 || matrixId > 2) {
      return { tone: TONES.zinc, name: 'A', cName: 'C' };
    }
    return {
      tone: toneForIndex(matrixId),
      name: `A${matrixId + 1}`,
      cName: `C${matrixId + 1}`,
    };
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

  // --- Adapters from this tab's batch bookkeeping to <SystolicGrid /> ---------

  const totalStreamRows = m * numMatrices;

  const leftQueueCells = (r: number): StreamCell[] => {
    const items = getLeftQueueToDisplay(r);
    return items.map((item, idx) => ({
      val: item.val,
      // globalRowIdx -1 marks the skew padding zeros ahead of row r's data.
      tone: item.globalRowIdx >= 0 ? getMatrixColorClasses(item.globalRowIdx).tone : null,
      active: idx === items.length - 1 && cycle < totalStreamRows + r && isInitialized,
    }));
  };

  const bottomQueueCells = (c: number): StreamCell[] =>
    getExitedForCol(c)
      .slice(0, size * numMatrices)
      .map((item, idx) => ({
        val: item.val,
        tone: getMatrixColorClasses(item.globalRowIdx).tone,
        // The list is newest-first, so index 0 is what just fell out of the array.
        active: idx === 0 && isInitialized,
      }));

  const flowAt = (r: number, c: number): PEFlow | null => {
    // A(i, r) reaches PE(r, c) on cycle i + r + c + 1.
    const globalRowIdx = cycle - 1 - r - c;
    if (!isInitialized || globalRowIdx < 0 || globalRowIdx >= totalStreamRows) return null;
    const colors = getMatrixColorClasses(globalRowIdx);
    const localRow = globalRowIdx % m;
    return {
      tone: colors.tone,
      xLabel: <>({colors.name}<sub>{localRow},{r}</sub>)</>,
      yLabel: <>({colors.cName}<sub>{localRow},{c}</sub>)</>,
    };
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
                    Matrix A1
                  </button>
                  <button
                    onClick={() => setActiveInputTab(1)}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer border ${
                      activeInputTab === 1
                        ? 'bg-purple-500 text-white border-purple-600 shadow-sm font-extrabold'
                        : 'bg-zinc-100 text-zinc-600 border-transparent hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Matrix A2
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
                      Matrix A3
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
                                ? `font-semibold scale-105 shadow-sm ${activeColor.tone.bgActive} border-zinc-500`
                                : `border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:${activeColor.tone.bg}`
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
          <SystolicGrid
            rows={k}
            cols={n}
            peStates={peStates}
            fallbackWeight={(r, c) => parsedMatrixB[r]?.[c] ?? 0}
            isInitialized={isInitialized}
            leftGutterPx={40 + size * 34}
            leftQueue={leftQueueCells}
            bottomQueue={bottomQueueCells}
            bottomOverflow={c => getExitedForCol(c).length > size * numMatrices}
            flowAt={flowAt}
          />

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
                  Inputs from Matrix A enter from the left, while the weights (Matrix B) are stationary.
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
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">C1</span>
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
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">C2</span>
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
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">C3</span>
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
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">C1</span>
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
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">C2</span>
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
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">C3</span>
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
