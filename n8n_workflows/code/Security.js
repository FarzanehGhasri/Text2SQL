// ===== لایه امنیتی: استخراج SQL از پاسخ مدل، بررسی آن و ساخت کوئری نهایی =====
//
// ساختار (SOLID):
//   ۰. سیاست (POLICY)          - فهرست‌ها و عددهای امنیتی به‌صورت داده، جدا از منطق
//   ۱. آداپتر n8n (ورودی)      - تنها جایی که $input و $('...') خوانده می‌شود (DIP)
//   ۲. مراحل خالص              - هر مرحله یک مسئولیت (SRP): خواندن پاسخ، جدا کردن SQL،
//                                بررسی فقط-خواندنی، سقف ردیف، بررسی ارجاع‌ها، ساخت CTE
//   ۳. ترکیب (secure)          - ترتیب مراحل
//   ۴. آداپتر n8n (خروجی)      - قرارداد خروجی که Route by Attempt، execute query،
//                                Build Fix Prompt و نودهای نتیجه/لاگ می‌خوانند
// هر مرحله با throw یک Error که با ⛔ شروع می‌شود کوئری را رد می‌کند (خروجی خطا → ErrorFormat).

// ==================== ۰. سیاست ====================
const POLICY = {
  ROW_CAP: 200,                // سقف ردیف اجباری برای هر کوئری
  RESPONSE_KEYS: ['result', 'response', 'answer', 'text', 'output', 'message', 'content'],
  THINK_KEYS:    ['thinking', 'reasoning', 'reasoning_content', 'thoughts'],
  BLOCKED: [
    /\binsert\b/i, /\bupdate\b/i, /\bdelete\b/i, /\bdrop\b/i,
    /\btruncate\b/i, /\balter\b/i, /\bcreate\b/i, /\bmerge\b/i,
    /\bexec\b/i, /\bexecute\b/i, /\bgrant\b/i, /\brevoke\b/i,
    /\bbackup\b/i, /\brestore\b/i, /\bshutdown\b/i, /\bwaitfor\b/i,
    /\binto\b/i, /\bxp_\w+/i, /\bsp_\w+/i, /openrowset/i, /opendatasource/i,
    // اصلاح امنیتی ۴: DBCC می‌تواند دستورات مدیریتی/DoS اجرا کند؛
    // APPLY می‌تواند توابع دلخواه (خارج از کاتالوگ) را صدا بزند - هر دو مسدود می‌شوند
    /\bdbcc\b/i, /\bapply\b/i, /\bopenxml\b/i
  ],
  FORBIDDEN_TOKENS: [';', '--', '/*']
};

// ==================== ۱. آداپتر n8n: ورودی ====================
function readN8nInputs() {
  // شماره تلاش: آیا این اجرای دوباره بعد از خطای SQL است؟ همان الگوی موجود در این ورک‌فلو
  // (تشخیص با وجود/عدم وجود یک نود که فقط در مسیر retry اجرا می‌شود) - Build Fix Prompt
  // فقط بعد از شکست اجرای کوئری اول اجرا می‌شود.
  let attempt = 1;
  try { $('Build Fix Prompt').first(); attempt = 2; } catch (e) { attempt = 1; }
  return {
    res: $input.first().json,
    // entityDefs فقط وقتی لازم است که پاسخ مدل تا مرحله بررسی ارجاع‌ها برسد
    getEntityDefs: () => $('BuildPrompt').first().json.entityDefs || {},
    attempt
  };
}

// ==================== ۲. مراحل خالص ====================
const reject = msg => { throw new Error(msg); };

// ---------- ۲-۱. استخراج متن پاسخ از API ----------
function extractResponseText(res) {
  let raw = '';
  if (typeof res === 'string') {
    raw = res;
  } else {
    for (const k of POLICY.RESPONSE_KEYS) {
      if (typeof res[k] === 'string' && res[k].trim()) { raw = res[k]; break; }
    }
    if (!raw) {
      const s = Object.values(res).find(v => typeof v === 'string' && v.trim().length > 5);
      if (s) raw = s;
    }
  }
  if (!raw) reject('⛔ ساختار پاسخ API شناخته نشد: ' + JSON.stringify(res).slice(0, 300));
  return raw;
}

