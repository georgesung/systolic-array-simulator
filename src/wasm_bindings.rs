use wasm_bindgen::prelude::*;
use crate::dot_product::DotProduct1D;
use crate::processing_element::ProcessingElement;

#[wasm_bindgen]
pub struct DotProductSim {
    dp: DotProduct1D<Vec<ProcessingElement>>,
}

#[wasm_bindgen]
impl DotProductSim {
    #[wasm_bindgen(constructor)]
    pub fn new(n: usize) -> DotProductSim {
        DotProductSim {
            dp: DotProduct1D::new_dynamic(n),
        }
    }

    pub fn load_weights(&mut self, weights: &[f32]) {
        self.dp.load_weights(weights);
    }

    /// Ticks the pipeline and returns the output of the bottom PE
    pub fn tick(&mut self, x_ins: &[f32]) -> f32 {
        self.dp.tick(x_ins)
    }

    pub fn get_pe_x_out(&self, index: usize) -> f32 {
        self.dp.pes_slice()[index].reg_x_out()
    }

    pub fn get_pe_y_out(&self, index: usize) -> f32 {
        self.dp.pes_slice()[index].reg_y_out()
    }

    /// Ticks the pipeline and returns a flattened array of all PE registers:
    /// [W0, X0, Y0, W1, X1, Y1, ...]
    pub fn tick_and_get_state(&mut self, x_ins: &[f32]) -> Vec<f32> {
        self.dp.tick(x_ins);
        self.get_state()
    }

    /// Returns a flattened array of all PE registers:
    /// [W0, X0, Y0, W1, X1, Y1, ...]
    pub fn get_state(&self) -> Vec<f32> {
        let pes = self.dp.pes_slice();
        let mut state = Vec::with_capacity(pes.len() * 3);
        for pe in pes {
            state.push(pe.weight());
            state.push(pe.reg_x_out());
            state.push(pe.reg_y_out());
        }
        state
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    // Run tests in node to avoid needing a browser environment for simple tests
    // Using `run_in_browser` might fail if Chrome is not present.
    // wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_tick_and_get_state() {
        let mut sim = DotProductSim::new(2);
        sim.load_weights(&[1.0, 2.0]);
        let state1 = sim.tick_and_get_state(&[10.0, 20.0]);
        // cycle 1:
        // PE0: x_in=10, y_in=0 => x_out=10, y_out=10*1+0=10
        // PE1: x_in=20, y_in=0 => x_out=20, y_out=20*2+0=40
        // state: [W0, X0, Y0, W1, X1, Y1]
        assert_eq!(state1, vec![1.0, 10.0, 10.0, 2.0, 20.0, 40.0]);
    }
}
