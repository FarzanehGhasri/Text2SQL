// ===== ۰. شماره تلاش: آیا این اجرای دوباره بعد از خطای SQL است؟ =====
// همان الگوی موجود در این ورک‌فلو (تشخیص با وجود/عدم وجود یک نود که فقط در
// مسیر retry اجرا می‌شود) - Build Fix Prompt فقط بعد از شکست اجرای کوئری اول اجرا می‌شود.
let attempt = 1;
try { $('Build Fix Prompt').first(); attempt = 2; } catch (e) { attempt = 1; }

// ===== ۱. استخراج متن پاسخ از API =====
const res = $input.first().json;

let raw = '';
if (typeof res === 'string') {
  raw = res;
} else {
  const KEYS = ['result','response','answer','text','output','message','content'];
  for (const k of KEYS) {
    if (typeof res[k] === 'string' && res[k].trim()) { raw = res[k]; break; }
  }
  if (!raw) {
    const s = Object.values(res).find(v => typeof v === 'string' && v.trim().length > 5);
    if (s) raw = s;
  }
}
if (!raw) {
  throw new Error('⛔ ساختار پاسخ API شناخته نشد: ' + JSON.stringify(res).slice(0, 300));
}

// ===== ۱ب. جدا کردن reasoning/thinking مدل (برای نمایش در OpenWebUI) =====
let thinking = '';
if (typeof res === 'object' && res) {
  const THINK_KEYS = ['thinking', 'reasoning', 'reasoning_content', 'thoughts'];
  for (const k of THINK_KEYS) {
    if (typeof res[k] === 'string' && res[k].trim()) { thinking += res[k].trim() + '\n'; break; }
  }
}
const thinkTag = raw.match(/<think>([\s\S]*?)<\/think>/i);
if (thinkTag) {
  thinking += thinkTag[1].trim();
  raw = raw.replace(thinkTag[0], '').trim();
}

// ===== ۱ج. جدا کردن پاکت ساختاریافته: UNDERSTOOD: ... / SQL: ... =====
let understood = '';
const understoodMatch = raw.match(/UNDERSTOOD:\s*(.+)/i);
if (understoodMatch) understood = understoodMatch[1].trim();

const sqlMarker = raw.search(/\bSQL:\s*/i);
if (sqlMarker !== -1) {
  const leftover = raw.slice(0, sqlMarker).replace(/UNDERSTOOD:.*$/im, '').trim();
  if (leftover) thinking = (thinking ? thinking + '\n' : '') + leftover;
  raw = raw.slice(sqlMarker).replace(/^SQL:\s*/i, '').trim();
} else if (understoodMatch) {
  raw = raw.replace(understoodMatch[0], '').trim();
}

