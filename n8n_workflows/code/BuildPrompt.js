// ===== موتور کاتالوگ: انتخاب موجودیت‌ها و ساخت prompt (با امتیاز معنایی) =====
//
// ساختار (SOLID):
//   ۰. تنظیمات (CFG)          - همه عددهای قابل تنظیم یک‌جا؛ تغییر رفتار بدون دست زدن به منطق
//   ۱. آداپتر n8n (ورودی)     - تنها جایی که $input و $('...') خوانده می‌شود (DIP)
//   ۲. توابع خالص             - هر تابع یک مسئولیت (SRP): خواندن کاتالوگ، دسترسی، امتیازدهی،
//                               انتخاب حوزه، انتخاب موجودیت، بستن بودجه، ساخت prompt
//   ۳. ترکیب (main)           - فقط ترتیب فراخوانی توابع
//   ۴. آداپتر n8n (خروجی)     - قرارداد خروجی که Security، Build Fix Prompt و request to LLM می‌خوانند
// این نود یک نود می‌ماند (نه چند نود): بردارهای embedding بین نودها کپی و در تاریخچه
// اجرای n8n ذخیره می‌شدند.

// ==================== ۰. تنظیمات ====================
const CFG = {
  MAX_PROMPT_CHARS:     17000,  // بودجه اندازه کل prompt (قوانین + راهنماها + مثال‌ها + DDL + روابط + سوال).
                                // قبلاً 12000 فقط برای DDL بود و بقیه بیرون از بودجه اضافه می‌شد؛ prompt واقعی
                                // حدود 17000 کاراکتر می‌شد، پس این عدد اندازه کل prompt را ثابت نگه می‌دارد.
  MIN_SCORE:            1,      // حداقل امتیاز برای انتخاب یک موجودیت در schema نهایی
  CLOSURE_HOPS:         1,      // بستار روابط (فقط از جدول ارجاع‌دهنده به جدول بُعد مقصد)
  SEMANTIC_WEIGHT:      4,      // سهم شباهت معنایی در امتیاز نهایی - با تست روی سوالات واقعی تنظیم شود
  COLUMN_SEMANTIC_DISCOUNT: 0.9, // شباهت یک ستون کمی کمتر از شباهت خود جدول ارزش دارد (نویز بیشتر)
  CONFIDENCE_MIN_SCORE: 2,      // اگر بالاترین امتیاز از این کمتر باشد یعنی هیچ موجودیتی واقعاً به سوال مرتبط نیست - با لاگ SCORES کالیبره کن
  MAX_DOMAINS:          3,      // حداکثر تعداد حوزه (کاتالوگ غیرمشترک) که در یک prompt حاضرند؛ سوال‌های ترکیبی
                                // (مثلاً فروش + خرید) به بیش از دو حوزه نیاز دارند و اندازه را بودجه کنترل می‌کند
  DOMAIN_RATIO:         0.6,    // حوزه‌ای فعال است که امتیازش حداقل این نسبت از بهترین حوزه باشد - با لاگ DOMAINS کالیبره کن
  MAX_EXAMPLES:         3,      // حداکثر تعداد مثال در prompt (فقط از حوزه‌های فعال)
  LEX_WEIGHTS: {                // وزن هر نوع تطبیق کلیدواژه‌ای
    entityName:     3,          //   نام موجودیت در سوال آمده
    entitySynonym:  3,          //   یکی از مترادف‌های موجودیت در سوال آمده
    descToken:      0.5,        //   هر کلمه سوال (۳ حرف به بالا) که در توضیح موجودیت هست
    columnName:     1,          //   نام یک ستون در سوال آمده
    columnSynonym:  2           //   مترادف یک ستون در سوال آمده
  }
};

// ==================== ۱. آداپتر n8n: ورودی ====================
// تنها جایی که به نودهای دیگر وابسته‌ایم؛ بقیه کد با مقدارهای ساده کار می‌کند.
function readN8nInputs() {
  // خواندن embedding سوال - اگر نود Embed Question خطا داده یا موجود نیست،
  // به‌جای شکست کل درخواست، فقط امتیاز معنایی صفر می‌شود و امتیاز کلیدواژه‌ای کار می‌کند
  let questionEmbedding = null;
  try {
    questionEmbedding = extractEmbeddingVector($('Embed Question').first().json);
  } catch (e) {
    questionEmbedding = null;
  }
  const auth = $('AuthCheck').first().json;
  return {
    items:    $input.all().map(i => i.json),
    groups:   auth.groups || [],
    email:    auth.email || '?',
    question: $('Webhook').first().json.body.question,
    questionEmbedding
  };
}

