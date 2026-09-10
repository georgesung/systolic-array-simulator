'use client';

import React, { useState, useEffect } from 'react';
import { Instructions } from '@/components/Instructions';
import { PESimulator } from '@/components/PESimulator';
import { Simulator } from '@/components/Simulator';
import { MatrixMultiplySimulator } from '@/components/MatrixMultiplySimulator';
import { TiledMatmulSimulator } from '@/components/TiledMatmulSimulator';
import { Box, Brackets, Grid, BookOpen, Layers } from 'lucide-react';

type TabId = 'instructions' | 'pe' | 'dot-product' | 'matrix-multiply' | 'tiled';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('instructions');

  // Synchronize URL hash with the tab state on load and hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#instructions' || hash === '#overview' || hash === '') {
        setActiveTab('instructions');
      } else if (hash === '#pe') {
        setActiveTab('pe');
      } else if (hash === '#dotproduct' || hash === '#dot-product') {
        setActiveTab('dot-product');
      } else if (hash === '#matmul' || hash === '#matrix-multiply') {
        setActiveTab('matrix-multiply');
      } else if (hash === '#tiled' || hash === '#tiled-matmul') {
        setActiveTab('tiled');
      }
    };

    // Run once on initial mount
    handleHashChange();

    // Listen for manual hash changes (e.g., back/forward buttons, user editing URL)
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Helper to switch tabs and update URL hash cleanly
  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    const hash =
      tab === 'instructions'
        ? '#instructions'
        : tab === 'pe'
        ? '#pe'
        : tab === 'dot-product'
        ? '#dot-product'
        : tab === 'matrix-multiply'
        ? '#matmul'
        : '#tiled';
    // Use replaceState to update URL hash without jumpy browser scroll behavior
    window.history.replaceState(null, '', hash);
  };

  // Dynamic header based on active tab
  const getHeaderContent = () => {
    switch (activeTab) {
      case 'instructions':
        return {
          title: 'Welcome to the Systolic Array Simulator',
          subtitle: 'An interactive, clock-cycle-accurate visualizer of hardware architectures optimized for deep learning and AI accelerators.',
        };
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
      case 'tiled':
        return {
          title: 'Tiled Matrix Multiply',
          subtitle: 'Real arrays are smaller than real matrices. Chop the problem into tiles, reload weights per tile, and accumulate the partial sums.',
        };
    }
  };

  const header = getHeaderContent();

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black font-sans py-16 px-4">
      {/* Top Navigation Bar */}
      <div className="max-w-5xl mx-auto mb-12 flex justify-center">
        <nav className="inline-flex flex-wrap items-center justify-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => selectTab('instructions')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'instructions'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Instructions
          </button>
          <button
            onClick={() => selectTab('pe')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'pe'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Box className="w-4 h-4" />
            Processing Element
          </button>
          <button
            onClick={() => selectTab('dot-product')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'dot-product'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Brackets className="w-4 h-4" />
            1D Dot Product
          </button>
          <button
            onClick={() => selectTab('matrix-multiply')}
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
            onClick={() => selectTab('tiled')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'tiled'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Tiled Matmul
          </button>
        </nav>
      </div>

      <header className="max-w-2xl mx-auto mb-16 text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          {header.title}
        </h1>
        <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 mx-auto leading-relaxed">
          {header.subtitle}
        </p>
      </header>

      <main className="max-w-5xl mx-auto">
        {activeTab === 'instructions' && <Instructions onStart={() => selectTab('pe')} />}
        {activeTab === 'pe' && <PESimulator />}
        {activeTab === 'dot-product' && <Simulator />}
        {activeTab === 'matrix-multiply' && <MatrixMultiplySimulator />}
        {activeTab === 'tiled' && <TiledMatmulSimulator />}
      </main>

      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <div className="mb-2 flex items-center justify-center gap-2 flex-wrap">
          <a
            href="https://www.georgesung.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            georgesung.com
          </a>
          <span className="text-zinc-300 dark:text-zinc-800">|</span>
          <a
            href="https://www.georgesung.com/ai-hardware/systolic-array-matmul"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary font-medium text-indigo-600 dark:text-indigo-400"
          >
            Supplementary Blog Post
          </a>
          <span className="text-zinc-300 dark:text-zinc-800">|</span>
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
