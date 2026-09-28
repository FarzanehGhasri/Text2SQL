// ===== موتور کاتالوگ: انتخاب موجودیت‌ها و ساخت prompt (با امتیاز معنایی) =====
const CFG = {
  MAX_PROMPT_CHARS:     17000,  // بودجه اندازه کل prompt (قوانین + راهنماها + مثال‌ها + DDL + روابط + سوال).
                                // قبلاً 12000 فقط برای DDL بود و بقیه بیرون از بودجه اضافه می‌شد؛ prompt واقعی
                                // حدود 17000 کاراکتر می‌شد، پس این عدد اندازه کل prompt را ثابت نگه می‌دارد.
  MIN_SCORE:            1,      // حداقل امتیاز برای انتخاب یک موجودیت در schema نهایی
  CLOSURE_HOPS:         1,      // بستار روابط (فقط از جدول ارجاع‌دهنده به جدول بُعد مقصد)
  SEMANTIC_WEIGHT:      4,      // سهم شباهت معنایی در امتیاز نهایی - با تست روی سوالات واقعی تنظیم شود
  CONFIDENCE_MIN_SCORE: 2,      // اگر بالاترین امتیاز از این کمتر باشد یعنی هیچ موجودیتی واقعاً به سوال مرتبط نیست - با لاگ SCORES کالیبره کن
  MAX_DOMAINS:          3,      // حداکثر تعداد حوزه (کاتالوگ غیرمشترک) که در یک prompt حاضرند؛ سوال‌های ترکیبی
                                // (مثلاً فروش + خرید) به بیش از دو حوزه نیاز دارند و اندازه را بودجه کنترل می‌کند
  DOMAIN_RATIO:         0.6,    // حوزه‌ای فعال است که امتیازش حداقل این نسبت از بهترین حوزه باشد - با لاگ DOMAINS کالیبره کن
  MAX_EXAMPLES:         3       // حداکثر تعداد مثال در prompt (فقط از حوزه‌های فعال)
};

// ---------- نرمال‌سازی فارسی ----------
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

// ---------- حذف پسوند جمع «ها/های» فقط برای تطبیق کلیدواژه‌ای ----------
// «فاکتورهای خرید» (با یا بدون نیم‌فاصله) باید با مترادف «فاکتور خرید» جور شود. نیم‌فاصله در
// norm به فاصله تبدیل می‌شود، پس «ها/های/هایی» یا توکن جدا هستند (حذف می‌شوند) یا انتهای
// کلمه‌ای چسبیده (از کلمه ۵ حرفی به بالا بریده می‌شوند تا «بها»، «تنها» و مانند آن دست نخورند).
// هر دو طرف (سوال و متن کاتالوگ) با همین تابع نرمال می‌شوند. روی تطبیق گروه‌های AD اثری ندارد.
const PLURAL_TOKENS = new Set(['ها', 'های', 'هایی']);
const lexNorm = s => norm(s).split(' ')
  .filter(t => !PLURAL_TOKENS.has(t))
  .map(t => t.length >= 5 && t.endsWith('های') ? t.slice(0, -3)
          : t.length >= 5 && t.endsWith('ها')  ? t.slice(0, -2)
          : t)
  .join(' ');

// ---------- شباهت کسینوسی ----------
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

