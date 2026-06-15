# Pipelined Dot Product: WASM & Next.js Visualization Plan

## Problem Statement / Motivation
The current project includes a Rust implementation of a 1D Pipelined Dot Product (like one column of a systolic array) and an interactive CLI simulator (`cli_dot_product.rs`). While the CLI is great for text-based verification, understanding the staggered data flow, cycle-by-cycle execution, and state changes of a systolic array is inherently visual.

The goal is to build a modern, static web application using Next.js that compiles the core Rust pipeline logic into WebAssembly (WASM). This application will provide an interactive, visual representation of the hardware simulation, making it easier to demonstrate and understand how data propagates through the Processing Elements (PEs) over time.

## Architecture Overview
The system is divided into two main layers:
1.  **Rust / WASM Core:** The existing `dot_product.rs` will be exposed via `wasm-bindgen`. This layer acts as the stateful simulation backend, running efficiently in the browser.
2.  **Next.js Frontend (React):** A static NextJS application styled with Tailwind CSS and Shadcn UI. It will handle user configuration, manage the "Clock Cycle" state, feed staggered inputs to the WASM module, and visualize the resulting state of the PE array.

## Project Structure & Organization

To maintain a clean separation between the Rust hardware logic and the Next.js frontend, the following structure is recommended (but use your judgement if you disagree):

```text
rust-hw-playground/
├── Cargo.toml                 # Existing Rust config (add cdylib target)
├── src/                       # Existing Rust core & CLIs
│   ├── lib.rs                 # Exposes your modules
│   ├── dot_product.rs
│   ├── processing_element.rs
│   ├── wasm_bindings.rs       # NEW: #[wasm_bindgen] wrappers live here
│   └── bin/
│       └── cli_dot_product.rs
│
├── pkg/                       # GENERATED: Output from `wasm-pack build`
│   ├── rust_hw_playground_bg.wasm   # The WebAssembly binary
│   ├── rust_hw_playground.js        # JavaScript glue code
│   └── rust_hw_playground.d.ts      # TypeScript definitions
│
└── web/                       # NEW: Next.js Application
    ├── package.json           # Node dependencies
    ├── next.config.mjs        # Next.js config (WASM/Webpack tweaks)
    ├── components/
    │   ├── ui/                # Shadcn components
    │   └── pipeline/          # Custom visualizers (PEBlock, DataQueue)
    ├── hooks/
    │   └── usePipeline.ts     # Hook for WASM init and cycle state management
    └── app/
        ├── page.tsx           # Main dashboard UI
        └── globals.css        # Tailwind entrypoint
```

### Key Integration Points
*   **`wasm_bindings.rs`**: Acts as the adapter. Keep hardware logic pure; handle serialization/deserialization here.
*   **Local NPM Dependency**: Inside `web/package.json`, link the WASM package using `"pipeline-wasm": "file:../pkg"`.
*   **Async Initialization**: Use a custom React hook to manage the asynchronous loading of the WASM binary before the UI renders the simulation state.

---

## Execution Plan & Instructions

This project should be built incrementally to ensure each layer works before adding complexity.

### Phase 1: WASM Preparation & Unit Testing
Before touching Next.js, the Rust code must be compiled to WASM and thoroughly tested in a headless environment.

1.  **Cargo Configuration:** Modify `Cargo.toml` to add a `cdylib` target and include `wasm-bindgen`, `js-sys`, and `wasm-bindgen-test` (as a dev-dependency).
2.  **WASM Wrapper:** Create a wrapper struct in Rust exposed via `#[wasm_bindgen]` that encapsulates `DotProduct1D<Vec<ProcessingElement>>`.
    *   Implement methods to instantiate the pipeline (`new`), load weights (`load_weights`), and tick the clock (`tick_and_get_state`).
    *   The tick method must return a serialized representation (e.g., JSON or a flattened array) of all PE registers ($W$, $X_{out}$, $Y_{out}$) so JavaScript can easily consume it.
3.  **WASM Unit Tests:** Write tests using `#[wasm_bindgen_test]` to verify the wrapper logic.
    *   Run these tests using `wasm-pack test --headless --chrome` (or `--node`) to ensure the WASM module functions correctly in a JS environment.
4.  **Build:** Run `wasm-pack build --target web` to generate the `.wasm` binary and JavaScript bindings.

### Phase 2: Stage 1 - Next.js "Proof of Life" (Ugly but Working)
Prove that the WASM module can be loaded and executed within a Next.js App Router project.

1.  **Scaffold:** Run `npx create-next-app@latest frontend` (TypeScript, App Router, Tailwind).
2.  **Import WASM:** Copy the generated `pkg` folder from `wasm-pack` into the Next.js project and configure Webpack/Next.js to load the WASM module asynchronously.
3.  **Basic UI:** Create a simple page with hardcoded inputs ($n=3$, dummy weights).
4.  **Execute:** Add a "Tick" button that calls the WASM tick function and dumps the raw returned state into a `<pre>` tag. Verify the state changes correctly per cycle.

### Phase 3: Stage 2 - CLI Parity & State Management
Replicate the exact functionality of the Rust CLI in the browser.

1.  **User Inputs:** Add basic HTML inputs for vector length ($n$) and number of vectors ($m$). Allow users to input custom weights and data vectors.
2.  **Staggering Logic:** Port the CLI's logic for calculating which elements of which vectors enter the pipeline at a given cycle into JavaScript.
3.  **Data Binding:** Create a React Context or custom hook (`usePipeline`) to manage the current cycle, staggered inputs, and the history of pipeline states.
4.  **Basic Table:** Render the PE states (Weights, $X$, $Y$) in a standard HTML `<table>` that updates on every cycle tick. Validate the output matches the Rust CLI.

### Phase 4: Stage 3 - Shadcn UI & Polish
Elevate the prototype to a modern web application.

1.  **Shadcn Integration:** Initialize `shadcn-ui` and replace raw HTML elements with styled components (`Button`, `Input`, `Card`, `Table`).
2.  **Layout:** Use Tailwind grids to organize the application into distinct zones: Configuration/Setup, Simulation Controls (Step, Reset), and the Visualization Stage.
3.  **Validation:** Ensure the UI handles invalid inputs (e.g., negative vector lengths) gracefully.

### Phase 5: Stage 4 - Visualizing the Pipeline (The "Wow" Factor)
Create the intuitive visual representation of the systolic array (ok, just one column of a systolic array, doing the dot product).

1.  **Hardware Blocks:** Design the PE array as a vertical stack of styled hardware blocks, clearly showing inputs flowing from the top ($Y$) and side ($X$).
2.  **Input Queues:** Visually represent the incoming staggered queues waiting on the left side to enter the pipeline.
3.  **Tracking & Animation:**
    *   Add color-coding to distinct data vectors so users can track a specific vector's progress through the pipeline.
    *   Implement an "Auto-Play" feature using `setInterval` to allow users to watch the simulation run automatically.
4.  **Static Export:** Configure `next.config.js` for static HTML export (`output: 'export'`) to ensure the app can be easily hosted anywhere.

### Phase 6: Git Maintenance (.gitignore)
To prevent checking in build artifacts and keep the repository clean, update the `.gitignore` file with the following additions:

```ignore
# --- Rust/WASM Build Artifacts ---
/pkg/

# --- Node/Next.js ---
web/node_modules/
web/.next/
web/out/
```
*Note: The `/pkg/` directory contains compiled WebAssembly and JS glue code. It should be treated as a build artifact and generated locally or via CI/CD, not committed to version control.*
