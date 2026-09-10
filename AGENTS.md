# AGENTS.md

Orientation for coding agents working in this repo. Read this first, then `README.md` for the full architecture write-up.

## What this is

A cycle-accurate **systolic array simulator** for teaching how hardware matrix multiplication works. Rust models the hardware, compiles to WASM, and a Next.js app visualizes it clock-cycle by clock-cycle.

Three names for one project — don't be confused by them:
- Crate name: `rust-hw-playground`
- Local directory: `pipeline_add` (historical; the project started as a 2-stage pipelined adder)
- GitHub repo / live site: `georgesung/systolic-array-simulator` → https://systolic-array-simulator.georgesung.com

## The one thing that trips people up

**The frontend does not consume Rust source. It consumes the built WASM package.**

`web/package.json` depends on `"rust-hw-playground": "file:../pkg"`, and `pkg/` is generated (and git-ignored). So after *any* edit under `src/`:

```bash
wasm-pack build --target web
```

Skip that and the web app silently keeps running the old simulation logic.

## Commands

| Task | Command | Where |
| --- | --- | --- |
| Native Rust tests | `cargo test` | repo root |
| WASM-binding tests | `wasm-pack test --node` | repo root |
| Build WASM package | `wasm-pack build --target web` | repo root |
| CLI: 1D dot product | `cargo run --bin cli_dot_product` | repo root |
| CLI: 2D systolic array | `cargo run --bin cli_systolic_array` | repo root |
| Dev server | `npm run dev` | `web/` |
| Static production build | `npm run build` (outputs `web/out/`) | `web/` |
| Serve the static build | `npm run serve` | `web/` |
| Lint | `npm run lint` | `web/` |

`cargo test` runs 8 tests and **silently skips** the two `#[wasm_bindgen_test]`s in `src/wasm_bindings.rs`. Those only run under `wasm-pack test --node`. Run both before claiming the suite is green.

There is no test suite for the frontend — verify UI changes by running the dev server.

## Layout

```
src/                    Rust hardware model (~1100 lines, the substance of the project)
  processing_element.rs   ProcessingElement: weight + reg_x_out + reg_y_out, tick() does MAC
  dot_product.rs          DotProduct1D<S>: a column of PEs
  systolic_array.rs       SystolicArray2D<S>: the grid
  pipeline_add.rs         PipelinedAdder: educational only, not exposed to the frontend
  wasm_bindings.rs        DotProductSim / SystolicArray2DSim — the entire JS-facing API
  bin/                    Two interactive CLI simulators, handy for debugging without a browser
web/src/
  app/page.tsx            Single client page; five tabs, hash-routed (#pe, #dot-product, #matmul, #tiled)
  components/             One component per tab + PipelineVisualizer (SVG, used by the 1D tab)
  components/SystolicGrid.tsx  Shared, stateless PE-grid render — used by the 2D and tiled tabs
  components/ui/          shadcn/ui primitives — generated, don't hand-edit
  hooks/                  usePipeline (1D), useMatrixMultiply (2D), useTiledMatmul (tiled)
  lib/tones.ts            Shared Tailwind color sets for the grid visualizers
docs/                     Standalone MkDocs site — STALE, see below
```

## Invariants to respect in the Rust core

These encode the whole educational point of the project. Breaking them makes the simulation lie about hardware.

1. **A tick observes only pre-clock-edge state.** Every PE in a single `tick()` must read its neighbors' registers as they were *before* this cycle. Two different tricks achieve this, and both are load-bearing:
   - `SystolicArray2D::tick` iterates **backward** (`for r in (0..rows).rev()`, same for cols) so a PE reads neighbors that haven't ticked yet this cycle.
   - `DotProduct1D::tick` iterates **forward** but snapshots `reg_y_out` *before* ticking each PE, passing the snapshot down.

   If you refactor either loop, the existing hand-traced tests (`test_systolic_matmul_2x2_static`, `test_dot_product_static_array`) are what catch a mistake — they assert exact per-cycle values, including the zeros during pipeline fill.

2. **`ProcessingElement::tick` registers its outputs.** `reg_x_out`/`reg_y_out` hold values for the *next* cycle. Never make a PE's output combinationally visible to its neighbor within the same tick.

3. **Weight-stationary.** Weights load once via `load_weights` and never move; activations flow left→right, partial sums flow top→bottom.

4. **Storage genericity.** Both array types are generic over `S: AsMut<[ProcessingElement]>` so the same logic serves `new_static()` (stack array, `const N`) and `new_dynamic()` (Vec, used by WASM). Keep new methods on the generic impl unless they genuinely need `Vec`.

5. **`get_state()` layout is a contract with the frontend.** It returns a flat `[weight, x_out, y_out, ...]` per PE in row-major order. Change it and you must update `usePipeline.ts` and `useMatrixMultiply.ts` in lockstep.

