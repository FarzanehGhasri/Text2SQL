// ===== Find Notes: کدام تکه‌های یادداشت‌های Obsidian به این سوال می‌خورند و کاربر اجازه دیدن کدام را دارد؟ =====
//
// بخشی از catalog-service (POST /notes). prompt نمی‌نویسد؛ فقط تکه‌ها را انتخاب می‌کند (notes-prompt.js می‌نویسد).
//
// ورودی:  findNotes({ index, groups, can, question, questionEmbedding }, log)
//         index = vault-index/vault.embeddings.json (scripts/index-vault-embeddings.js، هر دقیقه در indexer-watch)
// خروجی: { question, notes: [{ n, note, heading, path, text, why }], semanticUsed, searched }
//         notes به ترتیب نزدیکی به سوال است و در بودجه CFG.BUDGET_CHARS جا می‌شود.
//
// مراحل (همه در تابع findNotes در انتهای فایل، به همین ترتیب):
//   ۱. دسترسی   visibleChunks   فقط تکه‌هایی که کاربر اجازه دارد (پایین را ببینید)
//   ۲. امتیاز    scoreChunks     معنا (شباهت بردار embedding) + کلمه‌های مشترک
//   ۳. انتخاب    selectChunks    بهترین‌ها تا سقف تعداد و بودجه کاراکتر
//
// چه کسی چه می‌بیند (همان permissions کاتالوگ که Text2SQL استفاده می‌کند، در ایندکس کپی شده):
//   کارت جدول     ← اگر گروه کاربر در آن حوزه «*» یا نام همان جدول را دارد
//   یادداشت حوزه  ← فقط با «*» در آن حوزه (قواعد، معیارها و مثال‌های SQL به جدول‌های دیگر هم اشاره می‌کنند)
//   Rules for every question ← هر کسی که به یک حوزه دسترسی دارد
//   یادداشت‌های پروژه (Home، How-to، Schema، ...) ← فقط با can.projectNotes (AuthCheck)
// Inbox/ (سوال‌های واقعی کاربران) و ستون‌های hidden اصلاً در ایندکس نیستند.

const { norm } = require('../../scripts/lib/persian-text');

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

// ==================== کمکی‌ها ====================
const groupKey = g => String(g).trim().toLowerCase().replace(/\s+/g, ' ');

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

const INDEX_MISSING = '⛔ ایندکس یادداشت‌های Obsidian هنوز ساخته نشده است. چند دقیقه بعد دوباره بپرسید؛ اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید.';

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
function findNotes({ index, groups = [], can = {}, question, questionEmbedding = null }, log = () => {}) {
  const q = String(question == null ? '' : question).trim().slice(0, CFG.MAX_QUESTION_CHARS);
  if (!q) throw new Error('⛔ سوالی دریافت نشد.');
  if (!index) throw new Error(INDEX_MISSING);
  const visible = visibleChunks(index, groups, can);
  const semanticUsed = Boolean(questionEmbedding && index.dim === questionEmbedding.length);
  const notes = selectChunks(scoreChunks(visible, q, semanticUsed ? questionEmbedding : null), semanticUsed);
  log('NOTES | ' + notes.map(n => `[${n.n}] ${n.note} › ${n.heading || '-'} (${n.why})`).join(' | '));
  return { question: q, notes, semanticUsed, searched: visible.length };
}

module.exports = { findNotes, CFG, INDEX_MISSING };