// ---------- استخراج بردار embedding از پاسخ خام سرویس TEI ----------
// سرویس text-embeddings-inference به /embed مستقیماً یک آرایه تودرتو برمی‌گرداند:
// [[0.01, -0.02, ...]] (نه یک آبجکت با کلید "embedding"). بسته به نسخه n8n و اینکه
// نود HTTP Request چطور یک پاسخ آرایه‌ای خام را در item.json بسته‌بندی می‌کند، شکل
// نهایی می‌تواند چند حالت مختلف داشته باشد - همه را اینجا امتحان می‌کنیم تا یک شکل
// غیرمنتظره باعث نشود امتیاز معنایی همیشه صفر بماند.
function extractEmbeddingVector(resp) {
  if (resp == null) return null;
  if (Array.isArray(resp)) {
    if (typeof resp[0] === 'number') return resp;              // [0.01, -0.02, ...]
    if (Array.isArray(resp[0])) return resp[0];                 // [[0.01, -0.02, ...]]
    return null;
  }
  if (typeof resp === 'object') {
    if (Array.isArray(resp.embedding)) return resp.embedding;
    if (resp.body) {
      const fromBody = extractEmbeddingVector(resp.body);
      if (fromBody) return fromBody;
    }
    if (resp.data !== undefined) {
      const fromData = extractEmbeddingVector(resp.data);
      if (fromData) return fromData;
    }
    // برخی نسخه‌های n8n یک آرایه خام JSON را به آبجکتی با کلیدهای رشته‌ای عددی
    // تبدیل می‌کنند، مثل {"0": 0.01, "1": -0.02, ...} یا {"0": [0.01, ...]}
    const keys = Object.keys(resp);
    const looksNumericIndexed = keys.length > 0 && keys.every((k, i) => k === String(i));
    if (looksNumericIndexed) {
      const values = keys.map(k => resp[k]);
      if (typeof values[0] === 'number') return values;
      if (Array.isArray(values[0])) return values[0];
    }
  }
  return null;
}

// خواندن embedding سوال - اگر نود Embed Question خطا داده یا موجود نیست،
// به‌جای شکست کل درخواست، فقط امتیاز معنایی صفر می‌شود و امتیاز کلیدواژه‌ای کار می‌کند
let questionEmbedding = null;
try {
  questionEmbedding = extractEmbeddingVector($('Embed Question').first().json);
} catch (e) {
  questionEmbedding = null;
}

// ---------- ۱. خواندن کاتالوگ‌ها و ایندکس‌های embedding ----------
// ReadCatalog با fileSelector=catalog/*.json همه فایل‌های کاتالوگ را می‌خواند. فایل‌های
// sidecar به‌شکل <name>.embeddings.json (ساخته‌شده با scripts/index-catalog-embeddings.js)
// هم همین‌جا و بدون هیچ تغییری در سیم‌کشی workflow خوانده می‌شوند - فقط باید این‌جا از
// کاتالوگ‌های واقعی جدا شوند. تا وقتی این فایل‌ها ساخته نشده‌اند امتیاز معنایی صفر می‌ماند،
// دقیقاً رفتار قبلی، پس این تغییر با کاتالوگ فعلی هم بدون خطر است.
const inputItems = $input.all()
  .map(i => i.json)
  .map(j => (j && j.data) ? j.data : j)
  .filter(Boolean);

const catalogs = inputItems.filter(j => Array.isArray(j.entities));

const embeddingIndexes = inputItems.filter(j => j && j.embeddingIndex === true && j.vectors);

if (catalogs.length === 0) {
  throw new Error('⛔ کاتالوگ خوانده نشد. فایل‌های /data/catalog را بررسی کنید.');
}

const entityVectors = new Map();
for (const idx of embeddingIndexes) {
  for (const [name, vec] of Object.entries(idx.vectors || {})) {
    entityVectors.set(name, vec);
  }
}

const groups   = $('AuthCheck').first().json.groups || [];
const question = $('Webhook').first().json.body.question;
if (!question) throw new Error('⛔ سوالی دریافت نشد.');

// ---------- ۲. دسترسی: گروه AD → موجودیت‌های مجاز ----------
const groupSet = new Set(groups.map(norm));
const allowed  = new Map();

