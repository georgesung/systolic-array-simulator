# Systolic Array Matrix Multiplication Simulator

An interactive, educational playground designed to demystify how **systolic arrays** and **pipelined processing elements** perform high-throughput matrix multiplication.

The project is split into two core layers:
1. **The Rust Core (Hardware Model):** A cycle-accurate, deterministic software simulation of physical hardware-level behaviors (register latching, clock-edge synchronization, and Multiply-Accumulate logic).
2. **The Next.js Frontend (End-User App):** A high-fidelity, interactive web application that compiles the Rust hardware simulator to WebAssembly (WASM), allowing users to stream data, step through clock cycles, inspect registers in real-time, and play with different systolic array dimensions.

---

## 📂 Directory Structure

Below is an overview of the key directories and files comprising the repository, showing how the frontend, the Rust simulation core, the CLI interfaces, and the documentation are organized:

```text
pipeline_add/
├── Cargo.toml                  # Rust package configuration (CDYLib/RLib) and dependencies
├── README.md                   # This comprehensive simulator guide and architecture overview
├── src/                        # 🦀 Core Rust Hardware Simulation Engine
│   ├── lib.rs                  # Module entrypoint exposing modules to library/WASM
│   ├── processing_element.rs   # Weight-stationary processing element (MAC unit)
│   ├── dot_product.rs          # 1D Pipelined array of PEs
│   ├── systolic_array.rs       # 2D Systolic Array model
│   ├── pipeline_add.rs         # Educational 2-stage pipelined integer adder
│   ├── wasm_bindings.rs        # WebAssembly wrappers (DotProductSim, SystolicArray2DSim)
│   └── bin/                    # Rust native CLI simulators for debugging
│       ├── cli_dot_product.rs
│       └── cli_systolic_array.rs
├── web/                        # 💻 Next.js Frontend Application
│   ├── package.json            # Node.js dependencies, scripts, and build metadata
│   └── src/
│       ├── app/                # Main React Page Router (layout.tsx, page.tsx)
│       ├── components/         # Interactive simulation UI views
│       │   ├── Instructions.tsx            # Tab 1: Static and interactive educational instructions
│       │   ├── PESimulator.tsx             # Tab 2: Single PE MAC view
│       │   ├── Simulator.tsx               # Tab 3: 1D Dot Product simulator
│       │   ├── MatrixMultiplySimulator.tsx # Tab 4: 2D Matrix Multiply simulator
│       │   └── PipelineVisualizer.tsx      # SVG-based dynamic hardware datapath visualizer
│       └── hooks/              # Custom React Hooks interfacing with Rust WebAssembly
│           ├── usePipeline.ts              # Connects Tab 3 to DotProductSim
│           └── useMatrixMultiply.ts        # Connects Tab 4 to SystolicArray2DSim
└── docs/                       # 📚 Static Documentation & Educational Theory Pages
    ├── architecture/           # Frontend and core engine design documents
    └── theory/                 # Mathematical and physical theory explanations
```

---

## 💻 1. Interactive Frontend (Next.js / React)

The user touchpoint is a modern, responsive web application located in `./web/`. It uses React, TypeScript, and Tailwind CSS to turn hardware concepts into intuitive, interactive visual schematics.

Users can step through simulations cycle-by-cycle or auto-play them at customizable clock rates.

### Progressive Learning Journey (The Tabs)

#### 🔬 Tab 1: Instructions & Overview
* **Concept:** Provides an educational overview and visual guide on how to interact with the simulators.
* **Content:** Renders standard Markdown text and math expressions explaining systolic concepts (e.g., how registers latch values, data streaming, clock boundaries).
* **Educational Takeaway:** Serves as a foundational landing page, ensuring students understand the underlying hardware definitions and color-coding schemes before running the simulators.

#### 📦 Tab 2: Processing Element (PE) Simulator
* **Concept:** Models the atomic Multiply-Accumulate (MAC) cell of a systolic array.
* **Inputs:** Allows entering an internal stationary `weight` register and comma-separated lists of stream values for $X$ (Activations) and $Y$ (Accumulating partial sums).
* **Visual Representation:** Renders the PE as a central box highlighting its internal stationary register, input arrows, and physical boundary registers that latch and delay outputs.
* **Educational Takeaway:** Demonstrates why a value entering on cycle $N$ only affects downstream cells on cycle $N+1$ due to synchronous latching/delay.

#### 📊 Tab 3: 1D Dot Product Simulator
* **Concept:** Connects PEs into a single vertical column to calculate a vector dot product ($\vec{x} \cdot \vec{w}$).
* **Inputs:** Customizable vector size $N$, batch size $M$, weight vectors, and input matrices.
* **Visual Representation:** Renders a vertical line of linked PEs, showing data elements actively shifting and computing step-by-step.
* **Educational Takeaway:** Illustrates **pipeline latency**—the first dot-product result takes $N$ cycles to emerge from the bottom, but subsequent results cascade out sequentially every clock cycle thereafter.

#### 🧱 Tab 4: 2D Matrix Multiply Simulator
* **Concept:** Computes Weight-Stationary Matrix Multiplication ($C = A \times B$) using a 2D grid of PEs.
* **Inputs:** Square size selector ($N \times N$, adjustable from $2 \times 2$ up to $8 \times 8$) and multi-matrix sequential batching (simultaneously feed $A_1, A_2, A_3$ through the array).
* **Visual Representation:** Highlights the **skewed input wavefront** (where rows of Matrix A are delayed diagonally by $0, 1, 2, \dots$ cycles) so they intersect the correct stationary weight at the exact cycle their accumulating $Y$ sum arrives from the PE above.
* **Educational Takeaway:** Clarifies spatial and temporal concurrency. Students see multiple independent multiplications and accumulations happening in parallel across different physical components in real-time.

