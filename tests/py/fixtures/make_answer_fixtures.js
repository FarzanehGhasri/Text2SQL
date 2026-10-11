// Runs the REAL n8n Code nodes "Format Answer", "ErrorFormat" and "Obsidian note" on many inputs and writes
// what they return to answer_cases.json.gz. tests/py/test_answer.py and test_review_notes.py check that the
// Python port (text2sql/answer.py, text2sql/review_notes.py) gives exactly the same text for every case.
//   node tests/py/fixtures/make_answer_fixtures.js
// Values JSON cannot hold (-0, NaN, Infinity) are written as { "$js": "-0" | "NaN" | "Infinity" | "-Infinity" }.
const fs = require('fs');
const path = require('path');
const { runCodeNode, runAuthCheck } = require('../../../scripts/lib/n8n-code-runner');

// ---------- deterministic randomness ----------
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261011);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const replacer = (k, v) => {
  if (typeof v === 'number') {
    if (Object.is(v, -0)) return { $js: '-0' };
    if (Number.isNaN(v)) return { $js: 'NaN' };
    if (!Number.isFinite(v)) return { $js: v > 0 ? 'Infinity' : '-Infinity' };
  }
  return v;
};

const READER = runAuthCheck(['NLSQL-sales']);   // can: no details, no notes
const IT = runAuthCheck(['IT - Data']);          // can: details, notes

// ======================================================================== Format Answer
const answerCases = [];
function answerCase(id, rows, { question = '', thinking = '', noQuestion = false } = {}) {
  const nodes = {
    Webhook: { headers: {}, body: noQuestion ? {} : { question } },
    Security: { sql: 'SELECT 1', modelSql: 'SELECT 1', understood: 'u', thinking },
    AuthCheck: READER,
  };
  const { json } = runCodeNode('Format Answer', { inputs: rows, nodes });
  answerCases.push({ id, rows, question: noQuestion ? null : question, thinking, answer: json.answer });
}

const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));

// ---- hand-written cases
answerCase('empty', []);
answerCase('one empty item', [{}]);
answerCase('two empty items', [{}, {}]);
answerCase('empty with thinking', [], { thinking: '  plan:\n1. a\n2. b  \n' });
answerCase('whitespace-only thinking', [{ a: 1 }], { thinking: ' \n\t ' });
answerCase('one row', [{ Name: 'A', Total: 10 }], { question: 'فروش' });
answerCase('two rows pie', [{ Name: 'A', Total: 10 }, { Name: 'B', Total: 5 }], { question: 'فروش هر دفتر' });
answerCase('eval-mode sample', [{ Name: 'A', Total: 10 }, { Name: 'B', Total: 5 }], { question: 'فروش هر دفتر', thinking: 'think' });
answerCase('pipes and newlines', [{ 'نام|ستون': 'الف|ب', Total: 1 }, { 'نام|ستون': 'خط\nدوم', Total: 2 }, { 'نام|ستون': 'cr\r\nlf\rx', Total: 3 }]);
answerCase('200 rows cap', range(200, (i) => ({ Name: `n${i}`, Total: i })));
answerCase('201 rows', range(201, (i) => ({ Name: `n${i}`, Total: i * 1.5 })));
answerCase('199 rows', range(199, (i) => ({ Name: `n${i}`, Total: i })), { question: 'bar chart' });
answerCase('60 rows', range(60, (i) => ({ Product: `محصول ${i}`, Qty: i * 1000 + 0.555 })));
answerCase('51 rows', range(51, (i) => ({ Product: `p${i}`, Qty: i })));
answerCase('50 rows', range(50, (i) => ({ Product: `p${i}`, Qty: i })));
answerCase('temporal en', range(12, (i) => ({ OrderMonth: `2024-${String(i + 1).padStart(2, '0')}`, Sales: 1000 + i * 37.125 })));
answerCase('temporal fa', range(10, (i) => ({ 'ماه': `ماه ${i + 1}`, 'فروش': i * 10 })));
answerCase('temporal 20 rows line cap', range(20, (i) => ({ Year: 2000 + i, Revenue: i * i })));
answerCase('iso dates', range(5, (i) => ({ OrderDate: `2024-01-0${i + 1}T00:00:00.000Z`, Amount: i + 1 })));
answerCase('iso date as value col', [{ a: 'x', d: '2024-01-01T10:00:00Z' }, { a: 'y', d: '2024-02-01T10:00:00Z' }]);
answerCase('numeric strings with commas', [{ City: 'Tehran', Amount: '1,234.5' }, { City: 'Shiraz', Amount: '12,000' }, { City: 'Tabriz', Amount: ' -3.25 ' }]);
answerCase('rounding edge floats', [2.675, 1.005, 0.125, -0.125, 0.005, 0.015, 123456789.995, -1234567.891, 1.255, 8.345]
  .map((v, i) => ({ Item: `i${i}`, V: v })), { question: 'bar' });
