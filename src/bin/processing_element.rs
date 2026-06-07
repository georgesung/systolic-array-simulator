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
    pub fn tick(&mut self, x_in: f32, y_in: f32) -> (f32, f32) {
        // 1. COMBINATIONAL LOGIC
        // Compute the Multiply-Accumulate operation using standard float math
        let mac_result = (x_in * self.weight) + y_in;
        let next_x = x_in;

        // 2. REGISTER UPDATE (Clock Edge)
        self.reg_x_out = next_x;
        self.reg_y_out = mac_result;

        (self.reg_x_out, self.reg_y_out)
    }

    // --- READ-ONLY GETTERS (Inspectors) ---
    // In Rust, it is idiomatic to name getters the exact same name as the field
    // (i.e., use `pe.weight()` instead of `pe.get_weight()`).

    pub fn weight(&self) -> f32 {
        self.weight
    }

    pub fn reg_x_out(&self) -> f32 {
        self.reg_x_out
    }

    pub fn reg_y_out(&self) -> f32 {
        self.reg_y_out
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

    fn assert_approx_eq(actual: f32, expected: f32, msg: &str) {
        let tolerance = 1e-4;
        assert!(
            (actual - expected).abs() < tolerance,
            "{}: expected approx {}, got {}",
            msg, expected, actual
        );
    }

    struct SimpleRng {
        state: u32,
    }
    impl SimpleRng {
        fn new(seed: u32) -> Self { Self { state: seed } }
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
        // We capture the output directly from the tick function now!
        let (x_out, y_out) = pe.tick(2.0, 0.0);
        assert_approx_eq(x_out, 2.0, "Fixed Cycle 1 X");
        assert_approx_eq(y_out, 6.0, "Fixed Cycle 1 Y");

        // --- Cycle 2 ---
        let (x_out, y_out) = pe.tick(4.0, 10.0);
        assert_approx_eq(x_out, 4.0, "Fixed Cycle 2 X");
        assert_approx_eq(y_out, 22.0, "Fixed Cycle 2 Y");

        // Testing our new getters out:
        assert_approx_eq(pe.weight(), 3.0, "Getter weight mismatch");
        assert_approx_eq(pe.reg_x_out(), 4.0, "Getter X mismatch");
        assert_approx_eq(pe.reg_y_out(), 22.0, "Getter Y mismatch");
    }

    #[test]
    fn test_weight_stationary_pe_random() {
        let mut rng = SimpleRng::new(42);
        let n = 1000;

        for i in 0..n {
            let mut pe = ProcessingElement::new();
            let random_weight = rng.next_f32();
            pe.load_weight(random_weight);

            for cycle in 1..=3 {
                let x_in = rng.next_f32();
                let y_in = rng.next_f32();

                let expected_x = x_in;
                let expected_y = (x_in * random_weight) + y_in;

                // Capture outputs inline from tick()
                let (x_out, y_out) = pe.tick(x_in, y_in);

                assert_approx_eq(x_out, expected_x, &format!("Iter {} Cycle {} X", i, cycle));
                assert_approx_eq(y_out, expected_y, &format!("Iter {} Cycle {} Y", i, cycle));

                // Double check using the standalone getters to ensure they match
                assert_approx_eq(pe.reg_x_out(), expected_x, &format!("Iter {} Cycle {} Getter X", i, cycle));
                assert_approx_eq(pe.reg_y_out(), expected_y, &format!("Iter {} Cycle {} Getter Y", i, cycle));
            }
        }
    }
}