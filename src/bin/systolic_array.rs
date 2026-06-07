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

// --- 2. 2D Systolic Array (Storage Agnostic) ---
// 'S' stands for Storage. It can be a fixed Array `[T; N]` or a dynamic `Vec<T>`.
pub struct SystolicArray2D<S> {
    rows: usize,
    cols: usize,
    pes: S,
}

impl<S> SystolicArray2D<S>
where
    S: AsMut<[ProcessingElement]>,
{
    pub fn load_weights(&mut self, weights: &[f32]) {
        let pes = self.pes.as_mut();
        // Assert that we provided the correct number of weights
        assert_eq!(pes.len(), self.rows * self.cols, "Weights length must match array size");

        for i in 0..pes.len() {
            pes[i].load_weight(weights[i]);
        }
    }

    /// Simulates a single clock cycle for the 2D array.
    /// `left_ins`: Inputs entering from the left edge (one per row).
    /// `top_ins`: Inputs entering from the top edge (one per column, usually 0.0 for matmul).
    /// `bottom_outs`: "Outputs" from the bottom edge
    pub fn tick(&mut self, left_ins: &[f32], top_ins: &[f32], bottom_outs: &mut [f32]) {
        let rows = self.rows;
        let cols = self.cols;
        let pes = self.pes.as_mut();

        // Assert that we provided the correct number of inputs for the edges
        assert_eq!(left_ins.len(), rows, "left_ins length must match number of rows");
        assert_eq!(top_ins.len(), cols, "top_ins length must match number of cols");
        assert_eq!(bottom_outs.len(), cols, "bottom_outs length must match number of cols");

        // By iterating in reverse (bottom-right to top-left), we can read the `reg_x_out`
        // and `reg_y_out` of neighbors from the PREVIOUS clock cycle before they are overwritten.
        // This simulates a simultaneous clock edge for the whole grid
        for r in (0..rows).rev() {
            for c in (0..cols).rev() {
                // Input X comes from PE to the left
                let x_in = if c == 0 {
                    left_ins[r]
                } else {
                    pes[r * cols + (c - 1)].reg_x_out()
                };

                // Input Y comes from PE above
                let y_in = if r == 0 {
                    top_ins[c]
                } else {
                    pes[(r - 1) * cols + c].reg_y_out()
                };

                // Simulate one clock cycle for the given PE
                let idx = r * cols + c;
                pes[idx].tick(x_in, y_in);

                // Collect the output from the bottom row of PEs
                if r == rows - 1 {
                    bottom_outs[c] = pes[idx].reg_y_out();
                }
            }
        }
    }
}

// --- Helper Constructors for common storage types ---
impl<const N: usize> SystolicArray2D<[ProcessingElement; N]> {
    /// Creates a SystolicArray2D backed by a fixed-size stack array (not on heap, faster to simulate)
    /// `N` must equal `rows * cols`
    pub fn new_static(rows: usize, cols: usize) -> Self {
        assert_eq!(rows * cols, N, "Static array size N must equal rows * cols");
        Self {
            rows,
            cols,
            pes: [ProcessingElement::new(); N],
        }
    }
}

impl SystolicArray2D<Vec<ProcessingElement>> {
    /// Creates a SystolicArray2D backed by a dynamically sized Vector (WASM/Runtime friendly)
    pub fn new_dynamic(rows: usize, cols: usize) -> Self {
        Self {
            rows,
            cols,
            pes: vec![ProcessingElement::new(); rows * cols],
        }
    }
}