// ---------- ۲-۲. جدا کردن reasoning/thinking و پاکت UNDERSTOOD: ... / PLAN: ... / SQL: ... ----------
// thinking برای نمایش در OpenWebUI نگه داشته می‌شود؛ PLAN (برنامه کوئری که مدل پیش از SQL می‌نویسد)
// هم جداگانه برگردانده می‌شود و هم جزء thinking نمایش داده می‌شود. متن PLAN هرگز به‌عنوان SQL خوانده
// نمی‌شود، حتی اگر مدل برچسب SQL: را جا بیندازد (کلمه with یا select در PLAN).
function parseEnvelope(res, text) {
  let raw = text;
  let thinking = '';
  if (typeof res === 'object' && res) {
    for (const k of POLICY.THINK_KEYS) {
      if (typeof res[k] === 'string' && res[k].trim()) { thinking += res[k].trim() + '\n'; break; }
    }
  }
  const thinkTag = raw.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkTag) {
    thinking += thinkTag[1].trim();
    raw = raw.replace(thinkTag[0], '').trim();
  }

  let understood = '';
  const understoodMatch = raw.match(/UNDERSTOOD:\s*(.+)/i);
  if (understoodMatch) understood = understoodMatch[1].split(/\b(?:PLAN|SQL)\s*:/i)[0].trim();

  // برچسب SQL: که سر خط آمده (با ** یا # احتمالی مارک‌داون)؛ نه کلمه SQL داخل متن PLAN. اگر PLAN
  // نیست، برچسب وسط خط هم قبول است («UNDERSTOOD: ... SQL: SELECT ...» در یک خط، شکل قدیمی پاسخ).
  const hasPlan = /(^|\n)[ \t>*#]*PLAN[ \t*]*:/i.test(raw);
  const sqlLabel = /(^|\n)[ \t>*#]*SQL[ \t*]*:[ \t*]*/i.exec(raw) || (hasPlan ? null : /()\bSQL\s*:\s*/i.exec(raw));
  const sqlMarker = sqlLabel ? sqlLabel.index + sqlLabel[1].length : -1;
  let plan = '';
  const before = sqlMarker !== -1 ? raw.slice(0, sqlMarker) : raw;
  const planMatch = before.match(/(^|\n)[ \t>*#]*PLAN[ \t*]*:[ \t*]*([\s\S]*)$/i);
  if (planMatch) plan = planMatch[2].trim();

  if (sqlMarker !== -1) {
    const leftover = before.replace(/UNDERSTOOD:.*$/im, '').trim();
    if (leftover) thinking = (thinking ? thinking + '\n' : '') + leftover;
    raw = raw.slice(sqlMarker + sqlLabel[0].length - sqlLabel[1].length).trim();
  } else {
    // بدون برچسب SQL: متن UNDERSTOOD و PLAN کنار گذاشته می‌شود تا extractSql فقط بقیه را ببیند
    if (planMatch) {
      // PLAN تا اولین خطی که با SELECT یا WITH شروع می‌شود ادامه دارد
      const planStart = before.length - planMatch[0].length + planMatch[1].length;
      const rest = raw.slice(planStart);
      const sqlLine = rest.search(/\n\s*(select|with)\b/i);
      plan = (sqlLine === -1 ? rest : rest.slice(0, sqlLine)).replace(/^[ \t>*#]*PLAN[ \t*]*:[ \t*]*/i, '').trim();
      thinking = (thinking ? thinking + '\n' : '') + 'PLAN:\n' + plan;
      raw = raw.slice(0, planStart) + (sqlLine === -1 ? '' : rest.slice(sqlLine));
    }
    if (understoodMatch) raw = raw.replace(understoodMatch[0], '');
    raw = raw.trim();
  }
  return { body: raw, understood, thinking, plan };
}

// ---------- ۲-۳. جدا کردن SQL از متن پرحرف مدل ----------
const SQLKW = /^\s*(select|from|where|group|order|having|join|inner|left|right|full|cross|outer|on|and|or|union|with|as|top|case|when|then|else|end|\)|,)/i;

// یک خط فقط وقتی «توضیح فارسی مدل» است که بعد از حذف شناسه‌های [...] و "..." و رشته‌های '...'
// هنوز حرف فارسی داشته باشد. قبلاً هر خط فارسی‌دار (مگر با کلمه کلیدی SQL یا ' شروع می‌شد)
// حذف می‌شد؛ پس کوئری چندخطی که ستون‌های فارسی‌نام PaymentReceiveInfo (۳۷ ستون) یا alias
// فارسی ([جمع مبلغ]) را در خط‌های جدا می‌آورد، بی‌صدا ستون از دست می‌داد یا خراب می‌شد.
const PERSIAN = /[؀-ۿ]/;
const withoutQuotedParts = l => l
  .replace(/\[[^\]]*\]/g, '')
  .replace(/"[^"]*"/g, '')
  .replace(/'(?:[^']|'')*'/g, '');
const isPersianProse = l => PERSIAN.test(withoutQuotedParts(l));

function extractSql(body) {
  let sql = '';
  const fence = body.match(/```sql\s*([\s\S]*?)```/i) || body.match(/```\s*([\s\S]*?)```/);
  if (fence) {
    sql = fence[1].trim();
  } else {
    const m = body.match(/\b(select|with)\b[\s\S]*/i);
    sql = m ? m[0].trim() : body.trim();
    sql = sql.split(/\n\s*\n/)[0].trim();
  }
  sql = sql.split('\n')
           .filter(l => !isPersianProse(l) || SQLKW.test(l))
           .join('\n').trim();
  sql = sql.replace(/;+\s*$/, '').trim();
  if (!sql) reject('⛔ مدل نتوانست کوئری تولید کند. لطفاً سوال را واضح‌تر بپرسید.');
  return sql;
}

// ---------- ۲-۴. پاسخ «پشتیبانی نمی‌شود» مدل ----------
// BuildPrompt از مدل می‌خواهد وقتی داده لازم در schema نیست دقیقاً
// SELECT 'NOT_SUPPORTED' AS Status, '<reason>' AS Reason برگرداند. این کوئری به هیچ
// موجودیتی ارجاع ندارد و قبلاً با پیام گمراه‌کننده «کوئری به هیچ موجودیت معتبری ارجاع
// ندارد» رد می‌شد و دلیل مدل گم می‌شد. اینجا صریحاً همان را به کاربر می‌گوییم.
function rejectIfNotSupported(sql, understood) {
  if (!/^\s*select\s+(?:top\s+\d+\s+)?'NOT_SUPPORTED'/i.test(sql)) return;
  const reasonMatch = sql.match(/'NOT_SUPPORTED'\s+as\s+\[?status\]?\s*,\s*'((?:[^']|'')*)'/i);
  const reason = reasonMatch ? reasonMatch[1].replace(/''/g, "'").trim() : '';
  reject('⛔ این سوال با داده‌هایی که به آن دسترسی دارید قابل پاسخ نیست.'
    + (reason ? '\n\n' + reason : (understood ? '\n\n' + understood : '')));
}