// ==================== ۲. توابع خالص ====================

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

const exposedColumns = ent => (ent.columns || []).filter(c => c.exposed !== false);

// ---------- ۲-۱. جدا کردن کاتالوگ‌ها از ایندکس‌های embedding ----------
// ReadCatalog با fileSelector=catalog/*.json همه فایل‌های کاتالوگ را می‌خواند. فایل‌های
// sidecar به‌شکل <name>.embeddings.json (ساخته‌شده با scripts/index-catalog-embeddings.js)
// هم همین‌جا و بدون هیچ تغییری در سیم‌کشی workflow خوانده می‌شوند - فقط باید این‌جا از
// کاتالوگ‌های واقعی جدا شوند. تا وقتی این فایل‌ها ساخته نشده‌اند امتیاز معنایی صفر می‌ماند.
function parseCatalogInputs(items) {
  const docs = items.map(j => (j && j.data) ? j.data : j).filter(Boolean);
  const catalogs = docs.filter(j => Array.isArray(j.entities));
  if (catalogs.length === 0) {
    throw new Error('⛔ کاتالوگ خوانده نشد. فایل‌های /data/catalog را بررسی کنید.');
  }
  const entityVectors = new Map();
  for (const idx of docs.filter(j => j.embeddingIndex === true && j.vectors)) {
    for (const [name, vec] of Object.entries(idx.vectors || {})) entityVectors.set(name, vec);
  }
  return { catalogs, entityVectors };
}

// ---------- ۲-۲. دسترسی: گروه AD → موجودیت‌های مجاز ----------
// هر موجودیت مجاز با _catalog (کاتالوگ صاحبش) و بردارهایش برگردانده می‌شود.
function resolveAccess(catalogs, groups, entityVectors, log) {
  const groupSet = new Set(groups.map(norm));
  const allowed  = new Map();
  const byLower  = new Map(); // نام کوچک‌شده ← نام اصلی، برای تشخیص تکرار در O(1)

  for (const cat of catalogs) {
    const names = new Set();
    let all = false;
    for (const [g, list] of Object.entries(cat.permissions || {})) {
      if (!groupSet.has(norm(g))) continue;
      for (const n of (list || [])) {
        if (n === '*') all = true; else names.add(n);
      }
    }
    if (!all && names.size === 0) continue;
    for (const ent of (cat.entities || [])) {
      if (!all && !names.has(ent.name)) continue;
      // نام موجودیت‌ها بین همه کاتالوگ‌ها سراسری است (Security هم آن‌ها را بدون حساسیت به
      // حروف مقایسه می‌کند). نام تکراری قبلاً بی‌صدا روی قبلی می‌نشست؛ حالا اولی حفظ و
      // هشدار لاگ می‌شود. scripts/validate-catalogs.js این حالت را پیش از استقرار خطا می‌داند.
      const dup = byLower.get(ent.name.toLowerCase());
      if (dup) {
        log('DUPLICATE ENTITY | ' + ent.name + ' in ' + cat.domain
          + ' ignored, already defined in ' + allowed.get(dup)._catalog.domain);
        continue;
      }
      const vec = entityVectors.get(ent.name) || {};
      byLower.set(ent.name.toLowerCase(), ent.name);
      allowed.set(ent.name, Object.assign({}, ent, {
        _catalog: cat,
        embedding: vec.embedding || null,
        columnEmbeddings: vec.columns || null
      }));
    }
  }
  return allowed;
}

// ---------- ۲-۳. امتیازدهی ربط: کلیدواژه‌ای + معنایی (سطح موجودیت و سطح ستون) ----------
function lexicalScore(ent, q, qTokens) {
  const W = CFG.LEX_WEIGHTS;
  let score = 0;
  const contains = (text, w) => {
    const t = lexNorm(text);
    if (t.length >= 2 && q.includes(t)) score += w;
  };
  contains(ent.name, W.entityName);
  for (const s of (ent.synonyms_fa || [])) contains(s, W.entitySynonym);

  const desc = lexNorm(ent.description_fa);
  for (const tok of qTokens) if (desc.includes(tok)) score += W.descToken;

  for (const c of exposedColumns(ent)) {
    contains(c.alias || c.name, W.columnName);
    for (const s of (c.synonyms_fa || [])) contains(s, W.columnSynonym);
  }
  return score;
}