for (const cat of catalogs) {
  const perms = cat.permissions || {};
  const names = new Set();
  let all = false;
  for (const [g, list] of Object.entries(perms)) {
    if (!groupSet.has(norm(g))) continue;
    for (const n of (list || [])) {
      if (n === '*') all = true; else names.add(n);
    }
  }
  if (!all && names.size === 0) continue;
  for (const ent of (cat.entities || [])) {
    if (all || names.has(ent.name)) {
      // نام موجودیت‌ها بین همه کاتالوگ‌ها سراسری است (Security هم آن‌ها را بدون حساسیت به
      // حروف مقایسه می‌کند). نام تکراری قبلاً بی‌صدا روی قبلی می‌نشست؛ حالا اولی حفظ و
      // هشدار لاگ می‌شود. scripts/validate-catalogs.js این حالت را پیش از استقرار خطا می‌داند.
      const dup = [...allowed.keys()].find(n => n.toLowerCase() === ent.name.toLowerCase());
      if (dup) {
        console.log('DUPLICATE ENTITY | ' + ent.name + ' in ' + cat.domain
          + ' ignored, already defined in ' + allowed.get(dup)._catalog.domain);
        continue;
      }
      const vec = entityVectors.get(ent.name) || {};
      allowed.set(ent.name, Object.assign({}, ent, {
        _catalog: cat,
        embedding: vec.embedding || null,
        columnEmbeddings: vec.columns || null
      }));
    }
  }
}

if (allowed.size === 0) {
  console.log('ACCESS DENIED | ' + ($('AuthCheck').first().json.email || '?')
    + ' | groups: ' + (groups.join(', ') || 'none'));
  throw new Error('⛔ شما دسترسی به این سامانه را ندارید.\n\nبرای درخواست دسترسی با واحد فناوری اطلاعات تماس بگیرید.');
}

// ---------- ۳. امتیازدهی ربط: کلیدواژه‌ای + معنایی (سطح موجودیت و سطح ستون) ----------
const q = lexNorm(question);
const qTokens = q.split(' ').filter(t => t.length >= 3);

function lexicalScoreOf(ent) {
  let score = 0;
  const contains = (text, w) => {
    const t = lexNorm(text);
    if (t.length >= 2 && q.includes(t)) score += w;
  };
  contains(ent.name, 3);
  for (const s of (ent.synonyms_fa || [])) contains(s, 3);

  const desc = lexNorm(ent.description_fa);
  for (const tok of qTokens) if (desc.includes(tok)) score += 0.5;

  for (const c of (ent.columns || [])) {
    if (c.exposed === false) continue;
    contains(c.alias || c.name, 1);
    for (const s of (c.synonyms_fa || [])) contains(s, 2);
  }
  return score;
}

function scoreOf(ent) {
  const lex = lexicalScoreOf(ent);

  // بالاترین شباهت معنایی بین سوال و (۱) خود موجودیت یا (۲) هر یک از ستون‌هایش.
  // یک ستون که به‌تنهایی خیلی خوب match شود هم می‌تواند جدول را مرتبط کند - با کمی
  // تخفیف نسبت به match مستقیم روی توضیح خود جدول، چون معمولاً نویز بیشتری دارد.
  let bestSim = 0;
  if (questionEmbedding && ent.embedding) {
    bestSim = Math.max(bestSim, cosineSim(questionEmbedding, ent.embedding));
  }
  if (questionEmbedding && ent.columnEmbeddings) {
    for (const c of (ent.columns || [])) {
      if (c.exposed === false) continue;
      const ce = ent.columnEmbeddings[c.name];
      if (ce && ce.embedding) {
        bestSim = Math.max(bestSim, cosineSim(questionEmbedding, ce.embedding) * 0.9);
      }
    }
  }
  const sem = Math.max(0, bestSim) * CFG.SEMANTIC_WEIGHT;

  return { total: lex + sem, lex, sem };
}

const scored = [...allowed.values()]
  .map(e => {
    const s = scoreOf(e);
    return { ent: e, score: s.total, lex: s.lex, sem: s.sem };
  })
  .sort((a, b) => b.score - a.score);

// لاگ برای تنظیم SEMANTIC_WEIGHT و MIN_SCORE در فاز تست
console.log('SCORES | ' + scored.slice(0, 8)
  .map(s => `${s.ent.name}=${s.score.toFixed(2)}(lex ${s.lex.toFixed(1)} + sem ${s.sem.toFixed(1)})`)
  .join(' | '));

const scoreByName = new Map(scored.map(s => [s.ent.name, s.score]));

const topScore      = scored.length ? scored[0].score : 0;
const lowConfidence = topScore < CFG.CONFIDENCE_MIN_SCORE;

