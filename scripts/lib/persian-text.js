// Persian text normalisation for the offline scripts (value index, audit-log
// mining). Mirrors `norm` / `lexNorm` in n8n_workflows/code/BuildPrompt.js: that
// node runs inside n8n and cannot require() this file, so the two copies are
// kept identical and tests/persian-text.test.js checks they agree.

const norm = (s) => String(s == null ? '' : s)
  .replace(/‌/g, ' ')
  .replace(/[​‍-‏‪-‮﻿]/g, '')
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[ً-ْٰ]/g, '')
  .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
  .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

// Drops the plural suffix «ها/های» (see BuildPrompt.js) - for matching only.
const PLURAL_TOKENS = new Set(['ها', 'های', 'هایی']);
const lexNorm = (s) => norm(s).split(' ')
  .filter((t) => !PLURAL_TOKENS.has(t))
  .map((t) => (t.length >= 5 && t.endsWith('های') ? t.slice(0, -3)
    : t.length >= 5 && t.endsWith('ها') ? t.slice(0, -2)
      : t))
  .join(' ');

// Punctuation-free form used to decide that two questions are "the same".
const questionKey = (s) => lexNorm(s).replace(/[؟?!.,،؛:;«»"'()\[\]{}\-_/\\]/g, ' ').replace(/\s+/g, ' ').trim();

module.exports = { norm, lexNorm, questionKey };
