# Pipelined Data Flow

While a single Processing Element (PE) performs a simple MAC operation, the power of a pipeline comes from chaining multiple PEs together to compute operations on streams of data, such as the dot product of two vectors.

## The 1D Array Structure

Our design connects multiple PEs vertically into a 1D array.

*   The \(y_{out}\) of \(PE_0\) connects to the \(y_{in}\) of \(PE_1\).
*   The \(y_{out}\) of \(PE_1\) connects to the \(y_{in}\) of \(PE_2\), and so on.
*   The weights (\(W_0, W_1, W_2\)) are pre-loaded into the PEs.

We want to compute the dot product of an input vector \(X\) with the stationary weight vector \(W\).

$$ \text{Result} = (X_0 \times W_0) + (X_1 \times W_1) + (X_2 \times W_2) $$

## The Need for Staggering

If we injected the entire vector \(X = [X_0, X_1, X_2]\) into the PEs all at once during Cycle 1, the math wouldn't work.

*   In **Cycle 1**, \(PE_0\) computes \(X_0 \times W_0\) and stores it in its \(y_{out}\) register.
*   That partial sum won't reach \(PE_1\) until **Cycle 2**.
*   Therefore, \(PE_1\) must receive its corresponding input (\(X_1\)) in **Cycle 2**, not Cycle 1.

To compute the dot product correctly across a pipeline, the input data must be **staggered in time**. We delay the input to each subsequent PE by one clock cycle.

## Cycle-by-Cycle Execution Example

Let's look at a 3-PE array computing the dot product of $X = [10, 20, 30]$ with weights $W = [1, 2, 3]$. 

We inject the staggered inputs:
*   Cycle 1: \(X_0\) enters \(PE_0\)
*   Cycle 2: \(X_1\) enters \(PE_1\)
*   Cycle 3: \(X_2\) enters \(PE_2\)

| Cycle | \(PE_0\) Input (\(X_0\)) | \(PE_0\) \(Y_{out}\) | \(PE_1\) Input (\(X_1\)) | \(PE_1\) \(Y_{out}\) | \(PE_2\) Input (\(X_2\)) | \(PE_2\) \(Y_{out}\) (Final) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 10 | $10\times1 + 0 = \mathbf{10}$ | 0 | 0 | 0 | 0 |
| **2** | 0 | 0 | 20 | $20\times2 + 10 = \mathbf{50}$ | 0 | 0 |
| **3** | 0 | 0 | 0 | 0 | 30 | $30\times3 + 50 = \mathbf{140}$ |

By **Cycle 3**, the final accumulated sum (`140`) emerges from the bottom of the pipeline.

## Pipelining Multiple Vectors

The true efficiency is realized when computing the dot product of *multiple* vectors sequentially. Because the data flows downwards, as soon as \(PE_0\) finishes computing the first element of Vector A, it is free in the very next cycle to begin computing the first element of Vector B. 

This means a pipeline with \(N\) processing elements can achieve nearly 100% utilization when streaming large datasets, producing one complete dot product result every single clock cycle (after the initial latency to fill the pipeline).