// ---------- ۳ب. انتخاب حوزه (domain) ----------
// هر کاتالوگ غیرمشترک یک حوزه است (فروش، خرید، ...). امتیاز هر حوزه = بهترین امتیاز
// موجودیت‌های مجاز آن. فقط بهترین حوزه و حوزه‌هایی که نزدیک به آن هستند (DOMAIN_RATIO،
// حداکثر MAX_DOMAINS) «فعال» می‌شوند. قبلاً جدول core، راهنماها و مثال‌های همه حوزه‌های
// مجاز کاربر در هر prompt می‌آمد؛ برای کاربر NLSQL-Full یعنی جدول‌های اصلی شش حوزه برای
// هر سوال، که بودجه را پر می‌کرد و مدل را به جدول نامرتبط می‌کشاند.
// کاتالوگ‌های shared (مثل common.json: کالا، واحد، ارز...) در رقابت نیستند و موجودیت‌هایشان
// همیشه قابل انتخاب‌اند، چون از هر حوزه‌ای به آن‌ها join می‌شود.
const domainScore = new Map();
for (const s of scored) {
  const cat = s.ent._catalog;
  if (cat.shared) continue;
  if (!domainScore.has(cat) || s.score > domainScore.get(cat)) domainScore.set(cat, s.score);
}
const rankedDomains = [...domainScore.entries()].sort((a, b) => b[1] - a[1]);
const bestDomainScore = rankedDomains.length ? rankedDomains[0][1] : 0;

// حوزه‌ای که هیچ موجودیتش امتیازی نگرفته هرگز فعال نیست (مثلاً سوالی که فقط به یک بُعد
// مشترک مثل «واحد» می‌خورد نباید جدول core همه حوزه‌ها را برگرداند). با اطمینان پایین فقط
// بهترین حوزه می‌ماند تا schema کوچک بماند و قانون NOT_SUPPORTED در prompt فعال شود.
const scoringDomains = rankedDomains.filter(([, sc]) => sc > 0);
const activeDomains = new Set(
  (lowConfidence
    ? scoringDomains.slice(0, 1)
    : scoringDomains.filter(([, sc]) => sc >= bestDomainScore * CFG.DOMAIN_RATIO).slice(0, CFG.MAX_DOMAINS)
  ).map(([cat]) => cat)
);
const eligible = ent => ent._catalog.shared === true || activeDomains.has(ent._catalog);

console.log('DOMAINS | ' + rankedDomains
  .map(([c, sc]) => `${c.domain}=${sc.toFixed(2)}${activeDomains.has(c) ? '*' : ''}`)
  .join(' | '));

const selected = new Set(
  scored.filter(s => s.score >= CFG.MIN_SCORE && eligible(s.ent)).map(s => s.ent.name)
);

// ---------- ۴. موجودیت core هر حوزه فعال همیشه حاضر است ----------
for (const e of allowed.values()) if (e.core && activeDomains.has(e._catalog)) selected.add(e.name);

// عمداً دیگر «اگر هیچ‌چیز انتخاب نشد، ۳ موجودیت برتر را در هر صورت اضافه کن» نداریم:
// آن fallback باعث می‌شد وقتی سوال واقعاً چیزی خارج از کاتالوگ می‌خواهد (مثلاً جدولی که
// اصلاً وجود ندارد)، مدل به‌جای اعلام «پشتیبانی نمی‌شود» یک جدول نامرتبط را جایگزین کند
// و SQL قابل‌اجرا اما غلط بسازد. حالا اگر امتیاز کافی نباشد، schema فقط با موجودیت‌های
// core (در صورت وجود) کوچک می‌ماند تا قانون NOT_SUPPORTED در prompt فعال شود.
if (lowConfidence) {
  console.log('LOW CONFIDENCE | topScore=' + topScore.toFixed(2)
    + ' | question=' + question.slice(0, 120));
}

