// ===== Format Answer: نتیجه کوئری ← جدول Markdown + نمودار (تصویر QuickChart) برای Open WebUI =====
// ورودی:  ردیف‌های نتیجه کوئری؛ سوال (Webhook)، SQL و فکر مدل (Security)، اجازه‌ها (AuthCheck)
// خروجی:  { answer }؛ در حالت ارزیابی (بنچمارک) ردیف‌ها، SQL و جدول‌های prompt هم برمی‌گردند
// مراحل:  ۱. جدول Markdown   ۲. کدام ستون عدد و کدام برچسب   ۳. نوع نمودار   ۴. تنظیمات Chart.js   ۵. آدرس تصویر
// بعد از این نود: Respond to Webhook (جواب کاربر) و Obsidian note (یادداشت ✅/❌ برای بازبین‌ها).

// ---------- تنظیمات ----------
const CFG = {
  AUTO_CHART: true,   // نمودار بدون درخواست صریح کاربر هم کشیده شود
  MAX_TABLE:  50,     // حداکثر ردیف نمایشی در جدول
  MAX_CHART:  20,     // سقف تعداد نقطه در نمودار (بر اساس نوع نمودار پایین‌تر می‌آید)
  CHART_LIMITS: { pie: 8, line: 15, bar: 20 },
  ROW_CAP:    200,    // همان POLICY.ROW_CAP در Security: نتیجه‌ای با این تعداد ردیف احتمالاً بریده شده است
  // آدرس سرویس quickchart آن‌طور که مرورگر کاربر می‌بیند (تصویر نمودار را مرورگر کاربر باز می‌کند، نه n8n).
  // localhost فقط روی خود سرور کار می‌کند؛ برای کاربران شبکه نام یا IP سرور را بگذارید، مثلاً http://172.16.55.20:3001
  CHART_BASE_URL: 'http://localhost:3001',
  // پالت رنگ برای اینکه هر میله/برش رنگ خودش را داشته باشد، نه یک رنگ یکنواخت
  PALETTE: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948',
            '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC', '#86BCB6', '#D37295'],
};

// ---------- آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  const json = name => { try { return $(name).first().json || {}; } catch (e) { return {}; } };
  return {
    // نتیجه خالی ممکن است به‌شکل یک آیتم خالی {} برسد؛ آن را ردیف حساب نمی‌کنیم
    rows: $input.all().map(i => i.json).filter(r => r && Object.keys(r).length > 0),
    question: $('Webhook').first().json.body.question || '',
    sec: $('Security').first().json,
    can: json('AuthCheck').can || {},
    // جدول‌هایی که به مدل داده شد؛ runner بنچمارک با expected_entities مقایسه می‌کند تا «جدول لازم به prompt
    // نرسید» (retrieval) از «SQL غلط» جدا شمرده شود
    selectedEntities: json('BuildPrompt').selectedEntities || [],
  };
}

// ---------- کمکی‌ها ----------
// متنی که | یا خط جدید دارد جدول Markdown را می‌شکند
const mdSafe = s => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const colorAt = i => CFG.PALETTE[i % CFG.PALETTE.length];

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function fmtCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toLocaleString('en-US')
                               : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return mdSafe(s);
}

// ---------- ۱. جدول Markdown ----------
function markdownTable(rows, cols) {
  const shown = rows.slice(0, CFG.MAX_TABLE);
  let md = '| ' + cols.map(mdSafe).join(' | ') + ' |\n';
  md += '| ' + cols.map(() => '---').join(' | ') + ' |\n';
  for (const r of shown) md += '| ' + cols.map(c => fmtCell(r[c])).join(' | ') + ' |\n';
  if (rows.length >= CFG.ROW_CAP) {
    md += `\n_نتیجه به ${CFG.ROW_CAP} ردیف محدود شده و ممکن است ردیف‌های بیشتری وجود داشته باشد؛ برای نتیجه کامل سوال را محدودتر بپرسید (مثلاً «۲۰ مورد اول» یا یک بازه زمانی)._\n`;
  } else if (rows.length > shown.length) {
    md += `\n_${rows.length} ردیف یافت شد، ${shown.length} ردیف اول نمایش داده شده._\n`;
  }
  return md;
}

