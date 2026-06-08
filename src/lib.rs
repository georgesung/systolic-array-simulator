use wasm_bindgen::prelude::*;

pub mod dot_product;
pub mod pipeline_add;
pub mod processing_element;
pub mod systolic_array;

use dot_product::DotProduct1D;
use processing_element::ProcessingElement;

// Create WASM wrappers for Dot Product
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

    pub fn tick(&mut self, x_ins: &[f32]) -> f32 {
        self.dp.tick(x_ins)
    }

    pub fn get_pe_x_out(&self, index: usize) -> f32 {
        self.dp.pes_slice()[index].reg_x_out()
    }

    pub fn get_pe_y_out(&self, index: usize) -> f32 {
        self.dp.pes_slice()[index].reg_y_out()
    }
}
