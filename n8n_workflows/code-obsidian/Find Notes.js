// ===== Find Notes: کدام تکه‌های یادداشت‌های Obsidian به این سوال می‌خورند و کاربر اجازه دیدن کدام را دارد؟ =====
//
// این نود prompt نمی‌نویسد؛ فقط تکه‌ها را انتخاب می‌کند و به Build Notes Prompt می‌دهد.
//
// ورودی:  ایندکس vault (Read Vault Index ← فایل vault-index/vault.embeddings.json که scripts/index-vault-embeddings.js
//         هر دقیقه در indexer-watch می‌سازد) + بردار سوال (Embed Question) + گروه‌ها و اجازه‌های کاربر (AuthCheck)
//         + متن سوال (Webhook)
// خروجی: { question, notes: [{ n, note, heading, path, text, why }], semanticUsed, searched }
//         notes به ترتیب نزدیکی به سوال است و در بودجه CFG.BUDGET_CHARS جا می‌شود.
//
// مراحل (همه در تابع findNotes در انتهای فایل، به همین ترتیب):
//   ۱. دسترسی   visibleChunks   فقط تکه‌هایی که کاربر اجازه دارد (پایین را ببینید)
//   ۲. امتیاز    scoreChunks     معنا (شباهت بردار embedding) + کلمه‌های مشترک
//   ۳. انتخاب    selectChunks    بهترین‌ها تا سقف تعداد و بودجه کاراکتر
//
// چه کسی چه می‌بیند (همان permissions کاتالوگ که Text2SQL استفاده می‌کند، در ایندکس کپی شده):
//   یادداشت جدول  ← اگر گروه کاربر در آن حوزه «*» یا نام همان جدول را دارد
//   یادداشت حوزه  ← فقط با «*» در آن حوزه (قواعد، معیارها و مثال‌های SQL به جدول‌های دیگر هم اشاره می‌کنند)
//   Rules for every question ← هر کسی که به یک حوزه دسترسی دارد
//   یادداشت‌های پروژه (Home، How-to، Schema، ...) ← فقط با can.projectNotes (AuthCheck)
// Inbox/ (سوال‌های واقعی کاربران) و ستون‌های hidden اصلاً در ایندکس نیستند.

// ==================== تنظیمات ====================
const CFG = {
  MAX_QUESTION_CHARS: 1500,    // سوال بلندتر بریده می‌شود
  MAX_NOTES:          8,       // حداکثر تعداد تکه در prompt
  MAX_PER_NOTE:       3,       // حداکثر تکه از یک یادداشت (تا جا برای یادداشت‌های دیگر بماند)
  BUDGET_CHARS:       16000,   // جمع متن تکه‌ها (~۵ هزار توکن)؛ با قواعد و جواب در context ۱۶ هزار توکنی Qwen جا می‌شود
  LEXICAL_WEIGHT:     0.3,     // وزن کلمه‌های مشترک کنار شباهت معنایی (۰ تا ۱)؛ نام جدول و ستون را دقیق پیدا می‌کند.
                               // هر کلمه به نسبت کمیابی‌اش وزن دارد (IDF): «جدول» در صدها تکه هست و تقریباً هیچ نمی‌ارزد
  MIN_TOKEN_CHARS:    3,       // کلمه‌های کوتاه‌تر (از، به، در) شمرده نمی‌شوند
  STOP_WORDS: ['است', 'این', 'برای', 'چطور', 'چگونه', 'کدام', 'چیست', 'کنم', 'کنیم', 'دارد', 'داریم', 'هستند', 'باید',
               'های', 'هایی', 'شود', 'کند', 'باشد',
               'what', 'how', 'the', 'and', 'for', 'with', 'which'],
};

// ==================== ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ====================
// اگر Embed Question خطا داده باشد فقط امتیاز معنایی صفر می‌شود و جست‌وجوی کلمه‌ای کار می‌کند.
function readN8nInputs() {
  let questionEmbedding = null;
  try { questionEmbedding = extractEmbeddingVector($('Embed Question').first().json); } catch (e) { questionEmbedding = null; }
  const auth = $('AuthCheck').first().json;
  return {
    items: $input.all().map(i => i.json),
    groups: auth.groups || [],
    can: auth.can || {},
    question: String($('Webhook').first().json.body.question || ''),
    questionEmbedding,
  };
}

// ==================== کمکی‌ها ====================
// نرمال‌سازی فارسی - همان norm در scripts/lib/persian-text.js (tests/obsidian-assistant.test.js یکی بودنشان را بررسی می‌کند)
const norm = s => String(s == null ? '' : s)
  .replace(/‌/g, ' ')
  .replace(/[​‍-‏‪-‮﻿]/g, '')
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[ً-ْٰ]/g, '')
  .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
  .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const groupKey = g => String(g).trim().toLowerCase().replace(/\s+/g, ' ');

