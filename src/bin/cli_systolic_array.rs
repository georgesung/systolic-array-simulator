use rust_hw_playground::systolic_array::SystolicArray2D;
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

fn read_u32() -> u32 {
    loop {
        let s = read_line();
        if let Ok(val) = s.parse::<u32>() {
            return val;
        }
        print!("Invalid input. Please enter a non-negative integer: ");
        io::stdout().flush().unwrap();
    }
}

struct SimpleRng {
    state: u32,
}

impl SimpleRng {
    fn new(seed: u32) -> Self {
        Self { state: seed }
    }

    fn next_val(&mut self) -> f32 {
        // Simple Linear Congruential Generator
        self.state = self.state.wrapping_mul(1664525).wrapping_add(1013904223);
        // Return a pseudo-random value between -5.0 and 5.0
        ((self.state >> 16) % 11) as f32 - 5.0
    }
}

fn main() {
    println!("=== 2D Systolic Array Matrix Multiplication Simulator ===");
    println!("Computes C = A * B using a Weight-Stationary Architecture");
    print!("Enter matrix dimension (N for an NxN array): ");
    io::stdout().flush().unwrap();
    let n = read_usize();

    print!("Enter RNG seed (e.g., 42): ");
    io::stdout().flush().unwrap();
    let seed = read_u32();
    let mut rng = SimpleRng::new(seed);

    let mut a = vec![vec![0.0; n]; n];
    let mut b = vec![vec![0.0; n]; n];

    print!("Auto-generate matrices A and B? (y/n): ");
    io::stdout().flush().unwrap();
    let auto_gen = read_line().to_lowercase() == "y";

    if auto_gen {
        println!("Generating Matrix A...");
        for i in 0..n {
            for j in 0..n {
                a[i][j] = rng.next_val();
            }
            println!("  Row {}: {:?}", i, a[i]);
        }
        println!("Generating Matrix B...");
        for i in 0..n {
            for j in 0..n {
                b[i][j] = rng.next_val();
            }
            println!("  Row {}: {:?}", i, b[i]);
        }
    } else {
        println!("--- Matrix A ---");
        for i in 0..n {
            for j in 0..n {
                print!("Enter A[{}][{}]: ", i, j);
                io::stdout().flush().unwrap();
                a[i][j] = read_f32();
            }
        }
        println!("--- Matrix B ---");
        for i in 0..n {
            for j in 0..n {
                print!("Enter B[{}][{}]: ", i, j);
                io::stdout().flush().unwrap();
                b[i][j] = read_f32();
            }
        }
    }

    let mut sa = SystolicArray2D::new_dynamic(n, n);
    
    // Load Matrix B as stationary weights
    let mut weights = Vec::with_capacity(n * n);
    for i in 0..n {
        for j in 0..n {
            weights.push(b[i][j]);
        }
    }
    sa.load_weights(&weights);

    println!("\nSetup complete! Matrix B is loaded into the PEs as stationary weights.");
    println!("Press Enter to step through cycles (or type 'q' to quit).");

    let total_cycles = 3 * n - 2;
    let mut out_c = vec![vec![None; n]; n];
    let top_ins = vec![0.0; n]; // For standard MatMul, top inputs are 0

    for cycle in 0..total_cycles {
        let input = read_line();
        if input.to_lowercase() == "q" {
            break;
        }

        let mut left_ins = vec![0.0; n];
        let mut active_a_elements = vec![None; n];

        // Calculate skewed inputs for Matrix A
        for r in 0..n {
            let skew_col = cycle as isize - r as isize;
            if skew_col >= 0 && skew_col < n as isize {
                left_ins[r] = a[r][skew_col as usize];
                active_a_elements[r] = Some((r, skew_col as usize));
            }
        }

        println!("--- Cycle {} ---", cycle);
        print!("Incoming Left Inputs (Matrix A): [");
        for r in 0..n {
            if r > 0 { print!(", "); }
            if let Some((row, col)) = active_a_elements[r] {
                print!("A_{}_{}({})", row, col, left_ins[r]);
            } else {
                print!("{}", left_ins[r]);
            }
        }
        println!("]");

        let mut bottom_outs = vec![0.0; n];
        sa.tick(&left_ins, &top_ins, &mut bottom_outs);

        println!("PE Grid State:");
        let pes = sa.pes_slice();
        for r in 0..n {
            for c in 0..n {
                let pe = &pes[r * n + c];
                print!("  [PE_{}_{} W:{:>3} x:{:>4} y:{:>4}]", r, c, pe.weight(), pe.reg_x_out(), pe.reg_y_out());
            }
            println!(); // Next row
        }

        print!("Outputs emerging from bottom (Matrix C): [");
        for c in 0..n {
            if c > 0 { print!(", "); }
            
            // Calculate which element of C is emerging from the bottom
            let r_isize = cycle as isize - (n as isize - 1) - c as isize;
            if r_isize >= 0 && r_isize < n as isize {
                out_c[r_isize as usize][c] = Some(bottom_outs[c]);
                print!("C_{}_{}({})", r_isize, c, bottom_outs[c]);
            } else {
                print!("{}", bottom_outs[c]);
            }
        }
        println!("]\n");
    }

    println!(">> Simulation Complete! Final Matrix C:");
    for r in 0..n {
        print!("  [");
        for c in 0..n {
            if c > 0 { print!(", "); }
            if let Some(val) = out_c[r][c] {
                print!("{:>6}", val);
            } else {
                print!("  None");
            }
        }
        println!("]");
    }
}
