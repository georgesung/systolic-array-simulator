'use client';

import React, { useState } from 'react';
import { Simulator } from '@/components/Simulator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Grid, Sliders, ArrowRight, ArrowDown, HelpCircle, GraduationCap } from 'lucide-react';

type TabId = 'dot-product' | 'matrix-multiply' | 'playground';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('dot-product');

  // Dynamic header based on active tab
  const getHeaderContent = () => {
    switch (activeTab) {
      case 'dot-product':
        return {
          title: 'Pipelined Dot Product',
          subtitle: 'Interactive hardware simulation powered by Rust and WebAssembly. Observe data flow through a 1D systolic array in real-time.',
        };
      case 'matrix-multiply':
        return {
          title: '2D Systolic Array Matrix Multiply',
          subtitle: 'Simulate a fully parallel, cycle-accurate 2D hardware grid. Watch row and column inputs propagate and accumulate live.',
        };
      case 'playground':
        return {
          title: 'Hardware Sandbox',
          subtitle: 'Configure custom clock rates, inspect registers, and experiment with processing element characteristics.',
        };
    }
  };

  const header = getHeaderContent();

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black font-sans py-16 px-4">
      {/* Top Navigation Bar */}
      <div className="max-w-5xl mx-auto mb-12 flex justify-center">
        <nav className="inline-flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => setActiveTab('dot-product')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'dot-product'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Cpu className="w-4 h-4" />
            1D Dot Product
          </button>
          <button
            onClick={() => setActiveTab('matrix-multiply')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'matrix-multiply'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Grid className="w-4 h-4" />
            2D Matrix Multiply
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'playground'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Sandbox Playground
          </button>
        </nav>
      </div>

      <header className="max-w-2xl mx-auto mb-16 text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          {header.title}
        </h1>
        <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
          {header.subtitle}
        </p>
      </header>

      <main className="max-w-5xl mx-auto">
        {activeTab === 'dot-product' && <Simulator />}

        {activeTab === 'matrix-multiply' && (
          <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
            {/* Configuration Section (stacked vertically) */}
            <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight">2D Grid Configuration</CardTitle>
                <CardDescription>Configure dimensions and matrices for 2D systolic computation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Matrix A Rows (M)</label>
                    <input
                      type="number"
                      disabled
                      value={3}
                      className="w-full h-10 px-3 rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 text-muted-foreground cursor-not-allowed opacity-70 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Matrix A Cols / B Rows (K)</label>
                    <input
                      type="number"
                      disabled
                      value={3}
                      className="w-full h-10 px-3 rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 text-muted-foreground cursor-not-allowed opacity-70 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Matrix B Cols (N)</label>
                    <input
                      type="number"
                      disabled
                      value={3}
                      className="w-full h-10 px-3 rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 text-muted-foreground cursor-not-allowed opacity-70 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Matrix A (Inputs Left)</label>
                    <textarea
                      disabled
                      value={`[ 1,  2,  3 ]\n[ 4,  5,  6 ]\n[ 7,  8,  9 ]`}
                      className="w-full h-24 p-3 rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 text-muted-foreground cursor-not-allowed opacity-70 font-mono text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Matrix B (Inputs Top)</label>
                    <textarea
                      disabled
                      value={`[ 1,  0,  0 ]\n[ 0,  1,  0 ]\n[ 0,  0,  1 ]`}
                      className="w-full h-24 p-3 rounded-md border border-input bg-zinc-50 dark:bg-zinc-900 text-muted-foreground cursor-not-allowed opacity-70 font-mono text-sm resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visualizer Section (stacked vertically below config, providing maximum horizontal width) */}
            <Card className="border-none shadow-md bg-white dark:bg-zinc-950 overflow-hidden">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight">Systolic Array Visualizer (2D)</CardTitle>
                    <CardDescription>A standard 2D mesh of processing elements showing data flow.</CardDescription>
                  </div>
                  <span className="self-start sm:self-center inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    WASM Integration Pending
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[350px]">
                {/* Simulated 2D grid */}
                <div className="grid grid-cols-3 gap-12 relative p-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 max-w-xl w-full my-8">
                  
                  {/* Row Inputs Indicators */}
                  <div className="absolute -left-12 top-[calc(50%-4px)] -translate-y-1/2 flex flex-col gap-20 text-zinc-400 dark:text-zinc-600 font-mono text-xs font-semibold">
                    <span>A₀ ──&gt;</span>
                    <span>A₁ ──&gt;</span>
                    <span>A₂ ──&gt;</span>
                  </div>

                  {/* Col Inputs Indicators */}
                  <div className="absolute left-[calc(50%-1px)] -top-10 -translate-x-1/2 flex gap-24 text-zinc-400 dark:text-zinc-600 font-mono text-xs font-semibold">
                    <span className="flex flex-col items-center">B₀<ArrowDown className="w-3.5 h-3.5 mt-1" /></span>
                    <span className="flex flex-col items-center">B₁<ArrowDown className="w-3.5 h-3.5 mt-1" /></span>
                    <span className="flex flex-col items-center">B₂<ArrowDown className="w-3.5 h-3.5 mt-1" /></span>
                  </div>

                  {/* 3x3 Grid of PEs */}
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const row = Math.floor(idx / 3);
                    const col = idx % 3;
                    return (
                      <div key={idx} className="relative flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors w-24 h-24">
                        <span className="absolute top-1 right-2 text-[9px] font-bold text-zinc-400">PE_{row},{col}</span>
                        <div className="text-center">
                          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">w: {(idx + 1) * 2}</p>
                          <div className="flex gap-2 justify-center mt-1 text-[10px] font-mono text-zinc-400">
                            <span>x: 0</span>
                            <span>y: 0</span>
                          </div>
                        </div>

                        {/* Connection Arrows right and down */}
                        {col < 2 && (
                          <div className="absolute top-1/2 -right-8 -translate-y-1/2 text-zinc-300 dark:text-zinc-700">
                            <ArrowRight className="w-4 h-4 animate-pulse" />
                          </div>
                        )}
                        {row < 2 && (
                          <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 text-zinc-300 dark:text-zinc-700">
                            <ArrowDown className="w-4 h-4 animate-pulse" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 text-center max-w-lg space-y-2">
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-500" /> Educational Concept
                  </h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    For 2D Matrix Multiplication, inputs from Matrix A enter from the left, while Matrix B inputs stream from the top. 
                    Each Processing Element multiplies its current inputs, adds the partial result, and passes the values downstream with a single-cycle register delay.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 pb-20">
            <Card className="border-none shadow-md bg-white dark:bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight">Sandbox Controls</CardTitle>
                <CardDescription>Experiment with global timing parameters, memory layouts, and architectural characteristics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Speed Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
                      <span>Clock Cycle Delay</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-mono">1000 ms</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="3000"
                      value="1000"
                      disabled
                      className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-not-allowed opacity-60"
                    />
                    <p className="text-[11px] text-zinc-400">Adjust simulation update frequency in real-time.</p>
                  </div>

                  {/* Stationary Mode */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase block">Stationary Mode</label>
                    <div className="flex gap-2">
                      <Button variant="outline" disabled className="flex-1 border-blue-500 text-blue-500 cursor-not-allowed">
                        Weight Stationary
                      </Button>
                      <Button variant="outline" disabled className="flex-1 opacity-50 cursor-not-allowed">
                        Output Stationary
                      </Button>
                    </div>
                    <p className="text-[11px] text-zinc-400">Toggle whether weights stay resident in PEs or outputs accumulate locally.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm">Sandbox Mode Coming Soon!</h4>
                      <p className="text-xs text-blue-700/80 dark:text-blue-400/80 leading-relaxed">
                        The future sandbox will allow you to drag and drop custom execution patterns, simulate custom register values, and trigger arbitrary hardware interrupts or bubble conditions directly.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="max-w-2xl mx-auto mt-12 text-center text-xs text-zinc-500">
        <p>Built with Next.js, Tailwind CSS, and Rust (WASM)</p>
      </footer>
    </div>
  );
}
