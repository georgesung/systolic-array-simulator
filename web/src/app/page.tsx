'use client';

import React, { useState } from 'react';
import { PESimulator } from '@/components/PESimulator';
import { Simulator } from '@/components/Simulator';
import { MatrixMultiplySimulator } from '@/components/MatrixMultiplySimulator';
import { PlaygroundSimulator } from '@/components/PlaygroundSimulator';
import { Binary, Cpu, Grid, Sliders } from 'lucide-react';

type TabId = 'pe' | 'dot-product' | 'matrix-multiply' | 'playground';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('pe');

  // Dynamic header based on active tab
  const getHeaderContent = () => {
    switch (activeTab) {
      case 'pe':
        return {
          title: 'Processing Element (PE)',
          subtitle: 'The fundamental unit of systolic arrays, the Processing Element (PE). See how Multiply Accumulate (MAC) units work cycle-by-cycle.',
        };
      case 'dot-product':
        return {
          title: 'Pipelined Dot Product',
          subtitle: 'Dot product via a 1D array of PEs. One "column" in a systolic array.',
        };
      case 'matrix-multiply':
        return {
          title: 'Systolic Array Matrix Multiply',
          subtitle: '2D grid of PEs to compute weight stationary matrix multiplication. A series of dot products!',
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
            onClick={() => setActiveTab('pe')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'pe'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Binary className="w-4 h-4" />
            Processing Element
          </button>
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
        {activeTab === 'pe' && <PESimulator />}
        {activeTab === 'dot-product' && <Simulator />}
        {activeTab === 'matrix-multiply' && <MatrixMultiplySimulator />}
        {activeTab === 'playground' && <PlaygroundSimulator />}
      </main>

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <div className="mb-2">
          <a
            href="https://www.georgesung.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            georgesung.com
          </a>
          <span className="mx-2">|</span>
          <a
            href="https://github.com/georgesung/systolic-array-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            View source code on Github
          </a>
        </div>
        <p className="text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} Jou-ching (George) Sung
        </p>
      </footer>
    </div>
  );
}