The best regression check for array logic is `test_systolic_matmul_random_dynamic`: it drives the skewed wavefront for every size 2×2 through 10×10 and compares against a naive triple-loop matmul.

## Frontend notes

- `web/AGENTS.md` carries a standing warning: this is **Next.js 16**, which has breaking changes relative to older training data. Consult `web/node_modules/next/dist/docs/` before writing Next-specific code.
- The app is a static export (`output: 'export'` in `next.config.ts`) — no server, no API routes, no server components doing data fetching.
- `next.config.ts` also enables webpack's `asyncWebAssembly` experiment. That flag is what makes the WASM import work; don't drop it.
- Both hooks guard against a freed WASM pointer (`isValidWasmInstance` checks `__wbg_ptr !== 0`) and reset the sim when dimensions or matrices change. Preserve that when touching hook lifecycle code.
- The 2D hook is general over `(m, k, n)`, but `MatrixMultiplySimulator.tsx` currently locks the UI to square arrays, `size` clamped to 2–8.
- The tiled tab (`useTiledMatmul.ts`) is a pure-TypeScript scheduler over the *existing* Rust sim: one
  `SystolicArray2DSim` pass per tile, weights reloaded between passes, partial sums from different
  K-tiles summed in a JS accumulator. It needs no Rust changes — keep it that way unless you are
  deliberately modelling something the core cannot express. Two things to know if you touch it:
  `load_weights` does **not** clear the data registers, so each pass builds a fresh sim rather than
  reloading a dirty array; and `tick()`'s `top_ins` port is still fed zeros, which is the natural
  hook if you ever want the array itself to accumulate across K-tiles.
- **The tiled tab is framed as a TPU, on purpose.** Weight-stationary array + weight FIFO +
  accumulator, one memory level. Do not add CPU/BLIS-style cache blocking, packing, or a multi-level
  memory hierarchy: a systolic array's argument is that reuse is *spatial* (data propagates across
  PEs) rather than *temporal* (data cycles through caches), and a cache-hierarchy visualization would
  undercut that. Loop order is N-outer / K-middle / M-innermost, which happens to be the Goto/BLIS
  order — worth a sentence in prose, not a second simulator.
- Weight-load timing lives entirely in the scheduler, not in Rust. A tile shift-in costs one cycle
  per array row (`TilePass.loadCycles`); `peStatesShiftingIn` fakes the visual, pushing the tile's
  bottom row first so it ends up at the bottom after `tk` cycles. With the FIFO on, only pass 0 pays
  the stall — later loads overlap the previous pass's compute, so `loadCycles` is 0 and the staging
  is shown in a separate FIFO panel instead of in the array.
- `macsAt` / `phaseAt` are pure functions over a `TilePass`, used both to accumulate the utilization
  counter and to draw the pass timeline. Keep them pure — the timeline renders every cycle of a pass
  ahead of time, including cycles that have not run yet.
- Both grid tabs render through `SystolicGrid.tsx`, which holds no simulation state — everything it
  draws comes from callbacks (`leftQueue`, `bottomQueue`, `flowAt`, `peMuted`, ...). Add new visual
  affordances there rather than forking the grid a third time.
- Hooks here follow the repo's "reset during render" pattern rather than resetting in an effect, and
  `useTiledMatmul` returns the *post-reset* snapshot on that same render. Returning the stale one
  crashes the tab, because the old `passIdx` can point past the end of a newly rebuilt pass list.
- Tailwind v4 + shadcn/ui. Match existing class conventions (zinc palette, dark-mode variants on every colored element).

## CI and deployment

`.github/workflows/nextjs.yml` runs on every push to `main`: build WASM → `npm install` in `web/` → `next build --webpack` → deploy `web/out/` to GitHub Pages (custom domain from `web/public/CNAME`).

**CI does not run `cargo test` or lint.** Nothing catches a broken simulation before it ships — run the tests locally.

## Known cruft (don't be alarmed, don't "fix" unasked)

- `docs/` + `mkdocs.yml` are a separate MkDocs site last touched in June 2026, before the 2D matmul and single-PE tabs existed. It describes only the 1D pipeline and is not built or deployed by CI. `README.md` is the current source of truth.
- `.venv/` is a local Python env for MkDocs (git-ignored).
- `pkg/`, `web/out/`, `web/.next/`, `target/` are all generated and git-ignored.

## Conventions

- Rust comments in this repo are deliberately explanatory — they're teaching material, not noise. Match that register when editing the core; keep explaining *why* a cycle behaves the way it does.
- Tests use a hand-rolled xorshift `SimpleRng` rather than pulling in `rand`; the crate has no dev-dependencies beyond `wasm-bindgen-test`. Keep the dependency footprint minimal.
- Floating point is `f32` throughout, compared with a `1e-4` tolerance helper (`1e-2` for the accumulated matmul test).
