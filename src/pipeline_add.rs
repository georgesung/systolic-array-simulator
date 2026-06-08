#![allow(dead_code)]

pub struct PipelinedAdder {
    // Input Stage Registers (A and B)
    pub reg_a: u32,
    pub reg_b: u32,

    // Output Stage Register (The sum)
    // You mentioned "2 flip flops", so we'll treat this as a
    // registered output.
    pub reg_sum: u32,
}

impl PipelinedAdder {
    // Constructor: Initialize registers to zero
    pub fn new() -> Self {
        Self {
            reg_a: 0,
            reg_b: 0,
            reg_sum: 0,
        }
    }

    /// Simulates one clock cycle
    pub fn tick(&mut self, input_a: u32, input_b: u32) {
        // 1. COMBINATIONAL LOGIC:
        // Calculate the sum of the CURRENT values in A and B.
        // In hardware, this happens "instantly" between registers.
        let next_sum = self.reg_a.wrapping_add(self.reg_b);

        // 2. REGISTER UPDATE:
        // On the clock edge, we move values into the flip-flops.
        // The sum moves to the output stage.
        self.reg_sum = next_sum;

        // The new inputs move into the input stage.
        self.reg_a = input_a;
        self.reg_b = input_b;
    }

    pub fn get_output(&self) -> u32 {
        self.reg_sum
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipeline_add_educational() {
        let mut adder = PipelinedAdder::new();

        println!("\n--- Pipelined Adder Educational Simulation ---");
        
        // Cycle 1: Feed in 10 and 20
        adder.tick(10, 20);
        println!("Cycle 1 Output: {}", adder.get_output()); 
        assert_eq!(adder.get_output(), 0);

        // Cycle 2: Feed in 5 and 5
        adder.tick(5, 5);
        println!("Cycle 2 Output: {}", adder.get_output()); 
        assert_eq!(adder.get_output(), 30); // (10 + 20) from Cycle 1

        // Cycle 3: Feed in 0 and 0
        adder.tick(0, 0);
        println!("Cycle 3 Output: {}", adder.get_output()); 
        assert_eq!(adder.get_output(), 10); // (5 + 5) from Cycle 2
        println!("-----------------------------------------------\n");
    }
}