// ---------- ۲. کدام ستون عدد (اندازه) و کدام برچسب است ----------
function chartColumns(rows, cols) {
  const numericCols = cols.filter(c => rows.some(r => toNum(r[c]) !== null)
                                    && rows.every(r => r[c] === null || toNum(r[c]) !== null));
  const valueCol = numericCols.length ? numericCols[numericCols.length - 1] : null;
  const labelCols = cols.filter(c => c !== valueCol).slice(0, 3);
  const isTemporal = labelCols.some(c =>
    /date|month|year|day|quarter|week|period|تاریخ|ماه|سال|روز|فصل|هفته|دوره/i.test(c));
  return { valueCol, labelCols, isTemporal };
}

// ---------- ۳. نوع نمودار: اول آنچه کاربر خواسته، بعد بر اساس شکل داده ----------
function chartType(question, rowCount, isTemporal) {
  if (/دایره|پای|کیک|سهم|\bpie\b/i.test(question))               return 'pie';
  if (/خطی|روند|تغییرات|\btrend\b|\bline\b/i.test(question)) return 'line';
  if (/میله|ستون|\bbar\b|\bcolumn\b/i.test(question))        return 'bar';
  if (/نمودار|چارت|\bchart\b|\bgraph\b|رسم/i.test(question) || CFG.AUTO_CHART) {
    if (isTemporal)        return 'line';
    if (rowCount <= 6)     return 'pie';
    return 'bar';
  }
  return null;
}

const clean = v => String(v ?? '').replace(/[\[\],;]/g, ' ').replace(/\s+/g, ' ').trim();
const safeTitle = v => clean(String(v ?? '').replace(/[:]/g, ' ')).slice(0, 70);

// [{ label, value }] - یک نقطه برای هر ردیف؛ [] وقتی برچسب تکراری است (هر ردیف یک نقطه مستقل نیست)
function chartPoints(rows, { valueCol, labelCols }, cap) {
  const data = rows.map(r => ({
    // برچسب کامل نگه داشته می‌شود؛ Chart.js خودش فضای لازم را برای آن رزرو می‌کند
    label: labelCols.map(c => clean(fmtCell(r[c]))).filter(Boolean).join(' ').slice(0, 40),
    value: Math.round((toNum(r[valueCol]) ?? 0) * 100) / 100
  })).filter(d => d.label).slice(0, cap);   // ترتیب از ORDER BY کوئری می‌آید؛ دوباره مرتب نمی‌کنیم
  return new Set(data.map(d => d.label)).size === data.length ? data : [];
}

// ---------- ۴. تنظیمات Chart.js برای هر نوع ----------
// { config, width, height } یا null (مثلاً نمودار دایره‌ای با کمتر از دو مقدار مثبت)
function pieChart(data, title) {
  const positive = data.filter(d => d.value > 0);
  if (positive.length < 2) return null;
  return {
    config: {
      type: 'pie',
      data: {
        labels: positive.map(d => d.label),
        datasets: [{ data: positive.map(d => d.value), backgroundColor: positive.map((_, i) => colorAt(i)) }]
      },
      options: {
        plugins: {
          title: { display: true, text: title, font: { size: 18 } },
          legend: { position: 'right', labels: { font: { size: 13 } } }
        }
      }
    },
    width: 640, height: 480
  };
}

function lineChart(data, title, valueCol) {
  const labels = data.map(d => d.label);
  return {
    config: {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: safeTitle(valueCol),
          data: data.map(d => d.value),
          borderColor: colorAt(0),
          backgroundColor: colorAt(0),
          pointBackgroundColor: labels.map((_, i) => colorAt(i)),
          pointRadius: 4,
          tension: 0.25,
          fill: false
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: title, font: { size: 18 } },
          legend: { display: false }
        },
        scales: {
          x: { ticks: { font: { size: 13 } } },
          y: { title: { display: true, text: safeTitle(valueCol) }, beginAtZero: true }
        }
      }
    },
    width: Math.min(1200, Math.max(650, data.length * 70)),
    height: 460
  };
}