fn main() {
    println!("Run 'cargo test' to see the Systolic Array Matrix Multiplication in action!");
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
    fn test_systolic_matmul_2x2_static() {
        // C = A * B
        // A = [[1, 2],
        //      [3, 4]]
        // B = [[5, 6],
        //      [7, 8]]
        // C = [[19, 22],
        //      [43, 50]]

        // N = 4 (2x2 grid)
        let mut sa = SystolicArray2D::<[ProcessingElement; 4]>::new_static(2, 2);

        // Load Matrix B as weights
        // PE(0,0)=5, PE(0,1)=6, PE(1,0)=7, PE(1,1)=8
        sa.load_weights(&[5.0, 6.0, 7.0, 8.0]);

        // Top inputs are always 0 for weight-stationary matmul
        let top = [0.0, 0.0];

        // Left inputs are columns of A, skewed by row index.
        // Array row 0 gets A's col 0: [1, 3] -> shifted by 0
        // Array row 1 gets A's col 1: [2, 4] -> shifted by 1

        let mut out = [0.0; 2];

        // Cycle 0: row 0 gets A_00, row 1 gets 0 (shifted)
        sa.tick(&[1.0, 0.0], &top, &mut out);
        assert_approx_eq(out[0], 0.0, "C0 col 0");
        assert_approx_eq(out[1], 0.0, "C0 col 1");

        // Cycle 1: row 0 gets A_10, row 1 gets A_01
        sa.tick(&[3.0, 2.0], &top, &mut out);
        assert_approx_eq(out[0], 19.0, "C1 col 0 (C_00)");
        assert_approx_eq(out[1], 0.0, "C1 col 1");

        // Cycle 2: row 0 gets 0 (done), row 1 gets A_11
        sa.tick(&[0.0, 4.0], &top, &mut out);
        assert_approx_eq(out[0], 43.0, "C2 col 0 (C_10)");
        assert_approx_eq(out[1], 22.0, "C2 col 1 (C_01)");

        // Cycle 3: row 0 gets 0, row 1 gets 0 (done)
        sa.tick(&[0.0, 0.0], &top, &mut out);
        assert_approx_eq(out[0], 0.0, "C3 col 0");
        assert_approx_eq(out[1], 50.0, "C3 col 1 (C_11)");
    }

    #[test]
    fn test_systolic_matmul_3x3_dynamic() {
        // C = A * B
        // A = [[1, 2, 3],
        //      [4, 5, 6],
        //      [7, 8, 9]]
        // B = [[1, 0, 0],
        //      [0, 1, 0],
        //      [0, 0, 1]] (Identity)
        // C = A * I = A

        let mut sa = SystolicArray2D::new_dynamic(3, 3);

        // Load Identity matrix as weights
        sa.load_weights(&[
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
        ]);

        let top = [0.0, 0.0, 0.0];

        // Skewed left inputs:
        // row 0: A_00, A_10, A_20, 0, 0
        // row 1: 0, A_01, A_11, A_21, 0
        // row 2: 0, 0, A_02, A_12, A_22

        let mut out = [0.0; 3];

        // Cycle 0
        sa.tick(&[1.0, 0.0, 0.0], &top, &mut out);

        // Cycle 1
        sa.tick(&[4.0, 2.0, 0.0], &top, &mut out);

        // Cycle 2
        sa.tick(&[7.0, 5.0, 3.0], &top, &mut out);
        assert_approx_eq(out[0], 1.0, "C_00 emerges");

        // Cycle 3
        sa.tick(&[0.0, 8.0, 6.0], &top, &mut out);
        assert_approx_eq(out[0], 4.0, "C_10 emerges");
        assert_approx_eq(out[1], 2.0, "C_01 emerges");

        // Cycle 4
        sa.tick(&[0.0, 0.0, 9.0], &top, &mut out);
        assert_approx_eq(out[0], 7.0, "C_20 emerges");
        assert_approx_eq(out[1], 5.0, "C_11 emerges");
        assert_approx_eq(out[2], 3.0, "C_02 emerges");

        // Cycle 5
        sa.tick(&[0.0, 0.0, 0.0], &top, &mut out);
        assert_approx_eq(out[1], 8.0, "C_21 emerges");
        assert_approx_eq(out[2], 6.0, "C_12 emerges");

        // Cycle 6
        sa.tick(&[0.0, 0.0, 0.0], &top, &mut out);
        assert_approx_eq(out[2], 9.0, "C_22 emerges");
    }

    #[test]
    fn test_systolic_matmul_random_dynamic() {
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

        let mut rng = SimpleRng::new(42);

        for n in 2..=10 {
            let mut sa = SystolicArray2D::new_dynamic(n, n);
            
            // Generate random matrices A and B
            let mut a = vec![vec![0.0; n]; n];
            let mut b = vec![vec![0.0; n]; n];
            for i in 0..n {
                for j in 0..n {
                    a[i][j] = rng.next_f32();
                    b[i][j] = rng.next_f32();
                }
            }

            // Compute expected C = A * B
            let mut expected_c = vec![vec![0.0; n]; n];
            for i in 0..n {
                for j in 0..n {
                    for k in 0..n {
                        expected_c[i][j] += a[i][k] * b[k][j];
                    }
                }
            }

            // Load B as weights (row-major)
            let mut weights = Vec::with_capacity(n * n);
            for i in 0..n {
                for j in 0..n {
                    weights.push(b[i][j]);
                }
            }
            sa.load_weights(&weights);

            let mut out_c = vec![vec![0.0; n]; n];
            let top = vec![0.0; n];
            let mut out = vec![0.0; n];

            let total_cycles = 3 * n - 2;
            for cycle in 0..total_cycles {
                let mut left_ins = vec![0.0; n];
                for r in 0..n {
                    if cycle >= r && cycle - r < n {
                        left_ins[r] = a[cycle - r][r];
                    }
                }

                sa.tick(&left_ins, &top, &mut out);

                for j in 0..n {
                    let i_isize = cycle as isize - (n as isize - 1) - j as isize;
                    if i_isize >= 0 && i_isize < n as isize {
                        out_c[i_isize as usize][j] = out[j];
                    }
                }
            }

            // Verify
            for i in 0..n {
                for j in 0..n {
                    let diff = (out_c[i][j] - expected_c[i][j]).abs();
                    assert!(
                        diff < 1e-2,
                        "N={} C_{}_{}: expected {}, got {} (diff {})",
                        n, i, j, expected_c[i][j], out_c[i][j], diff
                    );
                }
            }
        }
    }
}