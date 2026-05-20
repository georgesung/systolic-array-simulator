// --- 1. Your Hardware Model ---
pub struct ProcessingElement {
    // Internal configuration register (Loaded a priori)
    weight: i32,

    // Pipeline registers holding outputs for the next clock cycle
    reg_x_out: i32, // Passes the activation to the right PE
    reg_y_out: i32, // Passes the accumulated sum to the bottom PE
}

impl ProcessingElement {
    /// Constructor: Instantiates the PE with cleared registers
    pub fn new() -> Self {
        Self {
            weight: 0,
            reg_x_out: 0,
            reg_y_out: 0,
        }
    }

    /// Configuration Phase: Load the fixed weight a priori
    pub fn load_weight(&mut self, w: i32) {
        self.weight = w;
    }

    /// Clock Tick: Computes combinational logic and updates registers
    pub fn tick(&mut self, x_in: i32, y_in: i32) {
        // 1. COMBINATIONAL LOGIC
        // Compute the Multiply-Accumulate operation
        let mac_result = x_in.wrapping_mul(self.weight).wrapping_add(y_in);
        // Pass-through the activation input to the next PE
        let next_x = x_in;

        // 2. REGISTER UPDATE (Clock Edge)
        self.reg_x_out = next_x;
        self.reg_y_out = mac_result;
    }

    /// Output Ports: Read the current values sitting on the output flip-flops
    pub fn read_outputs(&self) -> (i32, i32) {
        (self.reg_x_out, self.reg_y_out)
    }
}

// --- 2. Your Normal Run Execution ---
fn main() {
    println!("Running the main hardware simulation...");
    // You can put a full system demo here
}

// --- 3. Your Testbench ---
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weight_stationary_pe() {
        // --- Setup Testbench ---
        let mut pe = ProcessingElement::new();
        
        // Load the fixed weight a priori (e.g., Weight = 3)
        pe.load_weight(3);

        // --- Cycle 1 ---
        // Inputs: X = 2, Y = 0
        // Expected Logic: Next X = 2, Next Y = (2 * 3) + 0 = 6
        pe.tick(2, 0);
        
        // Check outputs at the end of Cycle 1
        let (x_out, y_out) = pe.read_outputs();
        assert_eq!(x_out, 2, "Cycle 1: X output mismatch");
        assert_eq!(y_out, 6, "Cycle 1: Y output mismatch");

        // --- Cycle 2 ---
        // Inputs: X = 4, Y = 10 (streaming in a new activation and an upstream sum)
        // Expected Logic: Next X = 4, Next Y = (4 * 3) + 10 = 22
        pe.tick(4, 10);

        // Check outputs at the end of Cycle 2
        let (x_out, y_out) = pe.read_outputs();
        assert_eq!(x_out, 4, "Cycle 2: X output mismatch");
        assert_eq!(y_out, 22, "Cycle 2: Y output mismatch");
    }
}
