// --- 1. Your Hardware Model ---
pub struct ProcessingElement {
    // Internal configuration register (Loaded a priori)
    weight: f32,

    // Pipeline registers holding outputs for the next clock cycle
    reg_x_out: f32, // Passes the activation to the right PE
    reg_y_out: f32, // Passes the accumulated sum to the bottom PE
}

impl ProcessingElement {
    /// Constructor: Instantiates the PE with cleared registers
    pub fn new() -> Self {
        Self {
            weight: 0.0,
            reg_x_out: 0.0,
            reg_y_out: 0.0,
        }
    }

    /// Configuration Phase: Load the fixed weight a priori
    pub fn load_weight(&mut self, w: f32) {
        self.weight = w;
    }

    /// Clock Tick: Computes combinational logic and updates registers
    pub fn tick(&mut self, x_in: f32, y_in: f32) {
        // 1. COMBINATIONAL LOGIC
        // Compute the Multiply-Accumulate operation using standard float math
        let mac_result = (x_in * self.weight) + y_in;
        let next_x = x_in;

        // 2. REGISTER UPDATE (Clock Edge)
        self.reg_x_out = next_x;
        self.reg_y_out = mac_result;
    }

    /// Output Ports: Read the current values sitting on the output flip-flops
    pub fn read_outputs(&self) -> (f32, f32) {
        (self.reg_x_out, self.reg_y_out)
    }
}

// --- 2. Your Normal Run Execution ---
fn main() {
    println!("Running the main hardware simulation... Use 'cargo test' to run the testbench!");
}

// --- 3. Your Testbench ---
#[cfg(test)]
mod tests {
    use super::*;

    // Helper function for floating-point assertions.
    // Because of tiny rounding errors in float math, we check if they are "close enough".
    fn assert_approx_eq(actual: f32, expected: f32, msg: &str) {
        let tolerance = 1e-4;
        assert!(
            (actual - expected).abs() < tolerance,
            "{}: expected approx {}, got {}",
            msg, expected, actual
        );
    }

    // A tiny, self-contained Pseudo-Random Number Generator (Xorshift32 algorithm)
    // This saves you from having to modify your Cargo.toml file for this example.
    struct SimpleRng {
        state: u32,
    }
    impl SimpleRng {
        fn new(seed: u32) -> Self {
            Self { state: seed }
        }
        // Generates a pseudo-random f32 between -50.0 and 50.0
        fn next_f32(&mut self) -> f32 {
            self.state ^= self.state << 13;
            self.state ^= self.state >> 17;
            self.state ^= self.state << 5;
            ((self.state as i32 % 5000) as f32) / 100.0
        }
    }

    #[test]
    fn test_weight_stationary_pe_fixed() {
        let mut pe = ProcessingElement::new();
        pe.load_weight(3.0);

        // --- Cycle 1 ---
        pe.tick(2.0, 0.0);
        let (x_out, y_out) = pe.read_outputs();
        assert_approx_eq(x_out, 2.0, "Fixed Cycle 1 X");
        assert_approx_eq(y_out, 6.0, "Fixed Cycle 1 Y");

        // --- Cycle 2 ---
        pe.tick(4.0, 10.0);
        let (x_out, y_out) = pe.read_outputs();
        assert_approx_eq(x_out, 4.0, "Fixed Cycle 2 X");
        assert_approx_eq(y_out, 22.0, "Fixed Cycle 2 Y");
    }

    #[test]
    fn test_weight_stationary_pe_random() {
        let mut rng = SimpleRng::new(42); // Seeded for deterministic randomness
        let n = 1000; // Number of random test iterations

        for i in 0..n {
            let mut pe = ProcessingElement::new();

            // Randomly initialize the weight for this iteration
            let random_weight = rng.next_f32();
            pe.load_weight(random_weight);

            // Run 3 distinct cycles per iteration
            for cycle in 1..=3 {
                let x_in = rng.next_f32();
                let y_in = rng.next_f32();

                // Calculate the expected hardware behavior on the spot
                let expected_x = x_in;
                let expected_y = (x_in * random_weight) + y_in;

                // Clock the hardware
                pe.tick(x_in, y_in);
                let (x_out, y_out) = pe.read_outputs();

                // Check correctness
                assert_approx_eq(x_out, expected_x, &format!("Iter {} Cycle {} X mismatch", i, cycle));
                assert_approx_eq(y_out, expected_y, &format!("Iter {} Cycle {} Y mismatch", i, cycle));
            }
        }
    }
}