function barChart(data, title, valueCol) {
  const labels = data.map(d => d.label);
  // میله افقی وقتی برچسب‌ها طولانی یا تعدادشان زیاد است خواناتر است
  const avgLabelLen = labels.reduce((s, l) => s + l.length, 0) / labels.length;
  const horizontal = data.length > 8 || avgLabelLen > 14;
  return {
    config: {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: safeTitle(valueCol),
          data: data.map(d => d.value),
          backgroundColor: labels.map((_, i) => colorAt(i)),
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          title: { display: true, text: title, font: { size: 18 } },
          legend: { display: false }
        },
        scales: horizontal
          ? { x: { title: { display: true, text: safeTitle(valueCol) }, beginAtZero: true },
              y: { ticks: { autoSkip: false, font: { size: 13 } } } }
          : { x: { ticks: { font: { size: 12 } } },
              y: { title: { display: true, text: safeTitle(valueCol) }, beginAtZero: true } }
      }
    },
    width: horizontal ? 760 : Math.min(1300, Math.max(650, data.length * 80)),
    height: horizontal ? Math.min(1200, Math.max(420, data.length * 38 + 110)) : 460   // فضای کافی برای هر ردیف برچسب
  };
}

const CHART_BUILDERS = { pie: pieChart, line: lineChart, bar: barChart };

// ---------- ۵. آدرس تصویر نمودار ----------
// URLSearchParams در sandbox نود Code موجود نیست؛ کوئری‌استرینگ را دستی می‌سازیم
function chartUrl({ config, width, height }) {
  const params = {
    c: JSON.stringify(config),
    w: String(width),
    h: String(height),
    backgroundColor: 'white',
    version: '4',
    devicePixelRatio: '2'
  };
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `${CFG.CHART_BASE_URL}/chart?${qs}`;
}

// { markdown, note } - note وقتی نمودار فقط بخشی از ردیف‌ها را نشان می‌دهد
function chartFor(question, rows, cols) {
  const columns = chartColumns(rows, cols);
  const type = chartType(question, rows.length, columns.isTemporal);
  const cap = Math.min(CFG.MAX_CHART, CFG.CHART_LIMITS[type] || CFG.MAX_CHART);
  const note = rows.length > cap && type
    ? `\n_نمودار برای خوانایی بیشتر به ${cap} ردیف اول محدود شده است (از مجموع ${rows.length} ردیف)._\n` : '';
  if (!type || !columns.valueCol || !columns.labelCols.length || rows.length < 2) return { markdown: '', note };
  const data = chartPoints(rows, columns, cap);
  if (data.length < 2) return { markdown: '', note };
  const title = safeTitle(question) || safeTitle(`${columns.valueCol} بر اساس ${columns.labelCols.join(' و ')}`);
  const chart = CHART_BUILDERS[type](data, title, columns.valueCol);
  return { markdown: chart ? `\n![${title}](${chartUrl(chart)})\n` : '', note };
}

// ---------- اجرا ----------
function formatAnswer({ rows, question, sec, can, selectedEntities }) {
  const thinking = (sec.thinking || '').trim();
  const thinkBlock = thinking ? `<think>\n${thinking}\n</think>\n\n` : '';
  let answer;
  if (rows.length === 0) {
    answer = thinkBlock + 'نتیجه‌ای یافت نشد.';
  } else {
    const cols = Object.keys(rows[0]);
    const chart = chartFor(question, rows, cols);
    answer = thinkBlock + markdownTable(rows, cols) + chart.note + chart.markdown;
  }
  return can.evalMode
    ? { answer, rows, sql: sec.sql || '', modelSql: sec.modelSql || '', understood: sec.understood || '',
        plan: sec.plan || '', retried: sec.attempt === 2, selectedEntities }
    : { answer };
}

return [{ json: formatAnswer(readN8nInputs()) }];
