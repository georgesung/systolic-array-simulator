use crate::processing_element::ProcessingElement;

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
        let n = 5;
        let mut dp = DotProduct1D::new_dynamic(n);

        let weights = [1.0, 2.0, 3.0, 4.0, 5.0];
        dp.load_weights(&weights);

        dp.tick(&[10.0, 0.0, 0.0, 0.0, 0.0]);
        dp.tick(&[1.0, 20.0, 0.0, 0.0, 0.0]);
        dp.tick(&[0.0, 1.0, 30.0, 0.0, 0.0]);
        dp.tick(&[0.0, 0.0, 1.0, 40.0, 0.0]);
        dp.tick(&[0.0, 0.0, 0.0, 1.0, 50.0]);

        let out_a = dp.tick(&[0.0, 0.0, 0.0, 0.0, 1.0]);
        assert_approx_eq(out_a, 550.0, "Vector A Result");

        let out_b = dp.tick(&[0.0, 0.0, 0.0, 0.0, 0.0]);
        assert_approx_eq(out_b, 15.0, "Vector B Result");
    }
}
