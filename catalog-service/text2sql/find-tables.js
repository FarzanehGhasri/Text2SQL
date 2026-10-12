// ===== Find Tables: کدام جدول‌ها و کدام دانسته‌ها به درد این سوال می‌خورند؟ =====
//
// بخشی از catalog-service (POST /tables). تا obsidian_01 یک Code node در n8n بود؛ منطق بدون تغییر اینجا آمده
// (prompt همه سوال‌های benchmark قبل و بعد از انتقال یکی است) و فقط خواندن ورودی از n8n حذف شده است.
// این فایل prompt نمی‌نویسد؛ فقط «طرح» سوال را می‌سازد و نود BuildPrompt در n8n از روی آن prompt را می‌نویسد.
//
// ورودی:  findTables({ items, groups, email, question, questionEmbedding }, log)
//         items = محتوای همه فایل‌های catalog/*.json (کاتالوگ‌هایی که از یادداشت‌های Obsidian ساخته می‌شوند،
//         بردارهای embedding، بانک کوئری query_bank.json، ایندکس مقدارها values.json، rules.json)
// خروجی: { question, lowConfidence, tables, joins, hints, rules, examples, values, metrics, retrieval }
//         tables به ترتیب اهمیت است؛ BuildPrompt از بالای فهرست تا جایی که بودجه اجازه دهد برمی‌دارد.
//         joins همان «joins» کاتالوگ‌هاست (from, from_column, to, to_column, type, inferred) - فقط بین جدول‌های طرح.
//
// مراحل (همه در تابع findTables در انتهای فایل، به همین ترتیب):
//   ۱. دسترسی          resolveAccess        فقط جدول‌هایی که گروه‌های کاربر اجازه دارند
//   ۲. شواهد           tableEvidence        برای هر جدول: کلیدواژه (BM25F، lexical.js)، معیار، مقدار، الگو،
//                                            جدول اصلی، معنا (embedding) و در صورت وجود reranker
//   ۳. احتمال          scoreTables          مدل یادگرفته‌شده (relevance.js): احتمال اینکه جدول برای سوال لازم باشد
//   ۴. اطمینان         lowConfidence        بیشترین احتمال (بدون مقدارها) کمتر از آستانه یادگرفته‌شده، و معیاری نام برده نشده؟
//   ۵. حوزه‌ها         selectDomains        حوزه‌های نزدیک به بهترین حوزه (نسبت و حداکثر تعداد یادگرفته‌شده)
//   ۶. جدول‌ها         selectEntities       بالای آستانه انتخاب + جدول‌های «قاعده» + جدول اصلی (core) + بُعدها +
//                                            جدول واسط روی گراف joins
//
// جدول‌های «قاعده»: چیزهایی که یک انسان صریحاً در کاتالوگ نوشته و احتمالی نیستند - الگوی جدول (سال شمسی ←
// Dim_Date)، مقدار ذخیره‌شده‌ای که کامل در سوال آمده، و جدول‌های فرمول معیاری که نامش در سوال آمده. این‌ها مثل
// بستار joinها همیشه می‌آیند (فرمول معیار بدون جدولش نوشته نمی‌شود)؛ مدل بقیه را با احتمال انتخاب می‌کند.
//   ۷. مثال‌ها         rankExamples         مشابه‌ترین مثال‌های بانک کوئری
//
// هیچ وزن یا آستانه‌ای برای امتیاز جدول‌ها دستی انتخاب نشده: وزن‌ها و آستانه‌ها با scripts/train-retrieval.js از
// سوال‌های برچسب‌دار benchmark یاد گرفته می‌شوند - روی سرور با embedding واقعی در catalog/retrieval-model.json و
// مدل پایه (فقط کلمه‌ای) همراه کد در baseline-model.json. عددهای CFG پایین فقط
// بودجه (چند جدول، چند مثال) و قاعده‌های تطبیق مقدارها هستند، نه وزن.
// لاگ‌های SCORES، DOMAINS، VALUES، METRICS، JOIN PATH و WHY همراه جواب سرویس برمی‌گردند (فیلد logs).

const { buildLexicalIndex, lexicalEvidence } = require('./lexical');
const { chooseModel, score, zScores } = require('./relevance');
// keyword-only model learned from the benchmark questions, committed with the code; the server's own model (trained
// with the real embeddings by indexer-watch, catalog/retrieval-model.json, not in git) replaces it when present
const BASELINE_MODEL = require('./baseline-model.json');

// ==================== تنظیمات ====================
// بودجه‌ها و قاعده‌های تطبیق؛ وزن‌ها و آستانه‌های امتیاز در catalog/retrieval-model.json (یادگرفته‌شده) هستند.
const CFG = {
  MAX_QUESTION_CHARS:   1500,   // سوال بلندتر از این بریده می‌شود (متن چسبانده‌شده نباید بودجه prompt را بخورد)
  CLOSURE_HOPS:         1,      // بستار روابط (فقط از جدول ارجاع‌دهنده به جدول بُعد مقصد)
  JOIN_PATH: {                  // کامل کردن مسیر join بین جدول‌هایی که مستقیم به هم وصل نیستند
                                //   (کدام جدول‌ها به هم وصل شوند: آستانه joinPath مدل، یادگرفته‌شده)
    MAX_HOPS:      2,           //   حداکثر تعداد جدول واسط در یک مسیر
    MAX_TABLES:    3            //   حداکثر کل جدول‌های واسطی که برای یک سوال اضافه می‌شود (کنترل اندازه prompt)
  },
  COLUMN_TOP_K:         3,      // ویژگی «معنای ستون‌ها» = میانگین شباهت k ستون نزدیک‌تر (نه بیشترین: یک ستون تصادفی کافی نباشد)
  RERANK_CANDIDATES:    20,     // چند جدول برتر به reranker داده می‌شود (هزینه زمان، نه وزن)
  EXAMPLES: {                   // مثال‌های few-shot: مشابه‌ترین‌ها به سوال، از کاتالوگ‌ها و catalog/query_bank.json (مرحله ۷)
    MAX:             4,         //   حداکثر تعداد مثال در prompt
    SEMANTIC_WEIGHT: 1,         //   وزن شباهت embedding سوال با سوال مثال (وقتی بردار هر دو هست)
    LEXICAL_WEIGHT:  1,         //   وزن کلمات مشترک (Jaccard) - تنها معیار وقتی embedding نیست
    LINK_MIN_SIM:    0.85,      //   مثالی با این شباهت معنایی، جدول‌هایش را هم به prompt می‌آورد (اگر کاربر مجاز باشد)
    LINK_MAX:        2          //   حداکثر تعداد مثالی که جدول اضافه می‌کند
  },
  METRICS: {
    MAX:             4          //   حداکثر تعداد معیار در prompt
  },
  VALUES: {                     // مقدارهای ذخیره‌شده‌ای که در سوال آمده‌اند (catalog/values.json)
    MIN_CHARS:      3,          //   کوتاه‌ترین مقدار یا عبارت سوال که تطبیق داده می‌شود
    MAX_NGRAM:      4,          //   بلندترین عبارت سوال (به کلمه) که داخل مقدارها جست‌وجو می‌شود
    RARE_DF:        20,         //   تک‌کلمه‌ای که در بیش از این تعداد مقدار آمده به‌تنهایی تطبیق نمی‌خورد («شرکت»، «فروش»)
    MAX_LINES:      8,          //   حداکثر خط مقدار در prompt
    PER_COLUMN:     3,          //   حداکثر مقدار نمونه برای هر ستون
    PER_VALUE:      2,          //   یک مقدار در حداکثر چند ستون نشان داده شود
    SAMPLE_MAX_DISTINCT: 25,    //   ستون‌هایی با این تعداد مقدار یا کمتر، نمونه مقدار در DDL می‌گیرند
    SAMPLE_COUNT:   4           //   تعداد نمونه مقدار در DDL
  }
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

const exposedColumns = ent => (ent.columns || []).filter(c => c.exposed !== false);

// ---------- ورودی: کاتالوگ‌ها، بردارها، بانک کوئری و ایندکس مقدارها ----------
// catalog-service (knowledge.js) همه فایل‌های catalog/*.json را می‌خواند و به findTables می‌دهد. فایل‌های
// sidecar به‌شکل <name>.embeddings.json (ساخته‌شده با scripts/index-catalog-embeddings.js)
// هم همین‌جا خوانده می‌شوند - فقط باید این‌جا از
// کاتالوگ‌های واقعی جدا شوند. تا وقتی این فایل‌ها ساخته نشده‌اند امتیاز معنایی صفر می‌ماند.
// ایندکس مقدارها (values.json با valueIndex: true، ساخته‌شده با scripts/build-value-index.js)،
// بانک کوئری (query_bank.json با queryBank: true) و بردارهای سوال مثال‌ها (query_bank.embeddings.json
// با exampleIndex: true، کلید = متن سوال مثال) هم از همین glob می‌آیند.
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
  const banks = docs.filter(j => j.queryBank === true && Array.isArray(j.examples));
  const valueIndexes = docs.filter(j => j.valueIndex === true && Array.isArray(j.columns));
  const exampleVectors = new Map();
  for (const idx of docs.filter(j => j.exampleIndex === true && j.vectors)) {
    for (const [q, vec] of Object.entries(idx.vectors || {})) if (vec && vec.embedding) exampleVectors.set(q, vec.embedding);
  }
  // قانون‌هایی که برای همه سوال‌ها به مدل گفته می‌شود (catalog/rules.json، از یادداشت Obsidian «Rules for every question»)
  const rules = docs.filter(j => j.globalRules === true).flatMap(j => (j.rules || []).map(String));
  // مدل احتمال جدول‌ها: مدل سرور (catalog/retrieval-model.json) و اگر نبود، مدل پایه همراه کد
  const modelFile = docs.find(j => j.retrievalModel === true) || BASELINE_MODEL;
  return { catalogs, entityVectors, banks, exampleVectors, valueIndexes, rules, modelFile };
}