// ---------- ۵. بستار روابط ----------
// هر join در کاتالوگ از ستون ارجاع‌دهنده (from) به کلید جدول مقصد (to) است. فقط در همین
// جهت پیش می‌رویم: جدول انتخاب‌شده، جدول‌های بُعدی را که به آن‌ها ارجاع می‌دهد با خود می‌آورد.
// جهت برعکس (هر جدولی که به یک بُعد انتخاب‌شده ارجاع می‌دهد) قبلاً با انتخاب مثلاً Dim_Unit
// پانزده جدول fact را وارد می‌کرد.
const allJoins = catalogs.flatMap(c => c.joins || []);
for (let hop = 0; hop < CFG.CLOSURE_HOPS; hop++) {
  const add = [];
  for (const j of allJoins) {
    if (selected.has(j.from) && !selected.has(j.to) && allowed.has(j.to) && eligible(allowed.get(j.to))) add.push(j.to);
  }
  add.forEach(n => selected.add(n));
}

// ---------- ۶. راهنماها و مثال‌ها (فقط از حوزه‌های فعال) ----------
// راهنما یا یک رشته است (برای کل حوزه) یا {text, entities} که فقط وقتی یکی از آن
// موجودیت‌ها در schema نهایی باشد فرستاده می‌شود.
const activeCatalogs = rankedDomains.map(([c]) => c).filter(c => activeDomains.has(c));
const domainHints    = activeCatalogs.flatMap(c => (c.hints_fa || []).filter(h => typeof h === 'string'));
const scopedHints    = catalogs.flatMap(c => (c.hints_fa || []).filter(h => h && typeof h === 'object'));
const examples       = activeCatalogs.flatMap(c => c.examples || []).slice(0, CFG.MAX_EXAMPLES);

// ---------- ۷. ساخت DDL و بستن بودجه کل prompt ----------
const ddlOf = ent => {
  const cols = (ent.columns || []).filter(c => c.exposed !== false);
  const lines = cols.map((c, idx) => {
    const nm   = c.alias || c.name;
    const last = idx === cols.length - 1;
    const d    = c.description_fa ? `   -- ${c.description_fa}` : '';
    return `  [${nm}] ${c.type || 'nvarchar'}${last ? '' : ','}${d}`;
  });
  const head = ent.description_fa
    ? `CREATE TABLE [${ent.name}] (   -- ${ent.description_fa}`
    : `CREATE TABLE [${ent.name}] (`;
  return `${head}\n${lines.join('\n')}\n);\n`;
};

const relLine      = j => `-- [${j.from}].[${j.from_column}] = [${j.to}].[${j.to_column}]\n`;
const hintLine     = h => '- ' + h + '\n';
const HINTS_HEADER = '\nDOMAIN NOTES:\n';

// متن prompt فقط در همین تابع ساخته می‌شود؛ هم برای اندازه‌گیری بخش ثابت و هم برای
// خروجی نهایی، پس بودجه دقیقاً همان چیزی را می‌شمارد که به مدل فرستاده می‌شود.
function renderPrompt(schema, rels, hints) {
  return `You are a Microsoft SQL Server (T-SQL) expert.

Your response must have EXACTLY this shape and nothing else:
UNDERSTOOD: <one concise English sentence restating what the question is asking for - always in English, even though the question may be in Persian>
SQL:
<a single T-SQL SELECT query - no markdown fences, no explanation>

RULES:
- Microsoft SQL Server. Use SELECT TOP N. NEVER use LIMIT.
- TOP comes immediately after SELECT.
- The entities below are ready-made views. Query them directly.
- Use ONLY these entities, columns and relationships. Names EXACTLY as listed, in [square brackets].
- The question may be written in Persian. Understand it, but respond only with SQL.
- If the question needs a table, column or business concept that is NOT among the entities/columns below, do NOT substitute a similar-looking one and do NOT guess. Respond instead with exactly this shape:
UNDERSTOOD: <state in English what data would be needed and that it is not available>
SQL:
SELECT 'NOT_SUPPORTED' AS Status, 'briefly say in English what is missing' AS Reason
${lowConfidence ? '\nNOTE: none of the available entities scored as a strong semantic/keyword match for this question, so it is likely NOT answerable with the schema below. Prefer the NOT_SUPPORTED response above unless one of these entities genuinely answers the question.\n' : ''}${hints.length ? HINTS_HEADER + hints.map(hintLine).join('') : ''}
${examples.map((ex, i) => `Example ${i + 1}:\nQ: ${ex.q}\nA: ${ex.sql}`).join('\n\n')}

Available entities:
${schema}Relationships:
${rels}
Q: ${question}
A:`;
}

