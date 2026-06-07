// --- 1. Your Hardware Model ---
#[derive(Debug, Clone, Copy, Default)]
pub struct ProcessingElement {
    // Internal configuration register (Loaded a priori)
    weight: f32,

    // Pipeline registers holding outputs for the next clock cycle
    reg_x_out: f32, // Passes the activation to the right PE
    reg_y_out: f32, // Passes the accumulated sum to the bottom PE
}

impl ProcessingElement {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn load_weight(&mut self, w: f32) {
        self.weight = w;
    }

    pub fn tick(&mut self, x_in: f32, y_in: f32) -> (f32, f32) {
        let mac_result = (x_in * self.weight) + y_in;
        let next_x = x_in;

        self.reg_x_out = next_x;
        self.reg_y_out = mac_result;

        (self.reg_x_out, self.reg_y_out)
    }

    pub fn weight(&self) -> f32 { self.weight }
    pub fn reg_x_out(&self) -> f32 { self.reg_x_out }
    pub fn reg_y_out(&self) -> f32 { self.reg_y_out }
}

// --- 2. 1D Array of PEs (Storage Agnostic) ---
// 'S' stands for Storage. It can be a fixed Array `[T; N]` or a dynamic `Vec<T>`.
pub struct DotProduct1D<S> {
    pes: S,
}

// Implement methods for ANY storage 'S' that can be viewed as a slice of PEs.
impl<S> DotProduct1D<S>
where
    S: AsMut<[ProcessingElement]>,
{
    pub fn load_weights(&mut self, weights: &[f32]) {
        let pes = self.pes.as_mut();
        // Assert that we provided the correct number of weights
        assert_eq!(pes.len(), weights.len(), "Weights length must match array length");

        for i in 0..pes.len() {
            pes[i].load_weight(weights[i]);
        }
    }

    /// Simulates a single clock cycle for the entire 1D array.
    /// Takes a slice of inputs for the current cycle.
    pub fn tick(&mut self, x_ins: &[f32]) -> f32 {
        let pes = self.pes.as_mut();
        // Assert that we provided the correct number of inputs
        assert_eq!(pes.len(), x_ins.len(), "Inputs length must match array length");

        // The input into the top of the PE array
        let mut prev_y_out = 0.0;

        // By simulating sequentially from top to bottom, but capturing the
        // y_out register state BEFORE we tick the PE, we simulate
        // simultaneous clock edges
        for i in 0..pes.len() {
            // Capture the state of PE[i] before it ticks
            let current_y_out = pes[i].reg_y_out();

            // Tick PE[i]. Its y_in is the y_out of the PE above it (prev_y_out)
            pes[i].tick(x_ins[i], prev_y_out);

            // The y_out of this PE becomes the y_in for the next PE
            prev_y_out = current_y_out;
        }

        // Return the final output that emerged from the bottom PE
        prev_y_out
    }
}

// --- Helper Constructors for common storage types ---
impl<const N: usize> DotProduct1D<[ProcessingElement; N]> {
    /// Creates a DotProduct1D backed by a fixed-size stack array (Fast, No-Alloc)
    pub fn new_static() -> Self {
        Self { pes: [ProcessingElement::new(); N] }
    }
}

impl DotProduct1D<Vec<ProcessingElement>> {
    /// Creates a DotProduct1D backed by a dynamically sized Vector (WASM/Runtime friendly)
    pub fn new_dynamic(size: usize) -> Self {
        Self { pes: vec![ProcessingElement::new(); size] }
    }
}


impl DotProduct1D<Vec<ProcessingElement>> {
    pub fn pes_slice(&self) -> &[ProcessingElement] {
        &self.pes
    }
}

use std::io::{self, Write};