// ---------- ۲-۵. تور ایمنی: LIMIT n → TOP n ----------
function limitToTop(sql) {
  const lim = sql.match(/\blimit\s+(\d+)\s*;?\s*$/i);
  if (!lim) return sql;
  let out = sql.replace(/\blimit\s+\d+\s*;?\s*$/i, '').trim();
  if (!/^\s*select\s+top\b/i.test(out)) out = out.replace(/^\s*select\b/i, `SELECT TOP ${lim[1]}`);
  return out;
}

// ---------- ۲-۶. فقط SELECT و بدون دستور/کاراکتر غیرمجاز ----------
// اصلاح امنیتی ۲: JOIN با کاما (implicit join) از بررسی ارجاع‌ها فرار می‌کند چون آن بررسی
// فقط دنبال FROM/JOIN می‌گردد، نه کاما. hasImplicitCommaJoin هر FROM را تا اولین بند مرزی
// (در همان عمق پرانتز) اسکن می‌کند و اگر کاما دید، کوئری رد می‌شود.
function hasImplicitCommaJoin(s) {
  const boundaryRe = /^\s*(where|group\s+by|order\s+by|having|union|except|intersect|for\b)\b/i;
  const fromRe = /\bfrom\b/gi;
  let m;
  while ((m = fromRe.exec(s)) !== null) {
    let i = m.index + m[0].length;
    let depth = 0, quote = null;
    while (i < s.length) {
      const ch = s[i];
      if (quote) { if (ch === quote) quote = null; i++; continue; }
      if (ch === "'" || ch === '"') { quote = ch; i++; continue; }
      if (ch === '[') { const e = s.indexOf(']', i); i = (e === -1 ? s.length : e + 1); continue; }
      if (ch === '(') { depth++; i++; continue; }
      if (ch === ')') { if (depth === 0) break; depth--; i++; continue; }
      if (depth === 0) {
        if (ch === ',') return true;
        if (boundaryRe.test(s.slice(i))) break;
      }
      i++;
    }
  }
  return false;
}

function assertReadOnly(sql) {
  if (!/^\s*(select|with)\b/i.test(sql)) reject('⛔ عملیات مجاز نیست: فقط SELECT.');
  for (const p of POLICY.BLOCKED) {
    if (p.test(sql)) reject('⛔ عملیات مجاز نیست: دستور غیرمجاز.');
  }
  if (POLICY.FORBIDDEN_TOKENS.some(t => sql.includes(t))) reject('⛔ عملیات مجاز نیست: کاراکتر غیرمجاز.');
  if (hasImplicitCommaJoin(sql)) reject('⛔ فقط سینتکس JOIN صریح مجاز است (نه کاما در FROM).');
}

