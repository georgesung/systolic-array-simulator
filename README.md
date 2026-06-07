# Hardware Playground (Pipeline Add)

This project contains a collection of educational, standalone Rust scripts demonstrating hardware concepts like processing elements, pipelined adders, dot products, and systolic arrays.

## File Structure

The project uses Cargo's built-in support for standalone executable scripts by placing them in the `src/bin/` directory. Each file is a completely independent "universe" with its own `main` function and internal structures. This makes it easy to read, learn, and experiment with individual concepts without cross-file dependencies.

```text
src/
└── bin/
    ├── dot_product.rs        # 1D Pipelined Dot Product implementation
    ├── pipeline_add.rs       # Basic pipelined adder hardware model
    ├── processing_element.rs # Core Processing Element (PE) for systolic arrays
    └── systolic_array.rs     # 2D Systolic Array Matrix Multiplication model
```

## How to Run

Since every file in `src/bin/` is treated as a separate binary by Cargo, you need to specify which one you want to run using the `--bin` flag.

### Running Individual Scripts

Use the `cargo run --bin <name>` command to execute a specific script:

```bash
cargo run --bin dot_product
cargo run --bin pipeline_add
cargo run --bin processing_element
cargo run --bin systolic_array
```

### Running Tests

The scripts contain embedded test modules (`#[cfg(test)]`) that verify the hardware behavior. You can run all tests across all scripts at once, or test a specific script.

**Run all tests in all scripts:**
```bash
cargo test
```

**Run tests for a specific script:**
```bash
cargo test --bin systolic_array
```