answerCase('negatives in pie', [{ Name: 'A', Net: -5 }, { Name: 'B', Net: 10 }, { Name: 'C', Net: 0 }, { Name: 'D', Net: 3 }], { question: 'نمودار دایره‌ای' });
answerCase('pie with one positive', [{ Name: 'A', Net: -5 }, { Name: 'B', Net: 10 }, { Name: 'C', Net: 0 }], { question: 'pie' });
answerCase('nulls', [{ Name: 'A', V: null }, { Name: null, V: 2 }, { Name: 'C', V: 3 }]);
answerCase('all null value', [{ Name: 'A', V: null }, { Name: 'B', V: null }]);
answerCase('booleans', [{ Name: 'A', Active: true, V: 1 }, { Name: 'B', Active: false, V: 2 }]);
answerCase('boolean value col', [{ Name: 'A', Active: true }, { Name: 'B', Active: false }]);
answerCase('duplicate labels', [{ Name: 'A', V: 1 }, { Name: 'A', V: 2 }, { Name: 'B', V: 3 }]);
answerCase('long labels horizontal', range(4, (i) => ({ Customer: `مشتری با نام بسیار طولانی شماره ${i}`, Total: i + 1 })), { question: 'میله‌ای' });
answerCase('labels over 40', range(3, (i) => ({ L: 'x'.repeat(45) + i, V: i + 1 })));
answerCase('labels same after 40 cut', range(3, (i) => ({ L: 'y'.repeat(40) + i, V: i + 1 })));
answerCase('emoji labels', range(3, (i) => ({ L: '😀'.repeat(8) + i, V: i + 1 })), { question: 'bar' });
answerCase('emoji cut at 40', range(3, (i) => ({ L: 'a' + '😀'.repeat(25) + i, V: i + 1 })), { question: 'bar' });
answerCase('emoji cut in title', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }], { question: 'q'.repeat(69) + '😀 pie' });
answerCase('question with colon brackets', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }], { question: 'فروش: [دفتر], تهران; ۱۴۰۳' });
answerCase('question only punctuation', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }], { question: ' :;[],: ' });
answerCase('no question field', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }], { noQuestion: true });
answerCase('long question', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }], { question: 'فروش خالص به تفکیک دفتر فروش و ماه در سال گذشته برای همه محصولات گروه لبنیات با تخفیف' });
answerCase('no numeric column', [{ A: 'x', B: 'y' }, { A: 'z', B: 'w' }]);
answerCase('only numeric column', [{ V: 1 }, { V: 2 }, { V: 3 }]);
answerCase('two numeric columns', [{ Name: 'A', Qty: 1, Amount: 100 }, { Name: 'B', Qty: 2, Amount: 50 }, { Name: 'C', Qty: 3, Amount: 25 }]);
answerCase('three label columns', range(4, (i) => ({ A: `a${i}`, B: `b${i}`, C: `c${i}`, D: `d${i}`, V: i })));
answerCase('empty label strings', [{ L: '', V: 1 }, { L: '', V: 2 }, { L: 'x', V: 3 }]);
answerCase('missing keys', [{ L: 'a', V: 1 }, { L: 'b' }, { L: 'c', V: 3 }]);
answerCase('extra keys later rows', [{ L: 'a', V: 1 }, { L: 'b', V: 2, X: 9 }]);
answerCase('integer-like column name', [{ Name: 'A', 2023: 5, 2024: 7 }, { Name: 'B', 2023: 6, 2024: 8 }]);
answerCase('big numbers', [{ N: 'a', V: 1e21 }, { N: 'b', V: 1.2345678901234567e25 }, { N: 'c', V: 9007199254740992 }], { question: 'bar' });
answerCase('tiny numbers', [{ N: 'a', V: 1e-7 }, { N: 'b', V: -1e-7 }, { N: 'c', V: 5e-324 }, { N: 'd', V: 0.001 }], { question: 'bar' });
answerCase('negative zero', [{ N: 'a', V: -0 }, { N: 'b', V: 1 }, { N: 'c', V: -0.001 }], { question: 'bar' });
answerCase('nan and infinity', [{ N: 'a', V: NaN }, { N: 'b', V: Infinity }, { N: 'c', V: -Infinity }]);
answerCase('huge value overflow when *100', [{ N: 'a', V: 1.7e308 }, { N: 'b', V: 1 }], { question: 'bar' });
answerCase('math.round halves', [0.005, -0.005, 0.015, -0.015, 2.5, -2.5, 0.125, -0.125].map((v, i) => ({ N: `n${i}`, V: v })), { question: 'line' });
answerCase('numeric string not plain', [{ N: 'a', V: '1e5' }, { N: 'b', V: '.5' }, { N: 'c', V: '5.' }, { N: 'd', V: '+5' }]);
answerCase('persian digits string', [{ N: 'a', V: '۱۲۳' }, { N: 'b', V: '45' }]);
answerCase('auto chart many rows', range(25, (i) => ({ Name: `name ${i}`, V: (i * 7919) % 1000 })));
answerCase('english pipeline not line', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }, { L: 'c', V: 2 }], { question: 'pipeline status by stage' });
answerCase('word Pie uppercase', [{ L: 'a', V: 1 }, { L: 'b', V: 2 }], { question: 'Show PIE of sales' });
answerCase('persian column names', [{ 'نام دفتر': 'تهران', 'جمع فروش': 1250000 }, { 'نام دفتر': 'مشهد', 'جمع فروش': 980000.5 }]);
answerCase('think with think tags', [{ L: 'a', V: 1 }], { thinking: '<b>x</b>\n\n' });
answerCase('label with brackets', [{ L: '[a], b; c', V: 1 }, { L: 'd:e', V: 2 }]);