// ---------- ۲-۷. سقف ردیف اجباری ----------
function injectTop(s, n) {
  if (/^\s*select\s+top\b/i.test(s)) return s;
  if (/^\s*select\b/i.test(s)) return s.replace(/^\s*select\b/i, `SELECT TOP ${n}`);
  let depth = 0, quote = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && (ch === 's' || ch === 'S') && /^select\b/i.test(s.slice(i))) {
      const before = i === 0 ? ' ' : s[i - 1];
      if (/[A-Za-z0-9_\]]/.test(before)) continue;
      if (/^select\s+top\b/i.test(s.slice(i))) return s;
      return s.slice(0, i) + `SELECT TOP ${n}` + s.slice(i + 6);
    }
  }
  return s;
}

// ---------- ۲-۸. اعتبارسنجی: فقط موجودیت‌های انتخاب‌شده ----------
// اصلاح امنیتی ۳: پشتیبانی از شناسه‌های داخل گیومه "..." علاوه بر [...]
const IDENT = '(?:\\[[^\\]]+\\]|"[^"]+"|[A-Za-z0-9_]+)';
const stripQuotes = t => t.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '');

// نام CTEهایی که خود مدل در WITH تعریف کرده (کوچک‌شده)
function modelCteNames(sql) {
  const names = new Set();
  const cteRe = new RegExp(`(?:\\bwith\\b|,)\\s*(${IDENT})\\s+as\\s*\\(`, 'gi');
  let m;
  while ((m = cteRe.exec(sql)) !== null) names.add(stripQuotes(m[1]).toLowerCase());
  return names;
}

// نام‌های (کوچک‌شده) موجودیت‌های کاتالوگ که کوئری از آن‌ها می‌خواند؛ هر ارجاع دیگری رد می‌شود.
//
// اصلاح امنیتی ۵ - نام‌های چندبخشی ([schema].[table] یا [db].[schema].[table]):
// کوئری باید فقط از CTE موجودیت‌ها بخواند. ۱۹ نام موجودیت (مثل Fact_Invoice که منبعش
// [PRC].[Fact_Invoice_2] است) با یک جدول فیزیکی قدیمی هم‌نام در همان schema یکی‌اند؛ قبلاً فقط
// بخش آخر نام بررسی می‌شد، پس FROM [PRC].[Fact_Invoice] جدول قدیمی را مستقیم (با همه ستون‌ها و
// داده متفاوت) می‌خواند. بدتر: اگر بخش آخر با نام یک CTE خود مدل یکی بود اصلاً بررسی نمی‌شد، پس
// WITH [Fact_Sales] AS (...) SELECT * FROM [dbo].[Fact_Sales] هر جدولی را بدون مجوز می‌خواند.
// حالا نام چندبخشی هیچ‌وقت CTE مدل حساب نمی‌شود (CTE همیشه یک‌بخشی است)؛ اگر بخش آخرش
// موجودیت مجاز باشد به CTE همان موجودیت بازنویسی می‌شود، وگرنه رد می‌شود.
function resolveReferences(sql, entityDefs, log) {
  const allowedNames = new Set(Object.keys(entityDefs).map(n => n.toLowerCase()));
  const cteNames = modelCteNames(sql);

  // اصلاح امنیتی ۱: اگر مدل نام یک CTE را برابر با یک موجودیت واقعی کاتالوگ تعریف کند،
  // می‌تواند آن موجودیت را با منبع دلخواه خودش جایگزین (shadow) کند و کل کنترل دسترسی
  // را دور بزند. به‌جای رد شدن بی‌سروصدا از این حالت، صراحتاً آن را مسدود می‌کنیم.
  for (const cn of cteNames) {
    if (allowedNames.has(cn)) reject('⛔ نام‌گذاری غیرمجاز: نام CTE با یک موجودیت کاتالوگ تداخل دارد.');
  }

  const referenced = new Set();
  const qualified  = new Map(); // متن نام چندبخشی ← [نام موجودیت]
  const refRe  = new RegExp(`\\b(?:from|join)\\s+(${IDENT}(?:\\.${IDENT}){0,2})`, 'gi');
  const partRe = new RegExp(IDENT, 'g'); // نقطه داخل [...] جداکننده نیست
  let m;
  while ((m = refRe.exec(sql)) !== null) {
    const parts = m[1].match(partRe);
    const last  = stripQuotes(parts[parts.length - 1]);
    const nm    = last.toLowerCase();
    if (parts.length === 1 && cteNames.has(nm)) continue; // CTE واقعی و بی‌ضرر خود مدل
    if (!allowedNames.has(nm)) reject('⛔ اجرای این دستور خارج از حیطه دسترسی شماست.');
    if (parts.length > 1) qualified.set(m[1], `[${last}]`);
    referenced.add(nm);
  }
  if (referenced.size === 0) reject('⛔ کوئری تولیدشده به هیچ موجودیت معتبری ارجاع ندارد.');

  // همه رخدادهای نام چندبخشی (در FROM/JOIN و در پیشوند ستون‌ها مثل [PRC].[Fact_Invoice].[NetPrice])
  // به نام CTE تبدیل می‌شوند؛ طولانی‌ترها اول تا یک نام سه‌بخشی نیمه‌کاره جایگزین نشود.
  // مرز شناسه رعایت می‌شود تا dbo.Fact_Employee بخشی از dbo.Fact_EmployeeX را عوض نکند.
  const escapeRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let out = sql;
  for (const [text, repl] of [...qualified].sort((a, b) => b[0].length - a[0].length)) {
    const pattern = (/^\w/.test(text) ? '(?<![\\w.\\]])' : '') + escapeRe(text) + (/\w$/.test(text) ? '(?!\\w)' : '');
    out = out.replace(new RegExp(pattern, 'g'), repl);
    log('QUALIFIED NAME REWRITTEN | ' + text + ' -> ' + repl);
  }
  return { sql: out, referenced };
}

