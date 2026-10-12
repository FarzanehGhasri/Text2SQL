// The two things catalog-service does, each composed from single-purpose parts. Everything outside (files,
// embeddings, reranker, LLM) comes in as `deps`, so tests run the real logic with fakes.
//
//   tables({ question, groups, email })  -> the plan for n8n's BuildPrompt: which tables, joins, examples,
//                                           values, metrics, rules (text2sql/find-tables.js) + logs,
//                                           or { refusal: '⛔ ...' } when the user may see nothing that fits.
//                                           With a reranker and a model trained with it, the most likely tables
//                                           are judged again by the cross-encoder before the final choice.
//   notes({ question, groups, can })     -> { answer } from the Obsidian notes the user may see:
//                                           find-notes.js -> notes-prompt.js -> Qwen -> notes-answer.js
//
// A refusal (an Error whose message starts with ⛔) is an answer for the user, not a failure: it is returned,
// never thrown. Anything else (a missing catalog file, the LLM down) is thrown and becomes an HTTP 500.

const { findTables, rerankCandidates } = require('./text2sql/find-tables');
const { cardTexts } = require('../scripts/lib/catalog-texts');
const { findNotes } = require('./notes/find-notes');
const { notesPrompt, sourcesOf } = require('./notes/notes-prompt');
const { notesAnswer } = require('./notes/notes-answer');

const isRefusal = (e) => e instanceof Error && e.message.startsWith('⛔');

const usesReranker = (items) => items.some((j) => j.retrievalModel === true && (j.models || []).some((m) => m.signals.includes('rerank')));

function createUseCases({ knowledge, embed, llm, rerank = async () => null }) {
  // reranker scores for the most likely tables, or null (no reranker, no model for it, or it failed)
  async function rerankScores(input) {
    if (!usesReranker(input.items)) return null;
    const cards = cardTexts(input.items.filter((j) => Array.isArray(j.entities)));
    const candidates = rerankCandidates(input, cards);
    const scores = await rerank(input.question, candidates.map((c) => c.text));
    return scores ? new Map(candidates.map((c, i) => [c.name, scores[i]])) : null;
  }

  async function tables({ question, groups = [], email = '?' }) {
    const logs = [];
    const log = (m) => logs.push(m);
    try {
      const input = { items: knowledge.catalogItems(), groups, email, question, questionEmbedding: await embed(question) };
      input.rerankScores = await rerankScores(input);
      return { ...findTables(input, log), logs };
    } catch (e) {
      if (isRefusal(e)) return { refusal: e.message, logs };
      throw e;
    }
  }

  async function notes({ question, groups = [], can = {} }) {
    const logs = [];
    const log = (m) => logs.push(m);
    try {
      const plan = findNotes({ index: knowledge.vaultIndex(), groups, can, question, questionEmbedding: await embed(question) }, log);
      const res = await llm(notesPrompt(plan));
      return { ...notesAnswer({ res, sources: sourcesOf(plan.notes) }), logs };
    } catch (e) {
      if (isRefusal(e)) return { answer: e.message, logs };
      throw e;
    }
  }

  return { tables, notes };
}

module.exports = { createUseCases, isRefusal };
