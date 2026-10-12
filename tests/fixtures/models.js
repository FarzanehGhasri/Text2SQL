// Retrieval models with hand-written weights, for tests of the pipeline MECHANICS on small made-up catalogs:
// plural suffixes, link tables, scoped hints, meaning z-scores, top-3 columns. A model learned on the real
// 152-table catalog does not transfer to a 5-table toy (its rarity and relative scales differ), and these
// tests are not about weights. The real weights are learned by scripts/train-retrieval.js; tests on the real
// catalog use the committed baseline (catalog-service/text2sql/baseline-model.json).
const { featuresOf } = require('../../catalog-service/text2sql/relevance');

function modelFile(signals, weightOf) {
  const features = featuresOf(signals);
  return {
    retrievalModel: true, formatVersion: 1,
    models: [{
      signals, features, l2: 1,
      mean: features.map(() => 0), std: features.map(() => 1), weights: features.map(weightOf), bias: -4,
      thresholds: { select: 0.5, domainRatio: 0.5, maxDomains: 3, joinPath: 0.5, confident: 0.5 },
    }],
  };
}

// a name or synonym in the question (identity >= 1) is enough to send a table; nothing else is
const keywordModelFile = () => modelFile(['lexical'], (f) => (f === 'identity' ? 5 : f === 'identity_rel' ? 1 : 0));
// meaning standing out by 2 standard deviations is enough
const semanticModelFile = () => modelFile(['lexical', 'semantic'], (f) => (f.startsWith('meaning_') ? 2 : f === 'identity' ? 1 : 0));

// the reranker's score decides; a keyword model is there for when the reranker is missing
function rerankModelFile() {
  const f = modelFile(['lexical', 'rerank'], (x) => (x === 'rerank' ? 8 : 0));
  f.models.push(keywordModelFile().models[0]);
  return f;
}

module.exports = { keywordModelFile, semanticModelFile, rerankModelFile };