// ===== ۲. جدا کردن SQL از متن پرحرف مدل (فالبک قبلی، بدون تغییر) =====
let sql = '';
const fence = raw.match(/```sql\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
if (fence) {
  sql = fence[1].trim();
} else {
  const m = raw.match(/\b(select|with)\b[\s\S]*/i);
  sql = m ? m[0].trim() : raw.trim();
  sql = sql.split(/\n\s*\n/)[0].trim();
}

const SQLKW = /^\s*(select|from|where|group|order|having|join|inner|left|right|full|cross|outer|on|and|or|union|with|as|top|case|when|then|else|end|\)|,)/i;
sql = sql.split('\n')
         .filter(l => !/[؀-ۿ]/.test(l) || SQLKW.test(l) || l.includes("'"))
         .join('\n').trim();

sql = sql.replace(/;+\s*$/, '').trim();
if (!sql) {
  throw new Error('⛔ مدل نتوانست کوئری تولید کند. لطفاً سوال را واضح‌تر بپرسید.');
}

// ===== ۲ب. پاسخ «پشتیبانی نمی‌شود» مدل =====
// BuildPrompt از مدل می‌خواهد وقتی داده لازم در schema نیست دقیقاً
// SELECT 'NOT_SUPPORTED' AS Status, '<reason>' AS Reason برگرداند. این کوئری به هیچ
// موجودیتی ارجاع ندارد و قبلاً در مرحله ۶ با پیام گمراه‌کننده «کوئری به هیچ موجودیت
// معتبری ارجاع ندارد» رد می‌شد و دلیل مدل گم می‌شد. اینجا صریحاً همان را به کاربر
// می‌گوییم. هیچ چیزی اجرا نمی‌شود، فقط پیام خطا عوض شده است.
if (/^\s*select\s+(?:top\s+\d+\s+)?'NOT_SUPPORTED'/i.test(sql)) {
  const reasonMatch = sql.match(/'NOT_SUPPORTED'\s+as\s+\[?status\]?\s*,\s*'((?:[^']|'')*)'/i);
  const reason = reasonMatch ? reasonMatch[1].replace(/''/g, "'").trim() : '';
  throw new Error('⛔ این سوال با داده‌هایی که به آن دسترسی دارید قابل پاسخ نیست.'
    + (reason ? '\n\n' + reason : (understood ? '\n\n' + understood : '')));
}

// ===== ۳. تور ایمنی: LIMIT n → TOP n =====
const lim = sql.match(/\blimit\s+(\d+)\s*;?\s*$/i);
if (lim) {
  sql = sql.replace(/\blimit\s+\d+\s*;?\s*$/i, '').trim();
  if (!/^\s*select\s+top\b/i.test(sql)) {
    sql = sql.replace(/^\s*select\b/i, `SELECT TOP ${lim[1]}`);
  }
}

// ===== ۴. لایه امنیتی =====
if (!/^\s*(select|with)\b/i.test(sql)) {
  throw new Error('⛔ عملیات مجاز نیست: فقط SELECT.');
}
const blocked = [
  /\binsert\b/i, /\bupdate\b/i, /\bdelete\b/i, /\bdrop\b/i,
  /\btruncate\b/i, /\balter\b/i, /\bcreate\b/i, /\bmerge\b/i,
  /\bexec\b/i, /\bexecute\b/i, /\bgrant\b/i, /\brevoke\b/i,
  /\bbackup\b/i, /\brestore\b/i, /\bshutdown\b/i, /\bwaitfor\b/i,
  /\binto\b/i, /\bxp_\w+/i, /\bsp_\w+/i, /openrowset/i, /opendatasource/i,
  // اصلاح امنیتی ۴: DBCC می‌تواند دستورات مدیریتی/DoS اجرا کند؛
  // APPLY می‌تواند توابع دلخواه (خارج از کاتالوگ) را صدا بزند - هر دو مسدود می‌شوند
  /\bdbcc\b/i, /\bapply\b/i, /\bopenxml\b/i
];
for (const p of blocked) {
  if (p.test(sql)) throw new Error('⛔ عملیات مجاز نیست: دستور غیرمجاز.');
}
if (sql.includes(';') || sql.includes('--') || sql.includes('/*')) {
  throw new Error('⛔ عملیات مجاز نیست: کاراکتر غیرمجاز.');
}

// اصلاح امنیتی ۲: JOIN با کاما (implicit join) از رجکس بررسی موجودیت‌ها فرار می‌کند
// چون فقط دنبال FROM/JOIN می‌گردد، نه کاما. این تابع هر FROM را تا اولین بند مرزی
// (در همان عمق پرانتز) اسکن می‌کند و اگر کاما دید، کوئری را رد می‌کند.
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
if (hasImplicitCommaJoin(sql)) {
  throw new Error('⛔ فقط سینتکس JOIN صریح مجاز است (نه کاما در FROM).');
}

// ===== ۵. سقف ردیف اجباری =====
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
sql = injectTop(sql, 200);

// ===== ۶. اعتبارسنجی: فقط موجودیت‌های انتخاب‌شده =====
const defs = $('BuildPrompt').first().json.entityDefs || {};
const allowedNames = new Set(Object.keys(defs).map(n => n.toLowerCase()));

// اصلاح امنیتی ۳: پشتیبانی از شناسه‌های داخل گیومه "..." علاوه بر [...]
// (رجکس قبلی فقط [نام] یا نام‌ ساده را می‌شناخت و نام‌های "..." را کاملاً نادیده می‌گرفت)
const IDENT = '(?:\\[[^\\]]+\\]|"[^"]+"|[A-Za-z0-9_]+)';
const stripQuotes = t => t.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '');

const cteNames = new Set();
const cteRe = new RegExp(`(?:\\bwith\\b|,)\\s*(${IDENT})\\s+as\\s*\\(`, 'gi');
let cm;
while ((cm = cteRe.exec(sql)) !== null) cteNames.add(stripQuotes(cm[1]).toLowerCase());

// اصلاح امنیتی ۱: اگر مدل نام یک CTE را برابر با یک موجودیت واقعی کاتالوگ تعریف کند،
// می‌تواند آن موجودیت را با منبع دلخواه خودش جایگزین (shadow) کند و کل کنترل دسترسی
// را دور بزند. به‌جای رد شدن بی‌سروصدا از این حالت، صراحتاً آن را مسدود می‌کنیم.
for (const cn of cteNames) {
  if (allowedNames.has(cn)) {
    throw new Error('⛔ نام‌گذاری غیرمجاز: نام CTE با یک موجودیت کاتالوگ تداخل دارد.');
  }
}

const referenced = new Set();
const refRe = new RegExp(`\\b(?:from|join)\\s+(${IDENT}(?:\\.${IDENT}){0,2})`, 'gi');
let mm;
while ((mm = refRe.exec(sql)) !== null) {
  const parts = mm[1].split('.');
  const nm = stripQuotes(parts[parts.length - 1]).toLowerCase();
  if (cteNames.has(nm)) continue; // CTE واقعی و بی‌ضرر خود مدل (دیگر نمی‌تواند نام کاتالوگ را بدزدد)
  if (!allowedNames.has(nm)) {
    throw new Error('⛔ اجرای این دستور خارج از حیطه دسترسی شماست.');
  }
  referenced.add(nm);
}

if (referenced.size === 0) {
  throw new Error('⛔ کوئری تولیدشده به هیچ موجودیت معتبری ارجاع ندارد.');
}

// ===== ۷. ساخت CTE برای موجودیت‌های ارجاع‌شده =====
const cteParts = [];
for (const name of Object.keys(defs)) {
  if (!referenced.has(name.toLowerCase())) continue;
  const d = defs[name];
  if (d.kind === 'virtual') {
    if (!d.sql) throw new Error(`⛔ تعریف موجودیت [${name}] در کاتالوگ ناقص است.`);
    cteParts.push(`[${d.name}] AS (\n${d.sql}\n)`);
  } else {
    if (!d.source) throw new Error(`⛔ منبع موجودیت [${name}] در کاتالوگ تعریف نشده است.`);
    const cols = (d.columns || []).map(c => c.alias ? `[${c.name}] AS [${c.alias}]` : `[${c.name}]`);
    cteParts.push(`[${d.name}] AS (SELECT ${cols.join(', ')} FROM ${d.source})`);
  }
}

// ===== ۸. ادغام با WITH خود مدل =====
const prefix = 'WITH ' + cteParts.join(',\n');
const finalSql = /^\s*with\b/i.test(sql)
  ? prefix + sql.replace(/^\s*with\b/i, ',\n')
  : prefix + '\n' + sql;

return [{ json: { sql: finalSql, modelSql: sql, entities: [...referenced], understood, thinking, attempt } }];