// ---- generated cases
const QUESTIONS = [
  '', 'فروش هر دفتر', 'نمودار دایره‌ای سهم فروش', 'روند فروش ماهانه', 'نمودار میله‌ای فروش محصولات',
  'show a pie chart of sales', 'sales trend by month', 'bar chart of revenue', 'line chart please', 'draw a graph',
  'رسم نمودار', 'چارت فروش', 'column chart', 'تغییرات قیمت', 'فروش: دفتر [تهران]', 'how many orders per region?',
  'top 20 customers', 'خطی', 'کیک', 'سهم بازار', 'لیست مشتریان', 'Barcode list', 'pies and cakes', 'TREND',
];
const LABEL_COLS = ['Name', 'Region', 'نام', 'دفتر فروش', 'Customer Name', 'Product', 'محصول', 'Category',
  'OrderDate', 'Month', 'Year', 'تاریخ', 'ماه', 'سال', 'Quarter', 'Week', 'period_label', 'روز', 'فصل', 'هفته', 'دوره'];
const VALUE_COLS = ['Total', 'Amount', 'Sales', 'Net', 'جمع', 'تعداد', 'مبلغ فروش', 'Qty', 'Avg Price', 'Revenue'];
const LABEL_VALUES = [
  () => `Item ${int(1, 999)}`,
  () => pick(['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'قم', 'اهواز']) + ' ' + int(1, 99),
  () => `مشتری شرکت بازرگانی شماره ${int(1, 9999)}`,
  () => `2024-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}T00:00:00.000Z`,
  () => `${int(1398, 1404)}/${int(1, 12)}`,
  () => `a|b ${int(1, 99)}`,
  () => `line\nbreak ${int(1, 99)}`,
  () => `[x], y; z: ${int(1, 99)}`,
  () => 'L'.repeat(int(1, 60)) + int(1, 9),
  () => int(1, 50),
  () => null,
  () => '',
  () => `  spaced   out ${int(1, 99)}  `,
  () => pick(['A', 'B', 'C']),
];
const VALUE_VALUES = [
  () => int(-1000, 100000),
  () => int(0, 1e9),
  () => Math.round(rnd() * 1e6) / 1000,
  () => (rnd() - 0.5) * 1e5,
  () => int(0, 99999) / 1000 + 0.005,
  () => `${int(1, 999)},${String(int(0, 999)).padStart(3, '0')}.${int(0, 99)}`,
  () => String(int(-500, 500)),
  () => null,
  () => 0,
  () => int(0, 1e6) * 1e10,
];
const COUNTS = [2, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10, 12, 15, 16, 20, 21, 25, 30, 51, 60, 200];

for (let n = 0; n < 190; n++) {
  const count = n < 6 ? pick([0, 1]) : pick(COUNTS);
  const labelCount = int(0, 3);
  const valueCount = int(0, 2);
  const labelCols = Array.from({ length: labelCount }, () => pick(LABEL_COLS));
  const valueCols = Array.from({ length: valueCount }, () => pick(VALUE_COLS));
  const cols = [...new Set([...labelCols, ...valueCols])];
  if (!cols.length) cols.push('Value');
  const genLabel = Array.from({ length: cols.length }, () => pick(LABEL_VALUES));
  const genValue = Array.from({ length: cols.length }, () => pick(VALUE_VALUES));
  const rows = range(count, (i) => {
    const r = {};
    cols.forEach((c, j) => {
      const isValue = valueCols.includes(c) && !labelCols.includes(c);
      let v = isValue ? genValue[j]() : (rnd() < 0.7 ? `${String(genLabel[j]() ?? '')}${i}` : genLabel[j]());
      if (rnd() < 0.03) v = pick([true, false, null, 'n/a']);
      if (rnd() < 0.01) return;   // missing key
      r[c] = v;
    });
    return r;
  });
  const thinking = rnd() < 0.3 ? pick(['plan', '  step 1\nstep 2  ', 'استدلال مدل: جمع فروش\nبر اساس دفتر']) : '';
  answerCase(`generated ${n}`, rows, { question: pick(QUESTIONS), thinking });
}

// ======================================================================== ErrorFormat
const errorCases = [];
const ERRORS = [
  { error: { message: '⛔ عملیات مجاز نیست: فقط SELECT.' } },
  { error: { message: '⛔ شما دسترسی ندارید.' } },
  { error: { message: '⛔ کاربر در دایرکتوری یافت نشد: a@b.c [line 12]' } },
  { error: { message: "Invalid column name 'Foo'." } },
  { error: { message: "Invalid column name 'Foo'. [line 42]" } },
  { error: { message: "Invalid object name 'dbo.X'.   [Line 7]  " } },
  { error: { message: 'Timeout [line 3] after 30s' } },
  { error: { message: 'multi\nline\nerror\n[line 9]' } },
  { error: { message: '  padded message \n' } },
  { error: { message: '' }, message: 'outer message [line 1]' },
  { error: 'plain string error [line 5]' },
  { error: '⛔ string ⛔' },
  { error: { code: 'ECONN' } },
  { error: { message: '' } },
  { error: ['a', 'b'] },
  { error: 42 },
  { error: 0, message: 'zero error' },
  { message: 'only message' },
  { message: '⛔ only message' },
  {},
  { error: null, message: '' },
  { error: { message: '[line 4]' } },
  { error: { message: ' ⛔ leading space' } },
  { error: { message: 'Connection lost [line 2][line 3]' } },
  { error: { message: 'tab\t[line 10]\t' } },
  { error: { message: 'nbsp [line 1] ' } },
];
const AUTHS = [['it', IT], ['reader', READER], ['none', undefined]];
ERRORS.forEach((err, i) => {
  for (const [who, auth] of AUTHS) {
    const nodes = auth ? { AuthCheck: auth } : {};
    const { json } = runCodeNode('ErrorFormat', { inputs: [err], nodes });
    errorCases.push({ id: `error ${i} ${who}`, input: err, auth: auth || null, answer: json.answer });
  }
});

// ======================================================================== Obsidian note
const RealDate = Date;
function withNow(iso, f) {
  const fixed = new RealDate(iso).getTime();
  global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } };
  try { return f(); } finally { global.Date = RealDate; }
}

