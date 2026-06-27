'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export function PlaygroundSimulator() {
  return (
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
  );
}
