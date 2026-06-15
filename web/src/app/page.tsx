import { Simulator } from '@/components/Simulator';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black font-sans py-16 px-4">
      <header className="max-w-2xl mx-auto mb-16 text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          Pipelined Dot Product
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Interactive hardware simulation powered by Rust and WebAssembly. 
          Observe data flow through a systolic array in real-time.
        </p>
      </header>

      <main>
        <Simulator />
      </main>

      <footer className="max-w-2xl mx-auto mt-12 text-center text-xs text-zinc-500">
        <p>Built with Next.js, Tailwind CSS, and Rust (WASM)</p>
      </footer>
    </div>
  );
}