const noteCases = [];
function noteCase(id, { answered, now, answer, question, bp, sec, auth = IT, webhook = true }) {
  const nodes = {};
  if (webhook) nodes.Webhook = { headers: {}, body: question === undefined ? {} : { question, email: 'ali@corp.ir' } };
  if (auth) nodes.AuthCheck = auth;
  if (bp) nodes.BuildPrompt = bp;
  if (sec) nodes.Security = sec;
  if (answered) nodes['Format Answer'] = { answer: 'x' };
  const { result } = withNow(now, () => runCodeNode('Obsidian note', { inputs: [{ answer }], nodes }));
  if (result.length !== 1) throw new Error(`no note for ${id}`);
  const file = result[0].binary.data;
  noteCases.push({ id, kind: answered ? 'answered' : 'failed', now, inputs: { answer }, nodes,
    name: file.fileName, markdown: Buffer.from(file.data, 'base64').toString('utf8') });
}

const BP = {
  selectedEntities: ['Fact_Sales', 'Dim_SalesOffice', 'Dim_Product'],
  retrieval: { activeDomains: ['sales', 'product'], lowConfidence: false,
    why: { Fact_Sales: ['synonym «فروش»', 'metric net_sales'], Dim_SalesOffice: ['join from Fact_Sales'] } },
};
const SEC = { understood: 'فروش خالص هر دفتر', modelSql: 'SELECT 1 -- %%', sql: 'WITH [Fact_Sales] AS (...) SELECT 1', entities: ['Fact_Sales'] };
const NOWS = ['2026-10-10T14:22:33.123Z', '2026-01-01T00:00:00.000Z', '2025-12-31T23:59:59.999Z', '2026-03-20T20:30:00.500Z',
  '2024-02-29T09:05:07.000Z'];