const order = [...selected].sort(
  (a, b) => (scoreByName.get(b) || 0) - (scoreByName.get(a) || 0)
);

// هزینه هر جدول = DDL خودش + خطوط رابطه‌ای که با جدول‌های قبلاً پذیرفته‌شده اضافه می‌کند
// + راهنماهای مخصوص آن جدول. بخش ثابت (قوانین، راهنماهای حوزه، مثال‌ها، سوال) یک‌بار از
// بودجه کم می‌شود؛ اگر راهنمای حوزه‌ای نباشد، جای سرتیتر DOMAIN NOTES برای راهنماهای مخصوص
// جدول‌ها رزرو می‌شود.
const fixedChars = renderPrompt('', '', domainHints).length + (domainHints.length ? 0 : HINTS_HEADER.length);
let budget = CFG.MAX_PROMPT_CHARS - fixedChars;

const finalNames = [];
const nameSet    = new Set();
const seenRel    = new Set();
const hintSet    = new Set();
let schema = '', rels = '';
const hints = [...domainHints];

for (const name of order) {
  const ddl = ddlOf(allowed.get(name)) + '\n';
  const newRels = [];
  for (const j of allJoins) {
    const touches = (j.from === name && (nameSet.has(j.to) || j.to === name))
                 || (j.to === name && nameSet.has(j.from));
    if (!touches) continue;
    const line = relLine(j);
    if (!seenRel.has(line) && !newRels.includes(line)) newRels.push(line);
  }
  const newHints = scopedHints.filter(h => !hintSet.has(h) && (h.entities || []).includes(name));
  const cost = ddl.length + newRels.join('').length + newHints.map(h => hintLine(h.text)).join('').length;
  if (cost > budget && finalNames.length > 0) continue;

  budget -= cost;
  schema += ddl;
  newRels.forEach(l => { seenRel.add(l); rels += l; });
  newHints.forEach(h => { hintSet.add(h); hints.push(h.text); });
  nameSet.add(name);
  finalNames.push(name);
}

// ---------- ۸-۹. ساخت prompt ----------
const prompt = renderPrompt(schema, rels, hints);
if (prompt.length > CFG.MAX_PROMPT_CHARS) {
  // فقط وقتی رخ می‌دهد که اولین جدول به‌تنهایی از بودجه بزرگ‌تر باشد
  console.log('PROMPT OVER BUDGET | chars=' + prompt.length + ' | max=' + CFG.MAX_PROMPT_CHARS);
}

// ---------- ۱۰. خروجی ----------
const entityDefs = {};
for (const n of finalNames) {
  const e = allowed.get(n);
  entityDefs[n] = {
    name:    e.name,
    kind:    e.kind || 'table',
    source:  e.source || null,
    sql:     e.sql || null,
    columns: (e.columns || [])
      .filter(c => c.exposed !== false)
      .map(c => ({ name: c.name, alias: c.alias || null }))
  };
}

console.log('SELECTED | ' + finalNames.join(', ') + ' | promptChars=' + prompt.length
  + ' | semanticUsed=' + Boolean(questionEmbedding)
  + ' | topScore=' + topScore.toFixed(2)
  + ' | lowConfidence=' + lowConfidence);

return [{
  json: {
    body: { string1: '-', string2: prompt },
    question: question,
    selectedEntities: finalNames,
    entityDefs: entityDefs,
    promptChars: prompt.length,
    retrieval: {
      topScore: topScore,
      lowConfidence: lowConfidence,
      semanticUsed: Boolean(questionEmbedding),
      activeDomains: activeCatalogs.map(c => c.domain),
      scores: scored.slice(0, 8).map(s => ({ entity: s.ent.name, score: s.score, lex: s.lex, sem: s.sem }))
    }
  }
}];