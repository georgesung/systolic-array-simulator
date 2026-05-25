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

// --- 2. 1D Array of PEs (Parameterizable via Const Generics) ---
pub struct DotProduct1D<const N: usize> {
    pes: [ProcessingElement; N],
}

impl<const N: usize> DotProduct1D<N> {
    pub fn new() -> Self {
        Self {
            // Because ProcessingElement implements Copy, we can initialize the array easily
            pes: [ProcessingElement::new(); N],
        }
    }

    pub fn load_weights(&mut self, weights: [f32; N]) {
        for i in 0..N {
            self.pes[i].load_weight(weights[i]);
        }
    }

    /// Simulates a single clock cycle for the entire 1D array.
    /// Takes an array of N inputs for the current cycle.
    pub fn tick(&mut self, x_ins: [f32; N]) -> f32 {
        // Read current register states (before the clock edge)
        let mut y_ins = [0.0; N];
        for i in 1..N {
            // The input 'y' to PE[i] comes from the 'y_out' register of PE[i-1]
            y_ins[i] = self.pes[i - 1].reg_y_out();
        }

        // The output of the entire array is the current state of the last register
        let out = if N > 0 { self.pes[N - 1].reg_y_out() } else { 0.0 };

        // Tick all PEs simultaneously
        for i in 0..N {
            self.pes[i].tick(x_ins[i], y_ins[i]);
        }

        out
    }
}

fn main() {
    println!("Run 'cargo test' to see the Parameterized 1D Pipelined Dot Product in action!");
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
    fn test_dot_product_1d_len3() {
        // Now parameterized with <3>
        let mut dp = DotProduct1D::<3>::new();
        dp.load_weights([1.0, 2.0, 3.0]);

        // Cycle 1: Feed VA[0] to PE0
        let out1 = dp.tick([10.0, 0.0, 0.0]);
        assert_approx_eq(out1, 0.0, "Cycle 1 Out");

        // Cycle 2: Feed VA[1] to PE1, and VB[0] to PE0
        let out2 = dp.tick([4.0, 20.0, 0.0]);
        assert_approx_eq(out2, 0.0, "Cycle 2 Out");

        // Cycle 3: Feed VA[2] to PE2, VB[1] to PE1
        let out3 = dp.tick([0.0, 5.0, 30.0]);
        assert_approx_eq(out3, 0.0, "Cycle 3 Out");

        // Cycle 4: VA is finished accumulating, VB[2] goes to PE2
        // The result of VA comes out of PE2's register now!
        let out4 = dp.tick([0.0, 0.0, 6.0]);
        assert_approx_eq(out4, 140.0, "Cycle 4 Out (VA Result)");

        // Cycle 5: VB is finished accumulating
        let out5 = dp.tick([0.0, 0.0, 0.0]);
        assert_approx_eq(out5, 32.0, "Cycle 5 Out (VB Result)");
    }

    #[test]
    fn test_dot_product_1d_len5() {
        // Try a length 5 dot product
        let mut dp = DotProduct1D::<5>::new();
        dp.load_weights([1.0, 1.0, 1.0, 1.0, 1.0]);

        // Let's compute dot product with A = [1, 2, 3, 4, 5] -> expected sum 15
        
        // Feed the inputs diagonally, 1 per cycle
        let _ = dp.tick([1.0, 0.0, 0.0, 0.0, 0.0]); // Cycle 1
        let _ = dp.tick([0.0, 2.0, 0.0, 0.0, 0.0]); // Cycle 2
        let _ = dp.tick([0.0, 0.0, 3.0, 0.0, 0.0]); // Cycle 3
        let _ = dp.tick([0.0, 0.0, 0.0, 4.0, 0.0]); // Cycle 4
        let _ = dp.tick([0.0, 0.0, 0.0, 0.0, 5.0]); // Cycle 5 (accumulation finishes in last PE)
        
        // Cycle 6: result pops out
        let out = dp.tick([0.0, 0.0, 0.0, 0.0, 0.0]); 
        
        assert_approx_eq(out, 15.0, "Length 5 Dot Product Result");
    }
}