const LONG_ANSWER = '<think>\nplan\n</think>\n\n' + range(40, (i) => `| row ${i} | ${i * 10} |`).join('\n');
const QS = ['فروش خالص به تفکیک دفتر فروش در این ماه', '', '   ', 'فروش  هر\tدفتر\n\nفروش', 'x'.repeat(130),
  'سوال '.repeat(40), '😀'.repeat(60) + 'z', 'what are the top 10 products by revenue?', ' leading and trailing spaces '];
const ANSWERS = ['<think>plan</think>\n| a |\n| --- |\n| 1 |', LONG_ANSWER, '', 'ساده', '<think>a</think> <think>b</think>\n\nbody\n',
  '  \n<think>\nunclosed', '⛔ این سوال قابل پاسخ نیست.\nجزئیات', 'line1\r\nline2', '<THINK>upper</THINK>body'];
const BPS = [BP, undefined, {}, { selectedEntities: [] }, { selectedEntities: ['A'], retrieval: {} },
  { selectedEntities: ['A', 'B'], retrieval: { why: { B: [] }, activeDomains: [], lowConfidence: true } },
  { selectedEntities: ['جدول_فارسی'], retrieval: { why: { 'جدول_فارسی': ['دلیل ۱', 'دلیل ۲', 'دلیل ۳'] }, activeDomains: ['فروش'], lowConfidence: 1 } }];