// ==================== مرحله ۱. دسترسی: گروه AD → جدول‌های مجاز ====================
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

// ==================== مرحله ۲. معنا (embedding): هر جدول چقدر از بقیه به سوال نزدیک‌تر است ====================
// دو شباهت کسینوسی برای هر جدول: با «کارت جدول» (نام، توضیح، مترادف‌ها، توضیح ستون‌های متمایز) و میانگین
// COLUMN_TOP_K ستونِ نزدیک‌تر (ستون‌های کلید و عمومی بردار ندارند، catalog-texts.js). شباهت خام بی‌معناست
// (bge-m3 حتی به متن بی‌ربط ~۰.۴ می‌دهد)؛ ویژگی مدل فاصله آن از میانگین «همه» جدول‌های کاتالوگ برای همین
// سوال است، بر حسب انحراف معیار (z). جمعیت همه جدول‌هاست نه فقط جدول‌های مجاز کاربر: با ۴ جدول هیچ عددی
// «برجسته» نمی‌شود. بردار جدول‌های غیرمجاز فقط در میانگین شمرده می‌شود و چیزی از آن‌ها به prompt نمی‌رسد.
// اینکه این فاصله چقدر بیارزد را مدل از داده یاد می‌گیرد (relevance.js).
function semanticSims(vec, columns, questionEmbedding) {
  const table = vec.embedding ? cosineSim(questionEmbedding, vec.embedding) : null;
  const sims = [];
  for (const c of columns) {
    const ce = vec.columns && vec.columns[c.name];
    if (ce && ce.embedding) sims.push(cosineSim(questionEmbedding, ce.embedding));
  }
  const top = sims.sort((a, b) => b - a).slice(0, CFG.COLUMN_TOP_K);
  return { table, columns: top.length ? top.reduce((a, b) => a + b, 0) / top.length : null };
}

// نام جدول ← { meaning_table, meaning_columns, sim } برای همه جدول‌های کاتالوگ (یا Map خالی بدون embedding)
function semanticFeatures(catalogs, entityVectors, questionEmbedding) {
  const out = new Map();
  if (!questionEmbedding || !entityVectors.size) return out;
  const tableSims = new Map(), columnSims = new Map();
  for (const c of catalogs) {
    for (const ent of (c.entities || [])) {
      const v = entityVectors.get(ent.name);
      const s = v ? semanticSims(v, exposedColumns(ent), questionEmbedding) : { table: null, columns: null };
      tableSims.set(ent.name, s.table);
      columnSims.set(ent.name, s.columns);
    }
  }
  const zt = zScores(tableSims), zc = zScores(columnSims);
  for (const name of tableSims.keys()) {
    const sims = [tableSims.get(name), columnSims.get(name)].filter(x => x !== null);
    out.set(name, { meaning_table: zt.get(name), meaning_columns: zc.get(name), sim: sims.length ? Math.max(...sims) : null });
  }
  return out;
}

// ایندکس کلیدواژه روی همه جدول‌های کاتالوگ (IDF از همه، نه فقط جدول‌های مجاز - همان که مدل با آن یاد گرفته)؛
// تا وقتی همان کاتالوگ‌ها (همان اشیاء) می‌آیند دوباره ساخته نمی‌شود.
let lexicalCache = { catalogs: [], index: null };
function lexicalIndexFor(catalogs) {
  const same = lexicalCache.catalogs.length === catalogs.length && catalogs.every((c, i) => c === lexicalCache.catalogs[i]);
  if (!same) lexicalCache = { catalogs: [...catalogs], index: buildLexicalIndex(catalogs.flatMap(c => c.entities || [])) };
  return lexicalCache.index;
}

// ==================== مرحله ۳. معیارها: «فروش خالص» ← فرمول دقیق ====================
// BIRD (Li و همکاران، NeurIPS 2023) نشان داد «دانش کسب‌وکار» (evidence) بیش از ده امتیاز دقت می‌آورد.
// «فروش خالص» یعنی SUM([EffectiveNetPrice]) فقط برای اقلام غیرباطل؛ مدل نباید هر بار این را از راهنماها
// حدس بزند. هر کاتالوگ فهرست metrics دارد (name_fa، synonyms_fa، sql، filter، note_fa)؛ معیاری که نام یا
// مترادفش در سوال آمده با فرمول دقیقش به prompt می‌رود و جدول‌هایش دست‌کم امتیاز یک مترادف را می‌گیرند
// (پیش از سنجش اطمینان). روی تطبیق کلیدواژه‌ای جمع نمی‌شود: «مبلغ فاکتور خرید» همان کلمات مترادف
// «فاکتور خرید» را دارد و دو بار شمردنش حوزه دیگرِ سوال ترکیبی (فروش) را از DOMAIN_RATIO بیرون می‌انداخت.
// فقط معیاری که همه جدول‌هایش برای کاربر مجاز است.
function metricEntities(m) {
  const out = [];
  const re = /\[([^\]]+)\]\.\[[^\]]+\]/g;
  let x;
  while ((x = re.exec(`${m.sql} ${m.filter || ''}`)) !== null) if (!out.includes(x[1])) out.push(x[1]);
  return out;
}