// بالاترین شباهت معنایی بین سوال و (۱) خود موجودیت یا (۲) هر یک از ستون‌هایش.
// یک ستون که به‌تنهایی خیلی خوب match شود هم می‌تواند جدول را مرتبط کند - با کمی
// تخفیف نسبت به match مستقیم روی توضیح خود جدول، چون معمولاً نویز بیشتری دارد.
function semanticScore(ent, questionEmbedding) {
  if (!questionEmbedding) return 0;
  let bestSim = 0;
  if (ent.embedding) bestSim = Math.max(bestSim, cosineSim(questionEmbedding, ent.embedding));
  if (ent.columnEmbeddings) {
    for (const c of exposedColumns(ent)) {
      const ce = ent.columnEmbeddings[c.name];
      if (ce && ce.embedding) {
        bestSim = Math.max(bestSim, cosineSim(questionEmbedding, ce.embedding) * CFG.COLUMN_SEMANTIC_DISCOUNT);
      }
    }
  }
  return Math.max(0, bestSim) * CFG.SEMANTIC_WEIGHT;
}

// [{ ent, score, lex, sem }] مرتب از بیشترین امتیاز
function scoreEntities(allowed, question, questionEmbedding) {
  const q = lexNorm(question);
  const qTokens = q.split(' ').filter(t => t.length >= 3);
  return [...allowed.values()]
    .map(ent => {
      const lex = lexicalScore(ent, q, qTokens);
      const sem = semanticScore(ent, questionEmbedding);
      return { ent, score: lex + sem, lex, sem };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------- ۲-۴. انتخاب حوزه (domain) ----------
// هر کاتالوگ غیرمشترک یک حوزه است (فروش، خرید، ...). امتیاز هر حوزه = بهترین امتیاز
// موجودیت‌های مجاز آن. فقط بهترین حوزه و حوزه‌هایی که نزدیک به آن هستند (DOMAIN_RATIO،
// حداکثر MAX_DOMAINS) «فعال» می‌شوند. قبلاً جدول core، راهنماها و مثال‌های همه حوزه‌های
// مجاز کاربر در هر prompt می‌آمد؛ برای کاربر NLSQL-Full یعنی جدول‌های اصلی شش حوزه برای
// هر سوال، که بودجه را پر می‌کرد و مدل را به جدول نامرتبط می‌کشاند.
// کاتالوگ‌های shared (مثل common.json: کالا، واحد، ارز...) در رقابت نیستند و موجودیت‌هایشان
// همیشه قابل انتخاب‌اند، چون از هر حوزه‌ای به آن‌ها join می‌شود.
function selectDomains(scored, lowConfidence) {
  const domainScore = new Map();
  for (const s of scored) {
    const cat = s.ent._catalog;
    if (cat.shared) continue;
    if (!domainScore.has(cat) || s.score > domainScore.get(cat)) domainScore.set(cat, s.score);
  }
  const ranked = [...domainScore.entries()].sort((a, b) => b[1] - a[1]);
  const best = ranked.length ? ranked[0][1] : 0;

  // حوزه‌ای که هیچ موجودیتش امتیازی نگرفته هرگز فعال نیست (مثلاً سوالی که فقط به یک بُعد
  // مشترک مثل «واحد» می‌خورد نباید جدول core همه حوزه‌ها را برگرداند). با اطمینان پایین فقط
  // بهترین حوزه می‌ماند تا schema کوچک بماند و قانون NOT_SUPPORTED در prompt فعال شود.
  const scoring = ranked.filter(([, sc]) => sc > 0);
  const active = new Set(
    (lowConfidence
      ? scoring.slice(0, 1)
      : scoring.filter(([, sc]) => sc >= best * CFG.DOMAIN_RATIO).slice(0, CFG.MAX_DOMAINS)
    ).map(([cat]) => cat)
  );
  return {
    ranked,
    active,
    activeCatalogs: ranked.map(([c]) => c).filter(c => active.has(c)),
    eligible: ent => ent._catalog.shared === true || active.has(ent._catalog)
  };
}

// ---------- ۲-۵. انتخاب موجودیت‌ها: حداقل امتیاز + core حوزه‌های فعال + بستار روابط ----------
// عمداً «اگر هیچ‌چیز انتخاب نشد، ۳ موجودیت برتر را در هر صورت اضافه کن» نداریم: آن fallback
// باعث می‌شد وقتی سوال واقعاً چیزی خارج از کاتالوگ می‌خواهد، مدل به‌جای اعلام «پشتیبانی
// نمی‌شود» یک جدول نامرتبط را جایگزین کند و SQL قابل‌اجرا اما غلط بسازد.
//
// بستار روابط: هر join در کاتالوگ از ستون ارجاع‌دهنده (from) به کلید جدول مقصد (to) است. فقط
// در همین جهت پیش می‌رویم: جدول انتخاب‌شده، جدول‌های بُعدی را که به آن‌ها ارجاع می‌دهد با خود
// می‌آورد. جهت برعکس (هر جدولی که به یک بُعد انتخاب‌شده ارجاع می‌دهد) قبلاً با انتخاب مثلاً
// Dim_Unit پانزده جدول fact را وارد می‌کرد.
function selectEntities(scored, allowed, domains, joins) {
  const selected = new Set(
    scored.filter(s => s.score >= CFG.MIN_SCORE && domains.eligible(s.ent)).map(s => s.ent.name)
  );
  for (const e of allowed.values()) if (e.core && domains.active.has(e._catalog)) selected.add(e.name);

  for (let hop = 0; hop < CFG.CLOSURE_HOPS; hop++) {
    const add = [];
    for (const j of joins) {
      if (selected.has(j.from) && !selected.has(j.to) && allowed.has(j.to) && domains.eligible(allowed.get(j.to))) add.push(j.to);
    }
    add.forEach(n => selected.add(n));
  }
  return selected;
}

// ---------- ۲-۶. راهنماها و مثال‌ها (فقط از حوزه‌های فعال) ----------
// راهنما یا یک رشته است (برای کل حوزه) یا {text, entities} که فقط وقتی یکی از آن
// موجودیت‌ها در schema نهایی باشد فرستاده می‌شود.
function collectGuidance(activeCatalogs, catalogs) {
  return {
    domainHints: activeCatalogs.flatMap(c => (c.hints_fa || []).filter(h => typeof h === 'string')),
    scopedHints: catalogs.flatMap(c => (c.hints_fa || []).filter(h => h && typeof h === 'object')),
    examples:    activeCatalogs.flatMap(c => c.examples || []).slice(0, CFG.MAX_EXAMPLES)
  };
}

// ---------- ۲-۷. نمایش (render) ----------
function ddlOf(ent) {
  const cols = exposedColumns(ent);
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
}

const relLine      = j => `-- [${j.from}].[${j.from_column}] = [${j.to}].[${j.to_column}]\n`;
const hintLine     = h => '- ' + h + '\n';
const HINTS_HEADER = '\nDOMAIN NOTES:\n';

// متن prompt فقط در همین تابع ساخته می‌شود؛ هم برای اندازه‌گیری بخش ثابت و هم برای
// خروجی نهایی، پس بودجه دقیقاً همان چیزی را می‌شمارد که به مدل فرستاده می‌شود.
function renderPrompt({ question, lowConfidence, hints, examples, schema, rels }) {
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

// ---------- ۲-۸. بستن بودجه کل prompt ----------
// هزینه هر جدول = DDL خودش + خطوط رابطه‌ای که با جدول‌های قبلاً پذیرفته‌شده اضافه می‌کند
// + راهنماهای مخصوص آن جدول. بخش ثابت (قوانین، راهنماهای حوزه، مثال‌ها، سوال) یک‌بار از
// بودجه کم می‌شود؛ اگر راهنمای حوزه‌ای نباشد، جای سرتیتر DOMAIN NOTES برای راهنماهای مخصوص
// جدول‌ها رزرو می‌شود. جدول‌ها به ترتیب امتیاز پذیرفته می‌شوند و اولین جدول همیشه (حتی اگر
// به‌تنهایی از بودجه بزرگ‌تر باشد).
function packPrompt({ order, allowed, joins, guidance, question, lowConfidence }) {
  const fixed = renderPrompt({ question, lowConfidence, hints: guidance.domainHints,
                               examples: guidance.examples, schema: '', rels: '' });
  let budget = CFG.MAX_PROMPT_CHARS - fixed.length - (guidance.domainHints.length ? 0 : HINTS_HEADER.length);

  const finalNames = [];
  const nameSet    = new Set();
  const seenRel    = new Set();
  const hintSet    = new Set();
  const hints      = [...guidance.domainHints];
  let schema = '', rels = '';

  for (const name of order) {
    const ddl = ddlOf(allowed.get(name)) + '\n';
    const newRels = [];
    for (const j of joins) {
      const touches = (j.from === name && (nameSet.has(j.to) || j.to === name))
                   || (j.to === name && nameSet.has(j.from));
      if (!touches) continue;
      const line = relLine(j);
      if (!seenRel.has(line) && !newRels.includes(line)) newRels.push(line);
    }
    const newHints = guidance.scopedHints.filter(h => !hintSet.has(h) && (h.entities || []).includes(name));
    const cost = ddl.length + newRels.join('').length + newHints.map(h => hintLine(h.text)).join('').length;
    if (cost > budget && finalNames.length > 0) continue;

    budget -= cost;
    schema += ddl;
    newRels.forEach(l => { seenRel.add(l); rels += l; });
    newHints.forEach(h => { hintSet.add(h); hints.push(h.text); });
    nameSet.add(name);
    finalNames.push(name);
  }

  const prompt = renderPrompt({ question, lowConfidence, hints, examples: guidance.examples, schema, rels });
  return { finalNames, prompt };
}

// ---------- ۲-۹. تعریف موجودیت‌ها برای Security ----------
// Security از روی همین فهرست CTE می‌سازد؛ فقط ستون‌های قابل نمایش (همان‌هایی که مدل دیده).
function toEntityDefs(names, allowed) {
  const defs = {};
  for (const n of names) {
    const e = allowed.get(n);
    defs[n] = {
      name:    e.name,
      kind:    e.kind || 'table',
      source:  e.source || null,
      sql:     e.sql || null,
      columns: exposedColumns(e).map(c => ({ name: c.name, alias: c.alias || null }))
    };
  }
  return defs;
}

// ==================== ۳. ترکیب ====================
function buildPrompt(input, log) {
  const { catalogs, entityVectors } = parseCatalogInputs(input.items);
  const { question, questionEmbedding } = input;
  if (!question) throw new Error('⛔ سوالی دریافت نشد.');

  const allowed = resolveAccess(catalogs, input.groups, entityVectors, log);
  if (allowed.size === 0) {
    log('ACCESS DENIED | ' + input.email + ' | groups: ' + (input.groups.join(', ') || 'none'));
    throw new Error('⛔ شما دسترسی به این سامانه را ندارید.\n\nبرای درخواست دسترسی با واحد فناوری اطلاعات تماس بگیرید.');
  }

  const scored = scoreEntities(allowed, question, questionEmbedding);
  // لاگ برای تنظیم SEMANTIC_WEIGHT و MIN_SCORE در فاز تست
  log('SCORES | ' + scored.slice(0, 8)
    .map(s => `${s.ent.name}=${s.score.toFixed(2)}(lex ${s.lex.toFixed(1)} + sem ${s.sem.toFixed(1)})`)
    .join(' | '));

  const topScore      = scored.length ? scored[0].score : 0;
  const lowConfidence = topScore < CFG.CONFIDENCE_MIN_SCORE;

  const domains = selectDomains(scored, lowConfidence);
  log('DOMAINS | ' + domains.ranked
    .map(([c, sc]) => `${c.domain}=${sc.toFixed(2)}${domains.active.has(c) ? '*' : ''}`)
    .join(' | '));

  const joins    = catalogs.flatMap(c => c.joins || []);
  const selected = selectEntities(scored, allowed, domains, joins);
  if (lowConfidence) {
    log('LOW CONFIDENCE | topScore=' + topScore.toFixed(2) + ' | question=' + question.slice(0, 120));
  }

  const scoreByName = new Map(scored.map(s => [s.ent.name, s.score]));
  const order = [...selected].sort((a, b) => (scoreByName.get(b) || 0) - (scoreByName.get(a) || 0));
  const { finalNames, prompt } = packPrompt({
    order, allowed, joins, question, lowConfidence,
    guidance: collectGuidance(domains.activeCatalogs, catalogs)
  });
  if (prompt.length > CFG.MAX_PROMPT_CHARS) {
    // فقط وقتی رخ می‌دهد که اولین جدول به‌تنهایی از بودجه بزرگ‌تر باشد
    log('PROMPT OVER BUDGET | chars=' + prompt.length + ' | max=' + CFG.MAX_PROMPT_CHARS);
  }
  log('SELECTED | ' + finalNames.join(', ') + ' | promptChars=' + prompt.length
    + ' | semanticUsed=' + Boolean(questionEmbedding)
    + ' | topScore=' + topScore.toFixed(2)
    + ' | lowConfidence=' + lowConfidence);

  return {
    body: { string1: '-', string2: prompt },
    question: question,
    selectedEntities: finalNames,
    entityDefs: toEntityDefs(finalNames, allowed),
    promptChars: prompt.length,
    retrieval: {
      topScore: topScore,
      lowConfidence: lowConfidence,
      semanticUsed: Boolean(questionEmbedding),
      activeDomains: domains.activeCatalogs.map(c => c.domain),
      scores: scored.slice(0, 8).map(s => ({ entity: s.ent.name, score: s.score, lex: s.lex, sem: s.sem }))
    }
  };
}

// ==================== ۴. آداپتر n8n: خروجی ====================
return [{ json: buildPrompt(readN8nInputs(), msg => console.log(msg)) }];
