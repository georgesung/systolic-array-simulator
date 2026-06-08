use rust_hw_playground::dot_product::DotProduct1D;
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
    println!("=== 1D Pipelined Dot Product Simulator ===");
    print!("Enter vector length (n): ");
    io::stdout().flush().unwrap();
    let n = read_usize();

    print!("Enter number of input vectors to process (m): ");
    io::stdout().flush().unwrap();
    let m = read_usize();

    print!("Enter RNG seed (e.g., 42): ");
    io::stdout().flush().unwrap();
    let seed = read_u32();
    let mut rng = SimpleRng::new(seed);

    print!("Auto-generate weights? (y/n): ");
    io::stdout().flush().unwrap();
    let auto_w = read_line().to_lowercase() == "y";

    let mut weights = Vec::with_capacity(n);
    if auto_w {
        for _ in 0..n {
            weights.push(rng.next_val());
        }
        println!("Generated weights: {:?}", weights);
    } else {
        for i in 0..n {
            print!("Enter weight[{}]: ", i);
            io::stdout().flush().unwrap();
            weights.push(read_f32());
        }
    }

    let mut vectors = Vec::with_capacity(m);
    for v in 0..m {
        println!("\n--- Vector {} ---", v);
        print!("Auto-generate input vector {}? (y/n): ", v);
        io::stdout().flush().unwrap();
        let auto_i = read_line().to_lowercase() == "y";

        let mut inputs = Vec::with_capacity(n);
        if auto_i {
            for _ in 0..n {
                inputs.push(rng.next_val());
            }
            println!("Generated inputs for vector {}: {:?}", v, inputs);
        } else {
            for i in 0..n {
                print!("Enter vector {} input[{}]: ", v, i);
                io::stdout().flush().unwrap();
                inputs.push(read_f32());
            }
        }
        vectors.push(inputs);
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
        let mut active_vectors = vec![None; n];

        for i in 0..n {
            let v_idx = cycle as isize - i as isize - 1;
            if v_idx >= 0 && (v_idx as usize) < m {
                let v = v_idx as usize;
                current_x_ins[i] = vectors[v][i];
                active_vectors[i] = Some(v);
            }
        }

        println!("--- Cycle {} ---", cycle);
        print!("Incoming X on the left: [");
        for i in 0..n {
            if i > 0 { print!(", "); }
            if let Some(v) = active_vectors[i] {
                print!("(V{}) --> {}", v, current_x_ins[i]);
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

        let finished_v = cycle as isize - n as isize - 1;
        if finished_v >= 0 && (finished_v as usize) < m {
            println!(">> Vector {} processing complete! Final result is: {}", finished_v, out);
        }

        if cycle == m + n + 1 {
            println!(">> All vectors processed and pipeline flushed. Exiting simulator.");
            break;
        }

        cycle += 1;
    }
}