function matchMetrics(catalogs, allowed, question) {
  const q = lexNorm(question);
  const byLower = new Map([...allowed.keys()].map(n => [n.toLowerCase(), n]));
  const hits = [];
  for (const c of catalogs) {
    for (const m of (c.metrics || [])) {
      if (!m || typeof m.name_fa !== 'string' || typeof m.sql !== 'string') continue;
      const entities = metricEntities(m).map(n => byLower.get(n.toLowerCase()));
      if (!entities.length || entities.some(n => !n)) continue;
      const hit = [m.name_fa, ...(m.synonyms_fa || [])].map(lexNorm)
        .filter(t => t.length >= 2 && q.includes(t)).sort((a, b) => b.length - a.length)[0];
      if (hit) hits.push({ m, entities, hit });
    }
  }
  // «تعداد سفارش» (فروش) داخل «تعداد سفارش خرید» (خرید) است: فقط بلندترین تطبیق می‌ماند
  hits.sort((a, b) => b.hit.length - a.hit.length);
  return hits.filter((h, i) => !hits.slice(0, i).some(o => o.hit !== h.hit && o.hit.includes(h.hit)))
    .slice(0, CFG.METRICS.MAX);
}

// ==================== مرحله ۵. مقدارهای ذخیره‌شده‌ای که در سوال آمده (value retrieval) ====================
// CHESS (Talaei و همکاران ۲۰۲۴) و CodeS (Li و همکاران، SIGMOD 2024): سوالی که یک مقدار را نام می‌برد
// («دفتر فروش تهران»، «باطل شده»، «بانک ملت») فقط وقتی درست جواب می‌گیرد که مدل املای دقیق ذخیره‌شده
// (و در بُعدها، کلیدش) را بداند؛ وگرنه حدس می‌زند و نتیجه خالی می‌شود. ایندکس مقدارها از
// sql/extract_values.sql ساخته می‌شود؛ فقط ستون‌های قابل نمایشِ جدول‌های مجاز کاربر جست‌وجو می‌شوند.
//   تطبیق کامل:  کل مقدار ذخیره‌شده (با مرز کلمه) در سوال آمده است
//   تطبیق جزئی:  عبارتی ۱ تا MAX_NGRAM کلمه‌ای از سوال داخل مقدارها آمده است؛ تک‌کلمه فقط اگر نادر باشد
const VALUE_STOPWORDS = new Set(['برای', 'این', 'آن', 'است', 'هست', 'بود', 'شده', 'چند', 'چه', 'کدام', 'جمع',
  'تعداد', 'مبلغ', 'سال', 'ماه', 'نام', 'اساس', 'تفکیک', 'نشان', 'بده', 'چقدر', 'همه', 'کنار', 'بیشترین', 'کمترین']);
