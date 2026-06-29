# Systolic Array Matrix Multiplication Simulator

An interactive, educational playground designed to demystify how **systolic arrays** and **pipelined processing elements** perform high-throughput matrix multiplication.

The project is split into two core layers:
1. **The Rust Core (Hardware Model):** A cycle-accurate, deterministic software simulation of physical hardware-level behaviors (register latching, clock-edge synchronization, and Multiply-Accumulate logic).
2. **The Next.js Frontend (End-User App):** A high-fidelity, interactive web application that compiles the Rust hardware simulator to WebAssembly (WASM), allowing users to stream data, step through clock cycles, inspect registers in real-time, and play with different systolic array dimensions.

---

## 🎨 The Interactive Web App (End-User Dashboard)

The **Next.js frontend** provides a highly visual, web-native environment for exploring computer architecture concepts. Users can step through simulations cycle-by-cycle or auto-play them at customizable clock rates.

There are **four interactive dashboard modules**:

1. **🔬 Processing Element (PE) Simulator:** Dive deep into the fundamental unit of systolic arrays—the Multiply-Accumulate (MAC) unit. Feed inputs ($X$, $Y$) and watch how they latch into output registers ($X_{out}$, $Y_{out}$) and update local weight registers on each clock tick.
2. **📊 1D Pipelined Dot Product:** Chain PEs vertically into a 1D column. Stream vector elements through the pipeline and observe the physical requirement of **input staggering**—delaying subsequent inputs by one cycle so that partial sums and values align correctly at each node.
3. **🧱 2D Systolic Array Matrix Multiply:** Scale up to a 2D grid of PEs executing **Weight-Stationary Matrix Multiplication**. Stationary weights are pre-loaded, inputs flow from the left, and accumulated partial sums flow downward, demonstrating how a 2D array computes high-throughput matrix operations.
4. **⚙️ Hardware Sandbox:** Configure custom array dimensions, adjust clock speeds, randomise values, and inspect raw hardware registers to run custom experiments.

---

## ⚙️ The Rust Core (Cycle-Accurate Hardware Model)

To guarantee true hardware fidelity, the underlying simulation is written in **Rust** and acts as a cycle-accurate hardware model:
- **Deterministic State:** Every Processing Element has physical state structures representing its hardware registers (`weight`, `reg_x_out`, `reg_y_out`).
- **Simultaneous Clock Ticks:** In actual hardware, all PEs latch and transition their states simultaneously on a clock edge. The Rust model simulates this concurrent behavior sequentially by computing state transitions from the bottom-right to top-left of the grid using the values latched during the *previous* cycle.
- **WebAssembly Compilation:** Rust is compiled directly to WASM using `wasm-pack`, enabling near-native hardware simulation execution speeds directly inside the user's browser.

The core code is organized as follows:
- **`src/processing_element.rs`**: Core logic for a single MAC processing element.
- **`src/dot_product.rs`**: Orchestrator for 1D pipelined arrays of PEs.
- **`src/systolic_array.rs`**: 2D systolic array grid model.
- **`src/wasm_bindings.rs`**: High-performance serialization bridge that packs complex hardware state into flat arrays to cross the WebAssembly boundary with zero overhead.

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
