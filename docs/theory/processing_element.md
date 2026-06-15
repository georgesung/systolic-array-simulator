# The Processing Element (PE)

At the heart of any pipelined dot product array or systolic array is the **Processing Element (PE)**. A PE is essentially a small, specialized arithmetic unit that performs a single task repeatedly and efficiently.

## The MAC Operation

The primary task of our PE is the **Multiply-Accumulate (MAC)** operation. In a single clock cycle, the PE takes two inputs, multiplies them, adds the result to a third input, and outputs the result.

Mathematically, a single PE performs the following operation:

$$ y_{out} = (x_{in} \times w) + y_{in} $$

Where:

*   \( x_{in} \): The input activation (data flowing horizontally).
*   \( w \): The **Weight**. In a *weight-stationary* architecture (which we are using), this value is loaded into the PE's internal configuration register before the computation begins and remains fixed throughout the operation.
*   \( y_{in} \): The incoming partial sum from the PE directly above it (data flowing vertically).
*   \( y_{out} \): The updated partial sum that will be passed to the PE below it in the next clock cycle.

## Pipeline Registers (State)

To make a pipeline work, data cannot flow instantaneously from the top of the array to the bottom. It must be synchronized to a clock. Therefore, a PE is not just combinational logic; it contains **Registers** (memory) to hold the outputs until the next clock edge.

Our PE has two output registers:

1.  **`reg_y_out`**: Stores the result of the MAC operation (\(y_{out}\)) to be passed to the PE below it.
2.  **`reg_x_out`**: Stores the *unmodified* \(x_{in}\) value. This allows the \(X\) data to simply pass through the PE horizontally to the next array (if we were building a full 2D systolic array).

## Clock Cycle Sequence

In every discrete time step (or clock tick), the PE performs two distinct phases:

1.  **Combinational Logic (Compute):** It reads the current inputs (\(x_{in}, y_{in}\)) and calculates the MAC result.
2.  **Register Update (Clock Edge):** It latches the new values into `reg_y_out` and `reg_x_out`. These registered values become the stable inputs for the adjacent PEs in the *next* clock cycle.