const valueNorm = s => lexNorm(s).replace(/[؟?!.,،؛:;«»"'()\[\]{}\-_/\\]/g, ' ').replace(/\s+/g, ' ').trim();

// ستون‌های ایندکس که کاربر می‌تواند ببیند. همه مقدارها پشت هم در یک رشته («\n مقدار \n مقدار \n») تا
// جست‌وجوی هر کلمه سوال یک indexOf روی کل رشته باشد، و یک Map از فرم نرمال به مقدارها برای تطبیق کامل؛
// نه مقایسه تک‌تک مقدارها با تک‌تک عبارت‌ها (۱۰۰ هزار مقدار: حدود ۷۰ میلی‌ثانیه به‌جای ۱.۵ ثانیه).
// فرم نرمال‌شده هر مقدار را build-value-index.js از پیش می‌سازد (عضو چهارم، فقط وقتی با خود مقدار فرق دارد).
function buildValueLookup(valueIndexes, allowed) {
  const cols = [], entries = [], starts = [], segs = ['\n'], byNorm = new Map();
  let pos = 1;
  for (const idx of valueIndexes) {
    const prebuilt = Number(idx.formatVersion) >= 1;
    for (const c of idx.columns) {
      const ent = allowed.get(c.entity);
      if (!ent || !exposedColumns(ent).some(x => x.name === c.column)) continue;
      const col = { entity: c.entity, column: c.column, key: c.key || null,
                    distinct: c.distinct || (c.values || []).length, values: [] };
      cols.push(col);
      for (const [v, rows, key, n] of (c.values || [])) {
        const norm = n != null ? n : (prebuilt ? String(v).trim() : valueNorm(v));
        if (norm.length < CFG.VALUES.MIN_CHARS) continue;
        const e = { col, v: String(v), rows: rows || 0, key: key == null ? null : key, n: norm };
        col.values.push(e);
        entries.push(e);
        const same = byNorm.get(norm);
        if (same) same.push(e); else byNorm.set(norm, [e]);
        starts.push(pos);
        const seg = ' ' + norm + ' \n';
        segs.push(seg);
        pos += seg.length;
      }
    }
  }
  return { cols, entries, starts, text: segs.join(''), byNorm };
}

// اندیس مقداری که کاراکتر offset داخل آن است (جست‌وجوی دودویی روی starts)
function entryAt(lookup, offset) {
  let lo = 0, hi = lookup.starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lookup.starts[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// مقدارهایی که عبارت را به‌صورت کلمه کامل دارند (حداکثر limit تا)
function valuesContaining(lookup, phrase, limit) {
  const needle = ' ' + phrase + ' ';
  const out = new Set();
  let i = lookup.text.indexOf(needle);
  while (i !== -1 && out.size < limit) {
    out.add(entryAt(lookup, i));
    i = lookup.text.indexOf(needle, i + 1);
  }
  return [...out].map(k => lookup.entries[k]);
}

// [{ entity, column, key, exact, value, keyValue, phrase, count, samples }] - هر خط یک ستون/مقدار
function matchValues(question, lookup) {
  const V = CFG.VALUES;
  if (!lookup.entries.length) return [];
  const words = valueNorm(question).split(' ').filter(Boolean);
  // مقدارهایی که هر کلمه سوال را (کلمه کامل) دارند؛ کلمه «نادر» یعنی در حداکثر RARE_DF مقدار آمده.
  // تک‌کلمه پرتکرار («شرکت»، «فروش») به‌تنهایی تطبیق نمی‌خورد - نه کامل و نه جزئی.
  const hitsOf = new Map();
  for (const w of new Set(words)) {
    hitsOf.set(w, VALUE_STOPWORDS.has(w) ? null : valuesContaining(lookup, w, V.RARE_DF + 1));
  }
  const isRare = w => { const h = hitsOf.get(w); return Boolean(h) && h.length > 0 && h.length <= V.RARE_DF; };

  const exact = [], partial = [];
  const exactSet = new Set();
  for (let n = Math.min(8, words.length); n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const gram = words.slice(i, i + n);
      const p = gram.join(' ');
      if (p.length < V.MIN_CHARS) continue;
      // تطبیق کامل: کل مقدار برابر این عبارت سوال است
      if (n > 1 || isRare(p)) {
        for (const e of (lookup.byNorm.get(p) || [])) if (!exactSet.has(e)) { exactSet.add(e); exact.push(e); }
      }
      // تطبیق جزئی: عبارت داخل مقدارهاست؛ فقط عبارتی که حداقل یک کلمه نادر دارد (نامزدها از همان کلمه)
      // و جزئی از مقداری نیست که همین حالا کامل در سوال پیدا شد («دفتر فروش» در «دفتر فروش تهران» مصرف
      // شده و نباید «دفتر فروش تبریز» را هم بیاورد).
      if (n > V.MAX_NGRAM || partial.some(g => g.phrase === p)) continue;
      if (exact.some(e => (' ' + e.n + ' ').includes(' ' + p + ' '))) continue;
      const rare = gram.filter(isRare);
      if (!rare.length) continue;
      const needle = ' ' + p + ' ';
      const hits = [...new Set(rare.flatMap(w => hitsOf.get(w)))]
        .filter(e => !exactSet.has(e) && (' ' + e.n + ' ').includes(needle));
      if (hits.length) partial.push({ phrase: p, hits });
    }
  }
  const lines = [];
  const perValue = new Map();
  const perColumn = new Map();
  const take = (c, valueKey) => {
    const ck = c.entity + '|' + c.column;
    if ((perColumn.get(ck) || 0) >= V.PER_COLUMN) return false;
    if (valueKey && (perValue.get(valueKey) || 0) >= V.PER_VALUE) return false;
    perColumn.set(ck, (perColumn.get(ck) || 0) + 1);
    if (valueKey) perValue.set(valueKey, (perValue.get(valueKey) || 0) + 1);
    return true;
  };
  // کامل‌ها اول (طولانی‌تر بالاتر، جدول‌های کوچک‌تر/بُعدها جلوتر از factها، بعد پرتکرارتر)
  exact.sort((a, b) => b.n.length - a.n.length || a.col.distinct - b.col.distinct || b.rows - a.rows);
  for (const e of exact) {
    if (lines.length >= V.MAX_LINES) break;
    if (!take(e.col, e.n)) continue;
    lines.push({ entity: e.col.entity, column: e.col.column, key: e.col.key, exact: true, value: e.v, keyValue: e.key });
  }
  // جزئی‌ها: هر ستون/عبارت یک خط با چند نمونه؛ عبارت بلندتر و پوشش بیشتر مقدار بالاتر. عبارتی که
  // جزئی از عبارت بلندترِ پیدا‌شده در همان ستون است تکرار نمی‌شود.
  const groups = [];
  for (const g of partial) {
    const byCol = new Map();
    for (const e of g.hits) {
      if (!byCol.has(e.col)) byCol.set(e.col, []);
      byCol.get(e.col).push(e);
    }
    for (const [col, hits] of byCol) {
      if (groups.some(x => x.col === col && x.phrase.includes(g.phrase))) continue;
      hits.sort((a, b) => b.rows - a.rows);
      groups.push({ col, phrase: g.phrase, hits, cover: Math.max(...hits.map(e => g.phrase.length / e.n.length)) });
    }
  }
  groups.sort((a, b) => b.phrase.length - a.phrase.length || b.cover - a.cover || a.col.distinct - b.col.distinct);
  for (const g of groups) {
    if (lines.length >= V.MAX_LINES) break;
    if (!take(g.col, 'phrase:' + g.phrase)) continue;
    lines.push({ entity: g.col.entity, column: g.col.column, key: g.col.key, exact: false, phrase: g.phrase,
                 count: g.hits.length, samples: g.hits.slice(0, V.PER_COLUMN).map(e => e.v),
                 keyValue: g.hits.length === 1 ? g.hits[0].key : null });
  }
  return lines;
}

// نمونه مقدار برای ستون‌های کم‌تنوع (وضعیت، نوع، جنسیت...) در توضیح DDL: «entity|column» ← [مقدار]
function valueSamples(lookup) {
  const out = new Map();
  for (const c of lookup.cols) {
    if (c.distinct > CFG.VALUES.SAMPLE_MAX_DISTINCT) continue;
    out.set(c.entity + '|' + c.column, c.values.slice(0, CFG.VALUES.SAMPLE_COUNT).map(x => x.v));
  }
  return out;
}

// ---------- الگوهای جدول (patterns_fa): «۱۴۰۳»، «فروردین» ← Dim_Date ----------
// بعضی جدول‌ها با یک الگو پیدا می‌شوند نه با یک کلمه: «۱۴۰۳»، «فروردین»، «ماه گذشته» ← Dim_Date (تقویم شمسی).
// مثل مقدارها در سنجش اطمینان شمرده نمی‌شود: تقویم به‌تنهایی دلیل قابل‌پاسخ بودن نیست («تورم سال گذشته»).
function patternHits(allowed, question) {
  const q = norm(question);
  const hits = new Set();
  for (const ent of allowed.values()) {
    for (const p of (ent.patterns_fa || [])) {
      let re;
      try { re = new RegExp(p); } catch (e) { continue; }
      if (re.test(q)) { hits.add(ent.name); break; }
    }
  }
  return hits;
}

// ==================== شواهد هر جدول ← ویژگی‌های مدل ====================
// برای هر جدول مجاز یک ردیف: { ent, x: { ویژگی: عدد }, hits: [دلیل به زبان ساده], sim }
// همین تابع هم در اجرا و هم در یادگیری (scripts/train-retrieval.js) استفاده می‌شود، پس مدل دقیقاً با همان
// عددهایی یاد می‌گیرد که بعداً می‌بیند.
function evidenceRows({ allowed, catalogs, question, lexical, metrics, valueLines, patterns, semantic, rerankScores }) {
  const metricTables = new Set(metrics.flatMap(h => h.entities));
  const exact = new Set(valueLines.filter(l => l.exact).map(l => l.entity));
  const partial = new Set(valueLines.filter(l => !l.exact).map(l => l.entity));
  const rows = [...allowed.values()].map(ent => {
    const lex = lexical.get(ent.name) || { identity: 0, columns: 0, description: 0, hits: [] };
    const sem = semantic.get(ent.name);
    const x = {
      identity: lex.identity + lex.columns, description: lex.description,
      metric: metricTables.has(ent.name) ? 1 : 0,
      value_exact: exact.has(ent.name) ? 1 : 0,
      value_partial: partial.has(ent.name) ? 1 : 0,
      pattern: patterns.has(ent.name) ? 1 : 0,
      core: ent.core ? 1 : 0,
      meaning_table: sem ? sem.meaning_table : 0,
      meaning_columns: sem ? sem.meaning_columns : 0,
      rerank: rerankScores && rerankScores.has(ent.name) ? rerankScores.get(ent.name) : 0,
    };
    return { ent, x, hits: lex.hits, sim: sem ? sem.sim : null };
  });
  // نسبت به بهترین جدول همین سوال (۰ تا ۱)، و بهترین تطبیق نام/مترادف در حوزه هر جدول
  const best = f => Math.max(0, ...rows.map(r => r.x[f]));
  for (const f of ['identity', 'description']) {
    const m = best(f);
    for (const r of rows) r.x[f + '_rel'] = m > 0 ? r.x[f] / m : 0;
  }
  const domainBest = new Map();
  for (const r of rows) {
    const d = r.ent._catalog;
    domainBest.set(d, Math.max(domainBest.get(d) || 0, r.x.identity_rel));
  }
  for (const r of rows) r.x.domain_match = r.ent._catalog.shared ? 0 : domainBest.get(r.ent._catalog);
  return rows;
}

// سیگنال‌هایی که برای این سوال واقعاً هست (lexical همیشه)
function availableSignals(semantic, rerankScores) {
  const s = new Set(['lexical']);
  if (semantic.size) s.add('semantic');
  if (rerankScores && rerankScores.size) s.add('rerank');
  return s;
}

// جدول‌هایی که قاعده‌ای صریح از کاتالوگ لازمشان می‌داند: الگو، مقدار کامل، فرمول معیار نام‌برده (بالا را ببینید)
function ruleTables(rows) {
  return new Set(rows.filter(r => r.x.pattern || r.x.value_exact || r.x.metric).map(r => r.ent.name));
}

// [{ ent, score: احتمال، pConfidence، contrib، hits، sim }] مرتب از محتمل‌ترین
function scoreTables(rows, model) {
  return rows.map(r => Object.assign({ ent: r.ent, hits: r.hits, sim: r.sim, x: r.x }, (({ p, pConfidence, contrib }) =>
    ({ score: p, pConfidence, contrib }))(score(model, r.x))))
    .sort((a, b) => b.score - a.score || a.ent.name.localeCompare(b.ent.name));
}

const share = (s, features) => features.reduce((a, f) => a + ((s.contrib || {})[f] || 0), 0);

// ==================== مرحله ۵. حوزه‌ها: نزدیک به بهترین حوزه همین سوال ====================
// هر کاتالوگ غیرمشترک یک حوزه است (فروش، خرید، ...). امتیاز حوزه = بیشترین احتمال جدول‌های مجاز آن. فعال:
// حوزه‌هایی که امتیازشان حداقل domainRatio برابرِ بهترین حوزه است (و ≥ آستانه انتخاب)، یا یک جدول قاعده دارند،
// حداکثر maxDomains تا (یادگرفته‌شده). نسبی است چون حوزه دوم سوال ترکیبی (فروش + خرید) و حوزه بی‌ربط را فقط مقایسه با
// بهترین حوزه همان سوال از هم جدا می‌کند؛ مقدار نسبت از داده یاد گرفته می‌شود. با اطمینان
// پایین فقط بهترین آن‌ها تا schema کوچک بماند و قانون NOT_SUPPORTED در prompt فعال شود.
// کاتالوگ‌های shared (common.json) در رقابت نیستند و موجودیت‌هایشان همیشه قابل انتخاب‌اند.
function selectDomains(scored, lowConfidence, threshold, ratio, maxDomains, ruled) {
  const domainScore = new Map();
  const ruledDomains = new Set();
  for (const s of scored) {
    const cat = s.ent._catalog;
    if (cat.shared) continue;
    if (!domainScore.has(cat) || s.score > domainScore.get(cat)) domainScore.set(cat, s.score);
    if (ruled.has(s.ent.name)) ruledDomains.add(cat);
  }
  const ranked = [...domainScore.entries()].sort((a, b) => b[1] - a[1]);
  const best = ranked.length ? ranked[0][1] : 0;
  // نسبت به بهترین حوزه همین سوال (ratio یادگرفته‌شده) و حداقل آستانه انتخاب؛ حوزه جدولی که قاعده آورده (معیار،
  // مقدار کامل، الگو) همیشه واجد شرایط است
  const qualified = ranked.filter(([cat, p]) => (p >= threshold && p >= ratio * best) || ruledDomains.has(cat));
  const active = new Set((lowConfidence ? qualified.slice(0, 1) : qualified.slice(0, maxDomains)).map(([cat]) => cat));
  return {
    ranked,
    active,
    activeCatalogs: ranked.map(([c]) => c).filter(c => active.has(c)),
    eligible: ent => ent._catalog.shared === true || active.has(ent._catalog)
  };
}

// ==================== مرحله ۶. جدول‌ها: بالای آستانه + core + بُعدهایی که به آن‌ها ارجاع دارند ====================
// عمداً «اگر هیچ‌چیز انتخاب نشد، ۳ موجودیت برتر را در هر صورت اضافه کن» نداریم: آن fallback
// باعث می‌شد وقتی سوال واقعاً چیزی خارج از کاتالوگ می‌خواهد، مدل به‌جای اعلام «پشتیبانی
// نمی‌شود» یک جدول نامرتبط را جایگزین کند و SQL قابل‌اجرا اما غلط بسازد.
//
// بستار روابط: هر join در کاتالوگ از ستون ارجاع‌دهنده (from) به کلید جدول مقصد (to) است. فقط
// در همین جهت پیش می‌رویم: جدول انتخاب‌شده، جدول‌های بُعدی را که به آن‌ها ارجاع می‌دهد با خود
// می‌آورد. جهت برعکس (هر جدولی که به یک بُعد انتخاب‌شده ارجاع می‌دهد) قبلاً با انتخاب مثلاً
// Dim_Unit پانزده جدول fact را وارد می‌کرد.
function selectEntities(scored, allowed, domains, joins, threshold, ruled) {
  const selected = new Set(
    scored.filter(s => (s.score >= threshold || ruled.has(s.ent.name)) && domains.eligible(s.ent)).map(s => s.ent.name)
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

// ---------- مرحله ۷-ب. جدول واسط بین دو جدولی که مستقیم به هم وصل نیستند (مسیر join) ----------
// بستار بالا فقط «جدول ← بُعدی که به آن ارجاع می‌دهد» را می‌آورد. اگر سوال دو جدول را بخواهد
// که مستقیم به هم وصل نیستند (مثلاً «کالاهایی که رسیدشان نهایی شده ولی فاکتورشان باز است»:
// Dim_InventoryVoucherState و Dim_InvoiceState فقط از طریق Procurement_Fact_Inventory به هم
// می‌رسند)، جدول واسط فقط وقتی به prompt می‌رسید که خودش هم به سوال بخورد. اینجا هر جدولی که
// قویاً به سوال خورده با کوتاه‌ترین مسیر معتبر روی گراف joinها به بهترین جدول وصل می‌شود و
// جدول‌های واسطی که هنوز در prompt نیستند اضافه می‌شوند.
//
// مسیر معتبر: هیچ جدول واسطی نباید فقط «مقصد» هر دو رابطه‌اش باشد (A → D ← B). دو جدولی که هر
// دو به یک بُعد ارجاع می‌دهند از طریق آن بُعد join معتبری ندارند (ضرب ردیف‌ها، fan trap)؛ مدل باید
// جداگانه جمع بزند و آن بُعد را بستار خودش آورده است. واسط معتبر به حداقل یکی از دو طرفش ارجاع
// می‌دهد: A ← B → C (جدول پیوند یا fact مشترک) یا A → B → C (زنجیره بُعدها).
function joinGraph(joins, usable) {
  const g = new Map(); // نام ← Map(همسایه ← { out: این جدول به همسایه ارجاع می‌دهد, in: برعکس })
  const link = (a, b, dir) => {
    if (!g.has(a)) g.set(a, new Map());
    const e = g.get(a).get(b) || { out: false, in: false };
    e[dir] = true;
    g.get(a).set(b, e);
  };
  for (const j of joins) {
    if (j.from === j.to || !usable(j.from) || !usable(j.to)) continue;
    link(j.from, j.to, 'out');
    link(j.to, j.from, 'in');
  }
  return g;
}

// بهترین مسیر معتبر (کامل، از ابتدا تا انتها) از یکی از جدول‌های from تا target با حداکثر
// JOIN_PATH.MAX_HOPS واسط. بهترین = کمترین جدول واسطِ تازه (خارج از selected)، بعد کوتاه‌تر،
// بعد امتیاز بیشتر واسط‌ها، بعد ترتیب نام (تا خروجی همیشه یکسان باشد).
function bestJoinPath(from, target, selected, g, scoreOf) {
  const notCollider = (prev, mid, next) => g.get(mid).get(prev).out || g.get(mid).get(next).out;
  const found = [];
  let frontier = [...from].filter(n => g.has(n)).map(n => [n]);
  for (let hops = 0; hops <= CFG.JOIN_PATH.MAX_HOPS && frontier.length; hops++) {
    const next = [];
    for (const path of frontier) {
      const last = path[path.length - 1];
      for (const n of g.get(last).keys()) {
        if (path.includes(n)) continue;
        if (path.length > 1 && !notCollider(path[path.length - 2], last, n)) continue;
        if (n === target) found.push([...path, n]);
        else if (!from.has(n)) next.push([...path, n]);
      }
    }
    frontier = next;
  }
  if (!found.length) return null;
  const mids  = p => p.slice(1, -1);
  const fresh = p => mids(p).filter(n => !selected.has(n)).length;
  const value = p => mids(p).reduce((a, n) => a + scoreOf(n), 0);
  found.sort((a, b) => fresh(a) - fresh(b) || a.length - b.length || value(b) - value(a)
    || a.join().localeCompare(b.join()));
  return found[0];
}

// جدول‌های قوی (احتمال ≥ آستانه joinPath مدل) به ترتیب احتمال به مجموعه‌ای که از محتمل‌ترین جدول
// شروع می‌شود وصل می‌شوند. جدولی که مسیر معتبری ندارد (مثلاً دو fact که فقط بُعد مشترک دارند)
// تنها می‌ماند و چیزی اضافه نمی‌شود.
// خروجی: [{ name, rank, path }] - rank جای جدول واسط در ترتیب بودجه است (درست بعد از جدولی که
// به خاطرش آمده)، تا با پر شدن بودجه پیش از جدول‌های کم‌امتیاز حذف نشود.
function completeJoinPaths(scored, selected, allowed, domains, joins, strongAt) {
  const usable = n => allowed.has(n) && domains.eligible(allowed.get(n));
  const g = joinGraph(joins, usable);
  const strong = scored.filter(s => s.score >= strongAt && selected.has(s.ent.name) && g.has(s.ent.name));
  const scoreByName = new Map(scored.map(s => [s.ent.name, s.score]));
  const scoreOf = n => scoreByName.get(n) || 0;
  const members = new Set(selected);
  const bridges = [];
  if (strong.length < 2) return bridges;

  const linked = new Set([strong[0].ent.name]);
  for (const s of strong.slice(1)) {
    const path = bestJoinPath(linked, s.ent.name, members, g, scoreOf);
    if (!path) continue;
    const fresh = path.slice(1, -1).filter(n => !members.has(n));
    if (bridges.length + fresh.length > CFG.JOIN_PATH.MAX_TABLES) continue;
    fresh.forEach((n, i) => {
      members.add(n);
      bridges.push({ name: n, rank: s.score - (i + 1) * 1e-6, path });
    });
    path.forEach(n => linked.add(n));
  }
  return bridges;
}

// ---------- راهنماهای حوزه (DOMAIN NOTES) - فقط از حوزه‌های فعال ----------
// راهنما یا یک رشته است (برای کل حوزه) یا {text, entities} که فقط وقتی یکی از آن
// موجودیت‌ها در schema نهایی باشد فرستاده می‌شود.
function collectGuidance(activeCatalogs, catalogs) {
  return {
    domainHints: activeCatalogs.flatMap(c => (c.hints_fa || []).filter(h => typeof h === 'string')),
    scopedHints: catalogs.flatMap(c => (c.hints_fa || []).filter(h => h && typeof h === 'object'))
  };
}

// ==================== مرحله ۷. مثال‌های مشابه سوال (few-shot) ====================
// DAIL-SQL (Gao و همکاران، VLDB 2024): مثال‌هایی که به خود سوال شبیه‌اند خیلی بهتر از مثال‌های
// ثابت کار می‌کنند. قبلاً سه مثال اولِ حوزه‌های فعال فرستاده می‌شد، بی‌ربط به سوال. حالا همه مثال‌های
// کاتالوگ‌ها و بانک کوئری (catalog/query_bank.json) رتبه می‌گیرند: شباهت embedding سوال با سوال مثال
// (اگر بردار هر دو باشد) + کلمات مشترک. فقط مثالی فرستاده می‌شود که همه جدول‌هایش برای کاربر مجاز
// است (مثال نباید schema حوزه دیگری را نشان دهد) و در schema نهایی prompt هست (تا مدل به جدولی که
// نمی‌بیند ارجاع ندهد و Security آن را رد نکند).
const exampleTokens = s => new Set(lexNorm(s).replace(/[؟?!.,،؛:;«»"'()\[\]]/g, ' ').split(' ').filter(t => t.length >= 2));
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// نام موجودیت‌هایی که SQL مثال می‌خواند (FROM/JOIN)؛ همان قاعده scripts/lib/query-bank.js
function exampleEntities(sql) {
  const out = [];
  const re = /\b(?:from|join)\s+(\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)/gi;
  let m;
  while ((m = re.exec(String(sql))) !== null) {
    const name = m[1].replace(/^\[|\]$/g, '');
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

function examplePool(catalogs, banks) {
  const pool = [];
  for (const c of catalogs) (c.examples || []).forEach((ex, i) => pool.push({ id: `${c.domain}#${i + 1}`, q: ex.q, sql: ex.sql }));
  for (const b of banks) for (const ex of b.examples) pool.push({ id: ex.id, q: ex.q, sql: ex.sql, status: ex.status });
  return pool.filter(ex => ex && typeof ex.q === 'string' && ex.q.trim() && typeof ex.sql === 'string');
}

// [{ ex, entities, sem, lex, score }] مرتب از مشابه‌ترین؛ فقط مثال‌هایی که همه جدول‌هایشان مجاز است.
function rankExamples(pool, { question, questionEmbedding, exampleVectors, allowed }) {
  const byLower = new Map([...allowed.keys()].map(n => [n.toLowerCase(), n]));
  const qTokens = exampleTokens(question);
  const ranked = [];
  for (const ex of pool) {
    const refs = exampleEntities(ex.sql);
    const entities = refs.map(n => byLower.get(n.toLowerCase()));
    if (!refs.length || entities.some(n => !n)) continue;
    const vec = questionEmbedding && exampleVectors.get(ex.q);
    const sem = vec ? cosineSim(questionEmbedding, vec) : null;
    const lex = jaccard(qTokens, exampleTokens(ex.q));
    const score = (sem === null ? 0 : sem * CFG.EXAMPLES.SEMANTIC_WEIGHT) + lex * CFG.EXAMPLES.LEXICAL_WEIGHT;
    ranked.push({ ex, entities, sem, lex, score });
  }
  ranked.sort((a, b) => b.score - a.score
    || (b.ex.status === 'verified') - (a.ex.status === 'verified')
    || a.ex.id.localeCompare(b.ex.id));
  // یک SQL با چند صورت سؤال: فقط مشابه‌ترین صورت می‌ماند (بعد از رتبه‌بندی، نه به ترتیب فایل)
  const seenSql = new Set();
  return ranked.filter(r => {
    const key = r.ex.sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (seenSql.has(key)) return false;
    seenSql.add(key);
    return true;
  });
}

// مثالی که معنایی خیلی نزدیک به سوال است (LINK_MIN_SIM) معمولاً همان پرسش با کلمات دیگر است؛ جدول‌هایش
// را هم می‌آوریم تا اگر کلیدواژه‌ها جدولی را جا انداخته‌اند جبران شود. فقط جدول‌های حوزه‌های فعال یا مشترک.
// خروجی: [{ name, rank, example }] - rank مثل جدول‌های واسط مسیر join، جای جدول در ترتیب بودجه است.
function linkExampleTables(ranked, selected, domains, allowed, scoreOf, threshold) {
  const added = [];
  for (const r of ranked.filter(x => x.sem !== null && x.sem >= CFG.EXAMPLES.LINK_MIN_SIM).slice(0, CFG.EXAMPLES.LINK_MAX)) {
    if (!r.entities.every(n => domains.eligible(allowed.get(n)))) continue;
    const anchor = Math.max(threshold, ...r.entities.map(scoreOf));
    r.entities.filter(n => !selected.has(n)).forEach((n, i) => {
      selected.add(n);
      added.push({ name: n, rank: anchor - (i + 1) * 1e-6, example: r.ex.id });
    });
  }
  return added;
}

// تا EXAMPLES.MAX مثال که همه جدول‌هایشان در مجموعه انتخاب‌شده است؛ بعد از بستن بودجه دوباره با
// schema نهایی فیلتر می‌شوند (packPrompt در نود BuildPrompt).
function chooseExamples(ranked, names) {
  return ranked.filter(r => r.entities.every(n => names.has(n))).slice(0, CFG.EXAMPLES.MAX);
}

// ==================== چرا هر جدول در طرح آمده؟ ====================
// دلیل‌ها به زبان ساده، برای لاگ WHY و یادداشت Obsidian؛ «معنا» و «reranker» فقط وقتی که احتمال جدول را بالا برده‌اند.
function explainTables(order, { scored, metrics, valueLines, bridges, linked, domains, joins }) {
  const byName = new Map(scored.map(x => [x.ent.name, x]));
  const why = {};
  for (const name of order) {
    const s = byName.get(name) || {};
    const r = [...(s.hits || [])];
    if (share(s, ['meaning_table', 'meaning_columns']) > 0) r.push('معنای نزدیک به سوال');
    if (share(s, ['rerank']) > 0) r.push('تأیید reranker');
    for (const h of metrics) if (h.entities.includes(name)) r.push(`معیار «${h.m.name_fa}»`);
    for (const l of valueLines) if (l.entity === name) r.push(`مقدار «${l.exact ? l.value : l.phrase}»`);
    if (s.x && s.x.pattern) r.push('تاریخ یا سال شمسی در سوال');
    if (s.ent && s.ent.core && domains.active.has(s.ent._catalog)) r.push(`جدول اصلی حوزه ${s.ent._catalog.domain}`);
    const bridge = bridges.find(b => b.name === name);
    if (bridge) r.push(`واسط بین ${bridge.path[0]} و ${bridge.path[bridge.path.length - 1]}`);
    const link = linked.find(l => l.name === name);
    if (link) r.push(`جدولِ مثال مشابه ${link.example}`);
    if (!r.length) {
      const from = joins.find(j => j.to === name && j.from !== name && order.includes(j.from));
      r.push(from ? `بُعدِ ${from.from}` : 'برای تکمیل');
    }
    why[name] = [...new Set(r)];
  }
  return why;
}

// ==================== اجرای مراحل به ترتیب ====================
// جدول برای prompt: فقط ستون‌های قابل نمایش، با نمونه مقدار برای ستون‌های کم‌تنوع (از ایندکس مقدارها)
function tableForPrompt(ent, samples) {
  return {
    name: ent.name,
    kind: ent.kind || 'table',
    source: ent.source || null,
    sql: ent.sql || null,
    description_fa: ent.description_fa || '',
    columns: exposedColumns(ent).map(c => ({
      name: c.name,
      alias: c.alias || null,
      type: c.type || 'nvarchar',
      description_fa: c.description_fa || '',
      samples: samples.get(ent.name + '|' + c.name) || null
    }))
  };
}

// ۱ تا ۲: دسترسی و شواهد. هم findTables و هم یادگیری مدل (scripts/train-retrieval.js) و انتخاب نامزدهای
// reranker از همین استفاده می‌کنند. rerankScores (اختیاری): Map نام جدول ← امتیاز reranker.
function tableEvidence(input, log = () => {}) {
  const parsed = parseCatalogInputs(input.items);
  const { catalogs, entityVectors, valueIndexes } = parsed;
  const question = String(input.question == null ? '' : input.question).trim().slice(0, CFG.MAX_QUESTION_CHARS);
  if (!question) throw new Error('⛔ سوالی دریافت نشد.');
  const allowed = resolveAccess(catalogs, input.groups || [], entityVectors, log);
  if (allowed.size === 0) {
    log('ACCESS DENIED | ' + input.email + ' | groups: ' + ((input.groups || []).join(', ') || 'none'));
    throw new Error('⛔ شما دسترسی به این سامانه را ندارید.\n\nبرای درخواست دسترسی با واحد فناوری اطلاعات تماس بگیرید.');
  }
  const metrics = matchMetrics(catalogs, allowed, question);
  const lookup = buildValueLookup(valueIndexes, allowed);
  const valueLines = matchValues(question, lookup);
  const semantic = semanticFeatures(catalogs, entityVectors, input.questionEmbedding);
  const rows = evidenceRows({
    allowed, catalogs, question, metrics, valueLines, semantic,
    lexical: lexicalEvidence(lexicalIndexFor(catalogs), question),
    patterns: patternHits(allowed, question),
    rerankScores: input.rerankScores || null,
  });
  return { parsed, question, allowed, metrics, lookup, valueLines, rows,
           signals: availableSignals(semantic, input.rerankScores) };
}

function modelFor(modelFile, signals) {
  const model = chooseModel(modelFile, signals);
  if (!model) throw new Error('retrieval model has no keyword-only model: run node scripts/train-retrieval.js');
  return model;
}

// جدول‌هایی که به reranker داده می‌شوند: محتمل‌ترین‌ها با بهترین مدلِ بدون reranker، همراه متن کارتشان
function rerankCandidates(input, cardOf) {
  const ev = tableEvidence(Object.assign({}, input, { rerankScores: null }));
  const signals = new Set([...ev.signals].filter(s => s !== 'rerank'));
  return scoreTables(ev.rows, modelFor(ev.parsed.modelFile, signals)).slice(0, CFG.RERANK_CANDIDATES)
    .map(s => ({ name: s.ent.name, text: cardOf(s.ent) }));
}

function findTables(input, log) {
  // ۱ و ۲. دسترسی و شواهد
  const ev = tableEvidence(input, log);
  const { parsed, question, allowed, metrics, lookup, valueLines } = ev;
  const { catalogs, banks, exampleVectors, rules } = parsed;
  const { questionEmbedding } = input;
  if (metrics.length) log('METRICS | ' + metrics.map(h => h.m.name_fa).join(' | '));
  if (valueLines.length) log('VALUES | ' + valueLines.map(l => `${l.entity}.${l.column}`
    + (l.exact ? `=${l.value}` : ` ~${l.phrase} (${l.count})`)).join(' | '));

  // ۳. احتمال هر جدول با مدل یادگرفته‌شده
  const model = modelFor(parsed.modelFile, ev.signals);
  const { select, confident } = model.thresholds;
  const joinPath = model.thresholds.joinPath == null ? select : model.thresholds.joinPath;
  const domainRatio = model.thresholds.domainRatio == null ? 0 : model.thresholds.domainRatio;
  const maxDomains = model.thresholds.maxDomains == null ? Infinity : model.thresholds.maxDomains;
  const scored = scoreTables(ev.rows, model);
  log('MODEL | ' + model.signals.join('+') + ` | select ≥ ${select.toFixed(3)} | domain ≥ ${domainRatio.toFixed(2)} × best`
    + ` (at most ${maxDomains}) | join path ≥ ${joinPath.toFixed(3)} | confident ≥ ${confident.toFixed(3)}`);
  const ruled = ruleTables(ev.rows);
  if (ruled.size) log('RULES | ' + [...ruled].join(', '));
  log('SCORES | ' + scored.slice(0, 8).map(s => `${s.ent.name}=${s.score.toFixed(3)}`).join(' | '));

  // ۴. اطمینان: بیشترین احتمال بدون مقدارها؛ معیاری که نامش در سوال آمده یعنی سوال درباره داده‌های ماست
  const topScore      = scored.reduce((m, s) => Math.max(m, s.pConfidence), 0);
  const lowConfidence = topScore < confident && !metrics.length;

  // ۵. حوزه‌ها
  const domains = selectDomains(scored, lowConfidence, select, domainRatio, maxDomains, ruled);
  log('DOMAINS | ' + domains.ranked
    .map(([c, sc]) => `${c.domain}=${sc.toFixed(3)}${domains.active.has(c) ? '*' : ''}`)
    .join(' | '));

  // ۶. جدول‌ها
  const joins    = catalogs.flatMap(c => c.joins || []);
  const selected = selectEntities(scored, allowed, domains, joins, select, ruled);
  const bridges  = completeJoinPaths(scored, selected, allowed, domains, joins, joinPath);
  bridges.forEach(b => selected.add(b.name));
  if (bridges.length) log('JOIN PATH | ' + [...new Set(bridges.map(b => b.path.join(' - ')))].join(' | '));
  if (lowConfidence) log('LOW CONFIDENCE | topP=' + topScore.toFixed(3) + ' | question=' + question.slice(0, 120));

  // جدول قاعده در ترتیب بودجه هم‌ردیف محتمل‌ترین جدول است (BuildPrompt از بالای فهرست برمی‌دارد)
  const top = scored.length ? scored[0].score : 0;
  const scoreByName = new Map(scored.map(s => [s.ent.name, ruled.has(s.ent.name) ? Math.max(s.score, top) : s.score]));
  bridges.forEach(b => scoreByName.set(b.name, Math.max(scoreByName.get(b.name) || 0, b.rank)));

  // ۷. مثال‌ها (مثالی که تقریباً عین سوال است جدول‌هایش را هم می‌آورد)
  const rankedExamples = rankExamples(examplePool(catalogs, banks),
    { question, questionEmbedding, exampleVectors, allowed });
  const linked = linkExampleTables(rankedExamples, selected, domains, allowed, n => scoreByName.get(n) || 0, select);
  linked.forEach(l => scoreByName.set(l.name, Math.max(scoreByName.get(l.name) || 0, l.rank)));
  if (linked.length) log('EXAMPLE LINK | ' + linked.map(l => `${l.name} (from ${l.example})`).join(' | '));

  // طرح برای BuildPrompt: جدول‌ها به ترتیب احتمال، و فقط آنچه به همین جدول‌ها مربوط است
  const order = [...selected].sort((a, b) => (scoreByName.get(b) || 0) - (scoreByName.get(a) || 0) || a.localeCompare(b));
  const inPlan = new Set(order);
  const why = explainTables(order, { scored, metrics, valueLines, bridges, linked, domains, joins });
  log('WHY | ' + order.slice(0, 6).map(n => `${n}: ${why[n].join('، ')}`).join(' | '));
  const samples = valueSamples(lookup);
  const guidance = collectGuidance(domains.activeCatalogs, catalogs);
  const r3 = x => Math.round(x * 1000) / 1000;
  return {
    question,
    lowConfidence,
    tables: order.map(n => tableForPrompt(allowed.get(n), samples)),
    joins: joins.filter(j => inPlan.has(j.from) && inPlan.has(j.to)),
    hints: {
      domain: guidance.domainHints,
      scoped: guidance.scopedHints.filter(h => (h.entities || []).some(n => inPlan.has(n)))
    },
    rules,
    examples: chooseExamples(rankedExamples, selected)
      .map(r => ({ id: r.ex.id, q: r.ex.q, sql: r.ex.sql, entities: r.entities, sem: r.sem, lex: r.lex })),
    values: valueLines,
    metrics: metrics.map(h => ({ name_fa: h.m.name_fa, sql: h.m.sql, filter: h.m.filter || '',
                                  note_fa: h.m.note_fa || '', entities: h.entities })),
    retrieval: {
      topScore,
      lowConfidence,
      semanticUsed: Boolean(questionEmbedding) && model.signals.includes('semantic'),
      model: { signals: model.signals, thresholds: model.thresholds },
      ruleTables: [...ruled],
      activeDomains: domains.activeCatalogs.map(c => c.domain),
      joinPathTables: bridges.map(b => b.name),
      exampleLinkedTables: linked.map(l => l.name),
      why,
      // score = احتمال؛ lex/sem/met/val/pat/rerank = سهم هر نوع شاهد در log-odds (مثبت یعنی احتمال را بالا برد)
      scores: scored.slice(0, 8).map(s => ({ entity: s.ent.name, score: r3(s.score),
        lex: r3(share(s, ['identity', 'description'])), sem: r3(share(s, ['meaning_table', 'meaning_columns'])),
        sim: s.sim === null ? null : r3(s.sim), met: r3(share(s, ['metric'])), val: r3(share(s, ['value_exact', 'value_partial'])),
        pat: r3(share(s, ['pattern'])), rerank: r3(share(s, ['rerank'])) }))
    }
  };
}

module.exports = { findTables, tableEvidence, rerankCandidates, scoreTables, extractEmbeddingVector, CFG };