const SECS = [SEC, undefined, {}, { understood: '', modelSql: 'SELECT "q" FROM t WHERE x = \'%\'\n', sql: 'SELECT\n1', entities: ['A', 'B'] }];

let k = 0;
for (const q of QS) {
  for (const a of [ANSWERS[k % ANSWERS.length], ANSWERS[(k + 3) % ANSWERS.length]]) {
    const bp = BPS[k % BPS.length];
    const sec = SECS[k % SECS.length];
    const now = NOWS[k % NOWS.length];
    noteCase(`answered ${k}`, { answered: true, now, answer: a, question: q, bp, sec });
    noteCase(`failed ${k}`, { answered: false, now, answer: a, question: q, bp, auth: k % 3 ? IT : undefined });
    k++;
  }
}
noteCase('failed no webhook', { answered: false, now: NOWS[0], answer: '⛔ کاربر در دایرکتوری یافت نشد', webhook: false, auth: undefined });
noteCase('failed question missing', { answered: false, now: NOWS[1], answer: 'x', question: undefined });
noteCase('answered no question', { answered: true, now: NOWS[2], answer: 'x', question: undefined, bp: BP, sec: SEC });
noteCase('answered long answer exact 25 lines', { answered: true, now: NOWS[3], answer: range(25, (i) => `l${i}`).join('\n'), question: 'q', bp: BP, sec: SEC });
noteCase('answered 26 lines', { answered: true, now: NOWS[4], answer: range(26, (i) => `l${i}`).join('\n'), question: 'q', bp: BP, sec: SEC });

// ======================================================================== numbers
// The table's number format (toLocaleString), the chart value (Math.round(x * 100) / 100) and JSON.stringify,
// on many numbers of every size: the parts of Format Answer where Python and JavaScript differ most.
const numberCases = [];
const special = [0, -0, 0.5, -0.5, 1.5, 2.5, -2.5, 2.675, 1.005, 0.125, 0.135, 0.145, 0.005, -0.005, 1e21, 1e-7, 123e-20,
  9007199254740993, 2 ** 53, 2 ** 64, 1e300, -1e300, 5e-324, 1.7976931348623157e308, 999999.995, 0.1 + 0.2, 100 / 3];
const randomNumbers = range(3000, (i) => {
  const mag = int(-12, 25);
  const v = (rnd() - 0.3) * 10 ** mag;
  switch (i % 5) {
    case 0: return v;
    case 1: return Math.round(v);
    case 2: return Math.round(v * 1000) / 1000;          // 3 decimals: rounding ties on the decimal form
    case 3: return Math.round(v * 1000) / 1000 + 0.005 * Math.sign(v);
    default: return int(-1e6, 1e6) / 8;                   // exact binary halves and quarters
  }
});
for (const v of [...special, ...randomNumbers]) {
  numberCases.push({ value: v, locale: Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    chart: JSON.stringify(Math.round(v * 100) / 100), json: JSON.stringify(v), string: String(v) });
}

const out = { generated_by: 'tests/py/fixtures/make_answer_fixtures.js', format_answer: answerCases, format_error: errorCases, notes: noteCases, numbers: numberCases };
fs.writeFileSync(path.join(__dirname, 'answer_cases.json.gz'), require('zlib').gzipSync(JSON.stringify(out, replacer, 1) + '\n'));
console.log(`format_answer: ${answerCases.length}, format_error: ${errorCases.length}, notes: ${noteCases.length}, numbers: ${numberCases.length}`);
