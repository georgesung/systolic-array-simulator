import { Simulator } from '@/components/Simulator';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans py-12 px-4">
      <header className="max-w-2xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Pipelined Dot Product
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Hardware simulation powered by Rust & WebAssembly
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
