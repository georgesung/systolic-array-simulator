# Rust / WASM Core Architecture

The backend of our simulator is written entirely in Rust and compiled to WebAssembly (WASM). This section explains the structure of the Rust codebase and how we expose it to the web.

## Why Rust?

Simulating hardware requires strict, deterministic state management. Rust's ownership model and type system make it incredibly easy to define a `ProcessingElement` struct that safely encapsulates its internal state (weights and registers) and guarantees that state transitions occur exactly when we call the `tick()` function.

Furthermore, Rust compiles seamlessly into a highly optimized WASM binary, allowing our hardware simulation to run in the browser at near-native speeds.

## Code Structure

The core logic lives in the `src/` directory:

### 1. `processing_element.rs`
This file defines the fundamental building block.
*   **State:** Holds the `weight`, `reg_x_out`, and `reg_y_out`.
*   **`tick(x_in, y_in)`:** The core clock cycle function. It calculates the MAC operation and latches the new values into the registers.

### 2. `dot_product.rs`
This file orchestrates an array of PEs.
*   **`DotProduct1D<S>`:** A struct that holds a sequence of PEs. It is generic over the storage type `S` (allowing both fixed arrays for native Rust and dynamic `Vec`s for WASM flexibility).
*   **`tick(x_ins)`:** This is the crucial simulation function. In a real hardware pipeline, all PEs tick simultaneously on the clock edge. In our sequential software simulation, we achieve this by iterating through the PEs and capturing the outputs *before* ticking the next PE.

### 3. `wasm_bindings.rs`
This is the "bridge" between our pure Rust logic and the JavaScript frontend.
*   We use the `#[wasm_bindgen]` macro to generate JS wrapper code.
*   We define a `DotProductSim` struct that wraps our dynamic `DotProduct1D`.
*   **`tick_and_get_state()`:** This is the most important method for the UI. Instead of returning complex Rust objects across the WASM boundary (which is slow), this method iterates through the PEs and returns a "flattened" 1D array of floats: `[Weight0, X0, Y0, Weight1, X1, Y1, ...]`. This flat array is extremely fast to send to JS and easy for React to parse.

## Building the WASM

We use `wasm-pack` to build the Rust code into a web-ready package.

```bash
wasm-pack build --target web
```

This generates a `pkg/` directory containing the compiled `.wasm` binary and the JavaScript glue code needed to load and instantiate it in the browser.
