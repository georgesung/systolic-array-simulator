# Rust Hardware Playground

A collection of educational hardware simulation models exploring pipelined computation, processing elements, and systolic arrays.

📖 **Read the full theory and architectural documentation here:**  
[https://georgesung.github.io/rust-hw-sandbox-2026/](https://georgesung.github.io/rust-hw-sandbox-2026/)

---

## 🚀 Quick Start (CLI)

This project contains interactive CLI simulators that run directly in your terminal.

**Run the 1D Pipelined Dot Product Simulator:**
```bash
cargo run --bin cli_dot_product
```

**Run the 2D Systolic Array Simulator:**
```bash
cargo run --bin cli_systolic_array
```

## 🛠️ Project Structure

The core hardware logic is written in **Rust** and designed to be cycle-accurate.

- **`src/`**: The core library containing the PE, Dot Product, and Systolic Array models.
- **`src/wasm_bindings.rs`**: The bridge that allows the Rust core to run in the browser via WebAssembly.
- **`docs/`**: The source for our MkDocs documentation site.
- **`web/`**: A modern Next.js visualization dashboard that runs the WASM compiled Rust core.

## 🧪 Testing & Verification

Every component is heavily tested to ensure correct hardware behavior:

```bash
# Run all tests
cargo test

# Run a specific educational test with verbose output
cargo test test_pipeline_add_educational -- --nocapture
```

## 🌐 Web Visualization Dashboard

This project includes a **Web-Native Hardware Simulator**. By compiling the Rust core with `wasm-pack`, we enable a rich, interactive frontend built with Next.js and Shadcn UI that visualizes data propagating through the processing elements in real-time.

**Run the Next.js Web App locally:**
```bash
cd web
npm install
npm run dev -- --webpack
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

---
*Built with ❤️ for hardware enthusiasts and students.*