// پاسخ TEI بسته به نسخه n8n چند شکل دارد: [..]، [[..]]، { embedding }، { data }، یا آبجکت با کلیدهای «0»، «1»، ...
// (همان تابع Find Tables در workflow اصلی)
function extractEmbeddingVector(resp) {
  if (resp == null) return null;
  if (Array.isArray(resp)) return typeof resp[0] === 'number' ? resp : (Array.isArray(resp[0]) ? resp[0] : null);
  if (typeof resp !== 'object') return null;
  if (Array.isArray(resp.embedding)) return resp.embedding;
  for (const k of ['body', 'data']) {
    const v = resp[k] !== undefined ? extractEmbeddingVector(resp[k]) : null;
    if (v) return v;
  }
  const keys = Object.keys(resp);
  if (keys.length && keys.every((k, i) => k === String(i))) return extractEmbeddingVector(keys.map(k => resp[k]));
  return null;
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function tokens(text) {
  const stop = new Set(CFG.STOP_WORDS);
  return [...new Set(norm(text).split(/[^\p{L}\p{N}_]+/u))].filter(t => t.length >= CFG.MIN_TOKEN_CHARS && !stop.has(t));
}

// ایندکس از Parse Vault Index می‌آید ({ data: ... } یا خود آبجکت)؛ اگر فایل نبود Read/Parse یک آیتم خطا می‌دهند
function vaultIndexOf(items) {
  const idx = items.map(j => (j && j.data) ? j.data : j).find(j => j && j.vaultIndex === true && Array.isArray(j.chunks));
  if (!idx) throw new Error('⛔ ایندکس یادداشت‌های Obsidian هنوز ساخته نشده است. چند دقیقه بعد دوباره بپرسید؛ اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید.');
  return idx;
}

// ==================== مرحله ۱. دسترسی ====================
// { <domain>: { all, tables:Set } } برای گروه‌های کاربر
function domainRights(permissions, groups) {
  const mine = new Set(groups.map(groupKey));
  const out = {};
  for (const [domain, perms] of Object.entries(permissions || {})) {
    const r = { all: false, tables: new Set() };
    for (const [g, list] of Object.entries(perms || {})) {
      if (!mine.has(groupKey(g))) continue;
      for (const name of (list || [])) { if (name === '*') r.all = true; else r.tables.add(name); }
    }
    if (r.all || r.tables.size) out[domain] = r;
  }
  return out;
}

function canSee(access, rights, can) {
  const r = rights[access && access.domain];
  switch (access && access.scope) {
    case 'table':   return Boolean(r && (r.all || r.tables.has(access.entity)));
    case 'domain':  return Boolean(r && r.all);
    case 'rules':   return Object.keys(rights).length > 0;
    case 'project': return Boolean(can.projectNotes);
    default:        return false;   // نوع ناشناخته: هیچ‌کس
  }
}

function visibleChunks(index, groups, can) {
  const rights = domainRights(index.permissions, groups);
  const visible = index.chunks.filter(c => canSee(c.access, rights, can));
  if (!visible.length) throw new Error('⛔ شما به هیچ‌یک از یادداشت‌های Obsidian دسترسی ندارید. برای دسترسی با واحد فناوری اطلاعات تماس بگیرید.');
  return visible;
}

// ==================== مرحله ۲. امتیاز: معنا + کلمه‌های مشترک ====================
// lexical = وزن کلمه‌های مشترک ÷ وزن همه کلمه‌های سوال؛ وزن هر کلمه log(تعداد تکه‌ها ÷ تعداد تکه‌هایی که آن را دارند)
function scoreChunks(chunks, question, questionEmbedding) {
  const qTokens = tokens(question);
  const texts = chunks.map(c => norm(c.text));
  const weight = new Map(qTokens.map(t => [t, Math.log((chunks.length + 1) / (1 + texts.filter(x => x.includes(t)).length))]));
  const total = qTokens.reduce((sum, t) => sum + weight.get(t), 0);
  return chunks.map((c, i) => {
    const semantic = questionEmbedding ? cosine(questionEmbedding, c.embedding) : 0;
    const shared = qTokens.filter(t => texts[i].includes(t));
    const lexical = total > 0 ? shared.reduce((sum, t) => sum + weight.get(t), 0) / total : 0;
    return { c, semantic, shared, score: semantic + CFG.LEXICAL_WEIGHT * lexical };
  }).sort((a, b) => b.score - a.score);
}

// ==================== مرحله ۳. انتخاب: بهترین‌ها تا سقف تعداد و بودجه ====================
// بدون بردار سوال فقط تکه‌ای انتخاب می‌شود که کلمه مشترک دارد (وگرنه ترتیب بی‌معناست).
function selectChunks(scored, semanticUsed) {
  const out = [];
  const perNote = new Map();
  let used = 0;
  for (const s of scored) {
    if (out.length >= CFG.MAX_NOTES) break;
    if (!semanticUsed && !s.shared.length) break;
    if (used + s.c.text.length > CFG.BUDGET_CHARS || (perNote.get(s.c.path) || 0) >= CFG.MAX_PER_NOTE) continue;
    used += s.c.text.length;
    perNote.set(s.c.path, (perNote.get(s.c.path) || 0) + 1);
    const why = [];
    if (semanticUsed) why.push(`معنای نزدیک (${s.semantic.toFixed(2)})`);
    if (s.shared.length) why.push(`کلمه‌های مشترک: ${s.shared.join('، ')}`);
    out.push({ n: out.length + 1, note: s.c.note, heading: s.c.heading, path: s.c.path, text: s.c.text, why: why.join(' + ') });
  }
  if (!out.length) throw new Error('⛔ در یادداشت‌های Obsidian چیزی درباره این سوال پیدا نکردم. سوال را با کلمه‌های دیگری بپرسید.');
  return out;
}

// ==================== اجرا ====================
function findNotes({ items, groups, can, question, questionEmbedding }) {
  const q = question.trim().slice(0, CFG.MAX_QUESTION_CHARS);
  if (!q) throw new Error('⛔ سوالی دریافت نشد.');
  const index = vaultIndexOf(items);
  const visible = visibleChunks(index, groups, can);
  const semanticUsed = Boolean(questionEmbedding && index.dim === questionEmbedding.length);
  const notes = selectChunks(scoreChunks(visible, q, semanticUsed ? questionEmbedding : null), semanticUsed);
  console.log('NOTES | ' + notes.map(n => `[${n.n}] ${n.note} › ${n.heading || '-'} (${n.why})`).join(' | '));
  return { question: q, notes, semanticUsed, searched: visible.length };
}

return [{ json: findNotes(readN8nInputs()) }];
