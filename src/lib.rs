use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

pub mod dot_product;
pub mod pipeline_add;
pub mod processing_element;
pub mod systolic_array;
pub mod wasm_bindings;
