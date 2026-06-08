# Rust Hardware Playground

This project contains a collection of educational hardware simulation models written in Rust. It explores concepts like processing elements, pipelined adders, 1D dot products, and 2D systolic arrays.

Recently, the codebase was reorganized into a **Monorepo structure**. The core hardware logic is now cleanly separated into a reusable Rust library, making it easy to share code between CLI tools and future WebAssembly (WASM) frontends.

## File Structure

The project is structured as a library crate with associated CLI binaries. It is also configured with `wasm-bindgen` to eventually support a React/Next.js visualizer frontend.

```text
rust-hw-playground/
├── Cargo.toml                  # Configured as a workspace with WASM support
└── src/
    ├── lib.rs                  # Entry point for WASM bindings & library exports
    ├── processing_element.rs   # Core PE hardware model
    ├── dot_product.rs          # 1D Pipelined Dot Product model & logic
    ├── systolic_array.rs       # 2D Systolic Array Matrix Multiplication model
    ├── pipeline_add.rs         # Basic pipelined adder hardware model
    └── bin/
        ├── cli_dot_product.rs    # Interactive CLI simulator for the Dot Product
        └── cli_systolic_array.rs # CLI entry point for the Systolic Array
```

## How to Run the Simulators

The interactive simulators have been moved to the `src/bin/` directory and use the core library.

**Run the 1D Pipelined Dot Product Simulator:**
```bash
cargo run --bin cli_dot_product
```

**Run the Systolic Array CLI:**
```bash
cargo run --bin cli_systolic_array
```

## How to Run Tests

All the core hardware logic is heavily tested to ensure cycle-accurate behavior. You can run all the embedded tests across the library:

```bash
cargo test
```

To see the output of specific educational simulations (like the pipelined adder), you can run tests with standard output enabled:

```bash
cargo test test_pipeline_add_educational -- --nocapture
```

## Future Plans (WebAssembly)

This crate is configured as a `cdylib` and imports `wasm-bindgen`. The core simulator states (e.g., `DotProductSim`) are exported in `src/lib.rs`.

In the future, a Next.js frontend can be placed alongside this Rust code. By compiling this project with `wasm-pack build --target web`, the frontend will be able to instantiate the hardware models and render their cycle-by-cycle states in the browser.