fn read_line() -> String {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

fn read_f32() -> f32 {
    loop {
        let s = read_line();
        if let Ok(val) = s.parse::<f32>() {
            return val;
        }
        print!("Invalid input. Please enter a number: ");
        io::stdout().flush().unwrap();
    }
}

fn read_usize() -> usize {
    loop {
        let s = read_line();
        if let Ok(val) = s.parse::<usize>() {
            if val > 0 {
                return val;
            }
        }
        print!("Invalid input. Please enter a positive integer: ");
        io::stdout().flush().unwrap();
    }
}

fn main() {
    println!("=== 1D Pipelined Dot Product Simulator ===");
    print!("Enter vector length (n): ");
    io::stdout().flush().unwrap();
    let n = read_usize();

    print!("Auto-generate weights? (y/n): ");
    io::stdout().flush().unwrap();
    let auto_w = read_line().to_lowercase() == "y";

    let mut weights = Vec::with_capacity(n);
    if auto_w {
        for i in 0..n {
            weights.push((i + 1) as f32);
        }
        println!("Generated weights: {:?}", weights);
    } else {
        for i in 0..n {
            print!("Enter weight[{}]: ", i);
            io::stdout().flush().unwrap();
            weights.push(read_f32());
        }
    }

    print!("Auto-generate input vector? (y/n): ");
    io::stdout().flush().unwrap();
    let auto_i = read_line().to_lowercase() == "y";

    let mut inputs = Vec::with_capacity(n);
    if auto_i {
        for i in 0..n {
            inputs.push(((i % 5) + 1) as f32);
        }
        println!("Generated inputs: {:?}", inputs);
    } else {
        for i in 0..n {
            print!("Enter input[{}]: ", i);
            io::stdout().flush().unwrap();
            inputs.push(read_f32());
        }
    }

    let mut dp = DotProduct1D::new_dynamic(n);
    dp.load_weights(&weights);

    println!("\nSetup complete! Press Enter to step through cycles (or type 'q' to quit).");

    let mut cycle = 1;
    loop {
        let input = read_line();
        if input.to_lowercase() == "q" {
            break;
        }

        let mut current_x_ins = vec![0.0; n];
        
        if cycle <= n {
            current_x_ins[cycle - 1] = inputs[cycle - 1];
        }

        println!("--- Cycle {} ---", cycle);
        print!("Incoming X on the left: [");
        for i in 0..n {
            if i > 0 { print!(", "); }
            if i == cycle - 1 && cycle <= n {
                print!("--> {}", current_x_ins[i]);
            } else {
                print!("{}", current_x_ins[i]);
            }
        }
        println!("]");

        let out = dp.tick(&current_x_ins);

        for (i, pe) in dp.pes_slice().iter().enumerate() {
            println!("  PE[{}] | W: {:>4} | reg_x_out: {:>4} | reg_y_out: {:>4}",
                     i, pe.weight(), pe.reg_x_out(), pe.reg_y_out());
        }

        println!("Output emerging from bottom: {}\n", out);

        if cycle == n + 1 {
            println!(">> Vector processing complete! Final result is: {}", out);
        }

        cycle += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_approx_eq(actual: f32, expected: f32, msg: &str) {
        let tolerance = 1e-4;
        assert!(
            (actual - expected).abs() < tolerance,
            "{}: expected approx {}, got {}",
            msg, expected, actual
        );
    }

    #[test]
    fn test_dot_product_static_array() {
        // Create a fixed size pipeline using a static array (lives in the stack, not heap)
        // Weights = [1, 2, 3]
        // Vector A = [10, 20, 30]
        // Vector B = [4, 5, 6]
        let mut dp = DotProduct1D::<[ProcessingElement; 3]>::new_static();
        dp.load_weights(&[1.0, 2.0, 3.0]);

        let out1 = dp.tick(&[10.0, 0.0, 0.0]);
        assert_approx_eq(out1, 0.0, "Cycle 1 Out");

        let out2 = dp.tick(&[4.0, 20.0, 0.0]);
        assert_approx_eq(out2, 0.0, "Cycle 2 Out");

        let out3 = dp.tick(&[0.0, 5.0, 30.0]);
        assert_approx_eq(out3, 0.0, "Cycle 3 Out");

        let out4 = dp.tick(&[0.0, 0.0, 6.0]);
        assert_approx_eq(out4, 140.0, "Cycle 4 Out (Vector A Result)");

        let out5 = dp.tick(&[0.0, 0.0, 0.0]);
        assert_approx_eq(out5, 32.0, "Cycle 5 Out (Vector B Result)");
    }

    #[test]
    fn test_dot_product_dynamic_vector() {
        // Create a dynamically sized pipeline of length 5
        let n = 5;
        let mut dp = DotProduct1D::new_dynamic(n);

        // Weights: [1.0, 2.0, 3.0, 4.0, 5.0]
        let weights = [1.0, 2.0, 3.0, 4.0, 5.0];
        dp.load_weights(&weights);

        // Vector A: [10, 20, 30, 40, 50]
        // Expected A: 1*10 + 2*20 + 3*30 + 4*40 + 5*50 = 10 + 40 + 90 + 160 + 250 = 550

        // Vector B: [1, 1, 1, 1, 1]
        // Expected B: 1*1 + 2*1 + 3*1 + 4*1 + 5*1 = 1 + 2 + 3 + 4 + 5 = 15

        // Pipelined Execution (Skewed inputs)
        // Cycle 1: A[0]
        dp.tick(&[10.0, 0.0, 0.0, 0.0, 0.0]);
        // Cycle 2: A[1], B[0]
        dp.tick(&[1.0, 20.0, 0.0, 0.0, 0.0]);
        // Cycle 3: A[2], B[1]
        dp.tick(&[0.0, 1.0, 30.0, 0.0, 0.0]);
        // Cycle 4: A[3], B[2]
        dp.tick(&[0.0, 0.0, 1.0, 40.0, 0.0]);
        // Cycle 5: A[4], B[3]
        dp.tick(&[0.0, 0.0, 0.0, 1.0, 50.0]);

        // Cycle 6: A result emerges, B[4] enters last PE
        let out_a = dp.tick(&[0.0, 0.0, 0.0, 0.0, 1.0]);
        assert_approx_eq(out_a, 550.0, "Vector A Result");

        // Cycle 7: B result emerges
        let out_b = dp.tick(&[0.0, 0.0, 0.0, 0.0, 0.0]);
        assert_approx_eq(out_b, 15.0, "Vector B Result");
    }
}