---

## 🦀 2. Hardware Simulation Core (Rust)

To guarantee true hardware fidelity, the underlying computation engine is written in **Rust** (`src/`) and acts as a cycle-accurate hardware model.

### Strict Cycle-Accurate Components
* **`ProcessingElement` (`src/processing_element.rs`):** A physical struct containing actual storage registers:
  * `weight`: Loaded beforehand (weight-stationary configuration register).
  * `reg_x_out`: Register holding activation $x$ passed to the right neighbor on the next tick.
  * `reg_y_out`: Register holding the accumulated $y$ value passed to the bottom neighbor on the next tick.
* **`DotProduct1D` (`src/dot_product.rs`):** A 1D array of `ProcessingElement`s.
* **`SystolicArray2D` (`src/systolic_array.rs`):** A 2D grid of `ProcessingElement`s.
* **`PipelinedAdder` (`src/pipeline_add.rs`):** An auxiliary educational module representing a 2-stage pipelined integer adder.

### Simulating Simultaneous Clock Edges in Sequential Code
In actual hardware, all registers update simultaneously on a single clock edge. In sequential software, a naive loop would overwrite a register prematurely, causing a cascade of bad values within a single tick. 

To prevent this, the Rust simulation core **iterates backward** (from bottom-right to top-left) through the array. This allows reading neighbors' register values from the *previous* clock cycle before they are updated by the current tick:

```rust
// Iterating backwards simulates concurrent clock edge propagation
for r in (0..rows).rev() {
    for c in (0..cols).rev() {
        // Read input X from left PE's previous cycle register
        let x_in = if c == 0 { left_ins[r] } else { pes[r * cols + (c - 1)].reg_x_out() };

        // Read input Y from top PE's previous cycle register
        let y_in = if r == 0 { top_ins[c]  } else { pes[(r - 1) * cols + c].reg_y_out() };

        // Compute combinatorial logic & latch outputs in registers
        let idx = r * cols + c;
        pes[idx].tick(x_in, y_in);
    }
}
```

---

## 🔌 3. The WebAssembly Bridge (How They Connect)

The boundary between the user's browser (React) and the cycle-accurate compiled core (Rust) is crossed cleanly using **WebAssembly** and **`wasm-bindgen`** bindings.

```text
       [ Next.js UI ] <--- Real-time Redraw of State --- [ React State ]
             |                                                 ^
             | (User ticks or Auto-Plays)                      | (get_state)
             v                                                 |
[ Custom React Hooks (usePipeline / useMatrixMultiply) ] ------+
             |
             v (WebAssembly Interface)
   [ Rust WASM Simulators (DotProductSim / SystolicArray2DSim) ]
```

1. **WASM Binding Compilation (`src/wasm_bindings.rs`):** Exposes stateful Rust objects `DotProductSim` and `SystolicArray2DSim` directly to JavaScript.
2. **State Management via Hooks (`web/src/hooks/`):** React hooks (`usePipeline.ts` and `useMatrixMultiply.ts`) instantiate the simulators and maintain UI synchronicity.
3. **The Cycle Loop:** 
   * When a user steps forward or toggles Auto-Play, the hook invokes the simulator's `.tick()` method.
   * The simulator executes one hardware-level cycle.
   * The hook immediately pulls a flat representation of all internal PE registers via `.get_state()`.
   * This updates the React state, prompting Tailwind/HTML elements to render updated numbers, flow arrows, and color highlights instantly on screen.

---

## 🚀 Quick Start: Running CLI Simulators

If you prefer to run simulations directly from the terminal, the Rust core includes interactive command-line interface simulators:

### 1. Run the 1D Pipelined Dot Product Simulator:
```bash
cargo run --bin cli_dot_product
```

### 2. Run the 2D Systolic Array Simulator:
```bash
cargo run --bin cli_systolic_array
```

---

## 🛠️ Developer Setup: Compiling and Running the Web App

Follow these steps to build the WebAssembly module and run the Next.js visual dashboard locally:

### 📦 Prerequisites
1. Install [Rust and Cargo](https://rustup.rs/).
2. Install `wasm-pack` for compiling Rust to WebAssembly:
   ```bash
   cargo install wasm-pack
   ```
3. Install [Node.js](https://nodejs.org/) (v18+ recommended).

---

### 1️⃣ Compile the Rust Core to WebAssembly (WASM)

In the root directory of the project, run:
```bash
wasm-pack build --target web
```
This compiles the Rust crate and outputs a web-ready package inside the `./pkg/` directory, complete with generated JavaScript/TypeScript bindings.

---

### 2️⃣ Run the Next.js Frontend

Navigate to the `web/` directory, install dependencies, and start the development server:
```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the simulator dashboard.

#### Building for Production
To generate a static build of the website and serve it:
```bash
npm run build
npm run serve
```

---

## 🧪 Testing & Verification

The Rust hardware logic is tested to ensure correct behavior and compliance with theoretical models:

```bash
# Run all unit and integration tests
cargo test

# Run a specific educational pipeline-add test with verbose output
cargo test test_pipeline_add_educational -- --nocapture
```