// ---------- ۲-۹. ساخت CTE برای موجودیت‌های ارجاع‌شده ----------
// هر نوع موجودیت (kind) سازنده خودش را دارد؛ نوع جدید = یک سازنده جدید در این نگاشت،
// بدون تغییر بقیه کد. نوع ناشناخته صریحاً رد می‌شود و بی‌صدا «جدول» فرض نمی‌شود.
const CTE_BUILDERS = {
  table: (d, name) => {
    if (!d.source) reject(`⛔ منبع موجودیت [${name}] در کاتالوگ تعریف نشده است.`);
    const cols = (d.columns || []).map(c => c.alias ? `[${c.name}] AS [${c.alias}]` : `[${c.name}]`);
    return `[${d.name}] AS (SELECT ${cols.join(', ')} FROM ${d.source})`;
  },
  virtual: (d, name) => {
    if (!d.sql) reject(`⛔ تعریف موجودیت [${name}] در کاتالوگ ناقص است.`);
    return `[${d.name}] AS (\n${d.sql}\n)`;
  }
};

function buildEntityCtes(entityDefs, referenced) {
  return Object.keys(entityDefs)
    .filter(name => referenced.has(name.toLowerCase()))
    .map(name => {
      const d = entityDefs[name];
      const builder = CTE_BUILDERS[d.kind || 'table'];
      if (!builder) reject(`⛔ نوع موجودیت [${name}] («${d.kind}») پشتیبانی نمی‌شود.`);
      return builder(d, name);
    });
}

// ---------- ۲-۱۰. ادغام CTEهای کاتالوگ با WITH خود مدل ----------
function mergeWithModelSql(cteParts, sql) {
  const prefix = 'WITH ' + cteParts.join(',\n');
  return /^\s*with\b/i.test(sql)
    ? prefix + sql.replace(/^\s*with\b/i, ',\n')
    : prefix + '\n' + sql;
}

// ==================== ۳. ترکیب ====================
function secure(input, log) {
  const envelope = parseEnvelope(input.res, extractResponseText(input.res));
  let sql = extractSql(envelope.body);
  rejectIfNotSupported(sql, envelope.understood);
  sql = limitToTop(sql);
  assertReadOnly(sql);
  sql = injectTop(sql, POLICY.ROW_CAP);

  const entityDefs = input.getEntityDefs();
  const resolved = resolveReferences(sql, entityDefs, log);
  const finalSql = mergeWithModelSql(buildEntityCtes(entityDefs, resolved.referenced), resolved.sql);

  return {
    sql: finalSql,
    modelSql: resolved.sql,
    entities: [...resolved.referenced],
    understood: envelope.understood,
    plan: envelope.plan,
    thinking: envelope.thinking,
    attempt: input.attempt
  };
}

// ==================== ۴. آداپتر n8n: خروجی ====================
return [{ json: secure(readN8nInputs(), msg => console.log(msg)) }];
