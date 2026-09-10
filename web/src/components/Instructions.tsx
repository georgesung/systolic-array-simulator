'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid, RotateCcw, ArrowRight, Info, Cpu, Layers, LayoutGrid } from 'lucide-react';

interface InstructionsProps {
  onStart: () => void;
}

export function Instructions({ onStart }: InstructionsProps) {
  return (
    <div className="space-y-12">
      {/* Introduction Card */}
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
        <CardHeader className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 w-fit">
            <Info className="w-3.5 h-3.5" />
            Hardware Acceleration & Parallelism
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            What is a Systolic Array?
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
            Deep learning models rely heavily on large-scale matrix multiplications. Traditional CPUs spend a lot of time and energy fetching instructions and data from memory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-zinc-600 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
          <p>
            To overcome this memory bottleneck, modern AI hardware accelerators (like Google&apos;s TPU) use a specialized architecture called a <strong className="text-zinc-950 dark:text-zinc-50">Systolic Array</strong>. In this design, data flows (or &quot;pumps&quot;) through a 2D network of simple computing nodes called <strong>Processing Elements (PEs)</strong>.
          </p>
          <p>
            The word <em className="italic">systolic</em> comes from the heartbeat (systole), symbolizing how data is pumped through the array at every clock tick. Once data is loaded from main memory, it is reused across multiple adjacent PEs without being written back, resulting in exceptionally high compute density, minimal memory bandwidth, and near-perfect efficiency!
          </p>
          
          <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/50 text-sm">
            <span className="font-semibold text-indigo-950 dark:text-indigo-300">📖 Deep Dive:</span> Learn more about why matrix multiplications dominate LLM workloads, where they occur, and how hardware accelerators optimize them in the{' '}
            <a 
              href="https://www.georgesung.com/ai-hardware/systolic-array-matmul" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Supplementary Blog Post
            </a>.
          </div>
        </CardContent>
      </Card>

      {/* Simulator Component Tabs Explained */}
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Explore the Simulator Tabs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* PE Card */}
          <Card className="border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/10 dark:bg-emerald-950/5 hover:border-emerald-200 transition-all shadow-sm">
            <CardHeader className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Processing Element (PE)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                The atomic block of systolic computation.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-2">
              <p>
                Each PE houses a <strong>Multiply-Accumulate (MAC)</strong> unit and output registers to stage computation.
              </p>
              <p className="font-mono bg-zinc-100 dark:bg-zinc-900 p-2 rounded text-xs text-zinc-800 dark:text-zinc-200">
                Y_out = (X_in * W) + Y_in
              </p>
              <p>
                The weight <code className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">w</code> is stationary (stored inside the PE). Inputs flow in and get latched to registers at each clock tick.
              </p>
            </CardContent>
          </Card>

          {/* 1D Dot Product Card */}
          <Card className="border-blue-100 dark:border-blue-950/50 bg-blue-50/10 dark:bg-blue-950/5 hover:border-blue-200 transition-all shadow-sm">
            <CardHeader className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                1D Pipelined Dot Product
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Chaining PEs to compute a vector product.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-2">
              <p>
                A 1D vertical chain of PEs computes the sum-of-products. 
              </p>
              <p>
                Because registers introduce a 1-cycle delay between PEs, the inputs <strong>must be staggered in time</strong> (delayed by 1 cycle per subsequent element).
              </p>
              <p>
                This ensures the partial accumulation sum flowing downwards meets its corresponding product at the exact right moment.
              </p>
            </CardContent>
          </Card>

          {/* 2D Matrix Multiply Card */}
          <Card className="border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/10 dark:bg-indigo-950/5 hover:border-indigo-200 transition-all shadow-sm">
            <CardHeader className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Grid className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                2D Matrix Multiply
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Highly parallel General Matrix Multiply (GEMM).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-2">
              <p>
                A full grid of PEs multiplies two matrices.
              </p>
              <p>
                Weights are stationary inside the 2D grid of PEs. Inputs stream from the left, while partial sums accumulate down the columns.
              </p>
              <p>
                Since the weights are pre-loaded, we can stream multiple consecutive matrices back-to-back without resetting the hardware!
              </p>
            </CardContent>
          </Card>

          {/* Tiled Matmul Card */}
          <Card className="border-amber-100 dark:border-amber-950/50 bg-amber-50/10 dark:bg-amber-950/5 hover:border-amber-200 transition-all shadow-sm">
            <CardHeader className="space-y-2">
              <div className="p-2 w-fit rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Tiled Matmul
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                When the matrix is bigger than the hardware.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-2">
              <p>
                Real arrays are a fixed size, and real matrices are much larger. So the weights get chopped into <strong>tiles</strong>, loaded one at a time.
              </p>
              <p>
                Each tile is a separate pass over the same hardware, so every pass pays for a <strong>weight reload</strong> and a fresh pipeline fill.
              </p>
              <p>
                Partial sums from different tiles are added up in an <strong>accumulator</strong> outside the array — so a result cell is revisited, not computed once.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How to Run the Simulations */}
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            How to Run the Simulations
          </CardTitle>
          <CardDescription>
            Follow these 3 simple steps on any of the simulator tabs to see the hardware in action:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-3 relative">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 font-bold text-sm text-zinc-700 dark:text-zinc-300">
                  1
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Configure Inputs</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Use the left-hand configuration panel to change input vectors, dimensions, or weight matrices. You can also click the <strong>Randomize</strong> (🎲) button to quickly load randomized values.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3 relative">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900 font-bold text-sm text-amber-700 dark:text-amber-400">
                  2
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Load & Reset Sim</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <strong className="text-zinc-950 dark:text-zinc-50">Crucial Step:</strong> Before starting or after modifying inputs, you must click the <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400"><RotateCcw className="w-3 h-3" /> Load/Reset Simulation</span> button. This clears the hardware registers and loads the new stationary weights!
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3 relative">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  3
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Simulate the Clock</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Once initialized, you can advance the clock:
              </p>
              <ul className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 space-y-1 pl-4 list-disc">
                <li><strong className="text-zinc-950 dark:text-zinc-100">Step (⏭️):</strong> Advancing exactly one cycle. Great for inspection.</li>
                <li><strong className="text-zinc-950 dark:text-zinc-100">Auto-Play (▶️):</strong> Continuously advances cycles. Click Pause at any time!</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Button to Get Started */}
      <div className="flex justify-center pt-4">
        <Button 
          onClick={onStart} 
          size="lg" 
          className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold px-6 py-5 rounded-xl cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Start with Processing Element (PE)
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
