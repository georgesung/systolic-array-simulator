// --- 1. Your Hardware Model ---
pub struct ProcessingElement {
    // Internal configuration register (Loaded a priori)
    weight: f32,

    // Pipeline registers holding outputs for the next clock cycle
    reg_x_out: f32, // Passes the activation to the right PE
    reg_y_out: f32, // Passes the accumulated sum to the bottom PE
}

impl ProcessingElement {
    pub fn new() -> Self {
        Self {
            weight: 0.0,
            reg_x_out: 0.0,
            reg_y_out: 0.0,
        }
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

// --- 2. 1D Array of PEs (Vertical) ---
pub struct DotProduct1D {
    pe0: ProcessingElement,
    pe1: ProcessingElement,
    pe2: ProcessingElement,
}

impl DotProduct1D {
    pub fn new() -> Self {
        Self {
            pe0: ProcessingElement::new(),
            pe1: ProcessingElement::new(),
            pe2: ProcessingElement::new(),
        }
    }

    pub fn load_weights(&mut self, w0: f32, w1: f32, w2: f32) {
        self.pe0.load_weight(w0);
        self.pe1.load_weight(w1);
        self.pe2.load_weight(w2);
    }

    /// Simulates a single clock cycle for the entire 1D array.
    /// `x0`, `x1`, `x2` are the inputs arriving at this specific clock cycle.
    /// Returns the accumulated output from the bottom PE (from the PREVIOUS cycle).
    pub fn tick(&mut self, x0: f32, x1: f32, x2: f32) -> f32 {
        // Read current register states (acting as the values on the wires BEFORE the clock edge)
        let y0_in = 0.0; // Top of the array
        let y1_in = self.pe0.reg_y_out();
        let y2_in = self.pe1.reg_y_out();
        
        // The output of the array is the current state of the last register
        let out = self.pe2.reg_y_out();

        // Tick all PEs (Compute combinational logic and update registers for the next cycle)
        self.pe0.tick(x0, y0_in);
        self.pe1.tick(x1, y1_in);
        self.pe2.tick(x2, y2_in);

        out
    }
}

fn main() {
    println!("Run 'cargo test' to see the 1D Pipelined Dot Product in action!");
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
    fn test_dot_product_1d() {
        let mut dp = DotProduct1D::new();
        // Weights: w0 = 1.0, w1 = 2.0, w2 = 3.0
        dp.load_weights(1.0, 2.0, 3.0);

        // We want to compute the dot product of W = [1, 2, 3] with two vectors:
        // VA = [10.0, 20.0, 30.0]
        // VB = [4.0,  5.0,  6.0]
        // Expected A = 1*10 + 2*20 + 3*30 = 10 + 40 + 90 = 140
        // Expected B = 1*4  + 2*5  + 3*6  = 4  + 10 + 18 = 32

        // Because it's pipelined, we have to SKEW the inputs!
        // X inputs are fed in diagonally over time.
        
        // Cycle 1: Feed VA[0] to PE0
        let out1 = dp.tick(10.0, 0.0, 0.0);
        assert_approx_eq(out1, 0.0, "Cycle 1 Out");

        // Cycle 2: Feed VA[1] to PE1, and VB[0] to PE0
        let out2 = dp.tick(4.0, 20.0, 0.0);
        assert_approx_eq(out2, 0.0, "Cycle 2 Out");

        // Cycle 3: Feed VA[2] to PE2, VB[1] to PE1
        let out3 = dp.tick(0.0, 5.0, 30.0);
        assert_approx_eq(out3, 0.0, "Cycle 3 Out");

        // Cycle 4: VA is finished accumulating, VB[2] goes to PE2
        // The result of VA comes out of PE2's register now!
        let out4 = dp.tick(0.0, 0.0, 6.0);
        assert_approx_eq(out4, 140.0, "Cycle 4 Out (VA Result)");

        // Cycle 5: VB is finished accumulating
        // The result of VB comes out of PE2's register!
        let out5 = dp.tick(0.0, 0.0, 0.0);
        assert_approx_eq(out5, 32.0, "Cycle 5 Out (VB Result)");
    }
}