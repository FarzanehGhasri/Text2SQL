// L2-regularised logistic regression, fitted by Newton's method (IRLS). Small and exact: the retrieval model
// has about ten features and a few thousand (question, table) rows, so a full Newton step is cheap and the fit
// is deterministic (the same data always gives the same weights - npm test checks the committed model).
//
//   fit(X, y, { l2 })     X: rows of numbers, y: 0/1   -> { mean, std, weights, bias }
//   predict(model, x)                                   -> probability
// Features are standardised (mean 0, standard deviation 1) inside the model, so the L2 penalty treats them
// alike and a weight reads as "log-odds per standard deviation"; the bias is not penalised.

const sigmoid = (z) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

function standardiser(X) {
  const d = X[0].length;
  const mean = new Array(d).fill(0);
  const std = new Array(d).fill(0);
  for (const r of X) for (let j = 0; j < d; j++) mean[j] += r[j] / X.length;
  for (const r of X) for (let j = 0; j < d; j++) std[j] += (r[j] - mean[j]) ** 2 / X.length;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;   // a constant feature stays 0 after scaling
  return { mean, std };
}

const scale = (x, { mean, std }) => x.map((v, j) => (v - mean[j]) / std[j]);

// Solves A·x = b (A symmetric positive definite) by Gaussian elimination with partial pivoting.
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

function fit(X, y, { l2 = 1, maxIter = 50, tol = 1e-9 } = {}) {
  if (!X.length) throw new Error('no training rows');
  const st = standardiser(X);
  const Z = X.map((r) => [1, ...scale(r, st)]);   // column 0 = bias
  const d = Z[0].length;
  let w = new Array(d).fill(0);
  for (let it = 0; it < maxIter; it++) {
    const g = new Array(d).fill(0);
    const H = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < Z.length; i++) {
      const z = Z[i];
      const p = sigmoid(z.reduce((a, v, j) => a + v * w[j], 0));
      const s = p * (1 - p);
      for (let j = 0; j < d; j++) {
        g[j] += (p - y[i]) * z[j];
        for (let k = j; k < d; k++) H[j][k] += s * z[j] * z[k];
      }
    }
    for (let j = 0; j < d; j++) for (let k = 0; k < j; k++) H[j][k] = H[k][j];
    for (let j = 1; j < d; j++) { g[j] += l2 * w[j]; H[j][j] += l2; }
    H[0][0] += 1e-9;
    const step = solve(H, g);
    w = w.map((v, j) => v - step[j]);
    if (Math.max(...step.map(Math.abs)) < tol) break;
  }
  return { mean: st.mean, std: st.std, bias: w[0], weights: w.slice(1) };
}

// log-odds, probability and each feature's share of the log-odds (weight · standardised value)
function explain(model, x) {
  const z = scale(x, model);
  const contrib = z.map((v, j) => v * model.weights[j]);
  const logit = model.bias + contrib.reduce((a, b) => a + b, 0);
  return { logit, p: sigmoid(logit), contrib };
}

const predict = (model, x) => explain(model, x).p;

// mean negative log-likelihood (lower is better) - how the L2 strength is chosen
function logLoss(model, X, y) {
  const eps = 1e-12;
  return X.reduce((a, x, i) => {
    const p = Math.min(1 - eps, Math.max(eps, predict(model, x)));
    return a - (y[i] ? Math.log(p) : Math.log(1 - p));
  }, 0) / X.length;
}

module.exports = { fit, predict, explain, logLoss, sigmoid };
