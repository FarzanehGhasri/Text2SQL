// ===== Format Answer: نتیجه کوئری ← جدول Markdown + نمودار (تصویر QuickChart) برای Open WebUI =====
const AUTO_CHART = true;   // نمودار بدون درخواست صریح کاربر هم کشیده شود
const MAX_TABLE  = 50;     // حداکثر ردیف نمایشی در جدول
const MAX_CHART  = 20;     // سقف تعداد نقطه در نمودار (بر اساس نوع نمودار پایین‌تر می‌آید)
const ROW_CAP    = 200;    // همان POLICY.ROW_CAP در Security: نتیجه‌ای با این تعداد ردیف احتمالاً بریده شده است
// آدرس سرویس quickchart آن‌طور که مرورگر کاربر می‌بیند (تصویر نمودار را مرورگر کاربر باز می‌کند، نه n8n).
// localhost فقط روی خود سرور کار می‌کند؛ برای کاربران شبکه نام یا IP سرور را بگذارید، مثلاً http://172.16.55.20:3001
const CHART_BASE_URL = 'http://localhost:3001';

const secData = $('Security').first().json;
const thinking = (secData.thinking || '').trim();
const thinkBlock = thinking ? `<think>\n${thinking}\n</think>\n\n` : '';

// ===== حالت ارزیابی (benchmark) =====
// runner بنچمارک (n8n_workflows/Text-to-SQL Benchmark-02.json) با هدر x-eval-mode: true
// ردیف‌های خام و SQL را هم می‌خواهد تا نتیجه را با gold مقایسه کند. فقط برای اعضای
// EVAL_GROUPS فعال است؛ برای بقیه (از جمله OpenWebUI که این هدر را نمی‌فرستد) پاسخ دقیقاً
// مثل قبل فقط { answer } است.
const EVAL_GROUPS = ['IT - Data'];
const evalMode = (() => {
  try {
    const headers = $('Webhook').first().json.headers || {};
    const groups  = $('AuthCheck').first().json.groups || [];
    return String(headers['x-eval-mode'] || '').toLowerCase() === 'true'
      && groups.some(g => EVAL_GROUPS.includes(g));
  } catch (e) {
    return false; // خطا پیش از AuthCheck: کاربر هنوز شناخته نشده
  }
})();
// selectedEntities: جدول‌هایی که BuildPrompt به مدل داد؛ runner با expected_entities سوال مقایسه
// می‌کند تا «جدول لازم به prompt نرسید» (retrieval) از «SQL غلط» جدا شمرده شود.
const selectedEntities = (() => {
  try { return $('BuildPrompt').first().json.selectedEntities || []; } catch (e) { return []; }
})();
const respond = (answer, rows) => [{ json: evalMode
  ? { answer, rows, sql: secData.sql || '', modelSql: secData.modelSql || '',
      understood: secData.understood || '', plan: secData.plan || '', retried: secData.attempt === 2, selectedEntities }
  : { answer } }];

// نتیجه خالی ممکن است به‌شکل یک آیتم خالی {} برسد؛ آن را ردیف حساب نمی‌کنیم
const rows = $input.all().map(i => i.json).filter(r => r && Object.keys(r).length > 0);
if (rows.length === 0) {
  return respond(thinkBlock + 'نتیجه‌ای یافت نشد.', []);
}

const question = $('Webhook').first().json.body.question || '';
const cols = Object.keys(rows[0]);

// ---------- کمکی‌ها ----------
// متنی که | یا خط جدید دارد جدول Markdown را می‌شکند
const mdSafe = s => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const toNum = v => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const fmtCell = v => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toLocaleString('en-US')
                               : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return mdSafe(s);
};

// ---------- جدول ----------
const shown = rows.slice(0, MAX_TABLE);
let md = '| ' + cols.map(mdSafe).join(' | ') + ' |\n';
md += '| ' + cols.map(() => '---').join(' | ') + ' |\n';
for (const r of shown) md += '| ' + cols.map(c => fmtCell(r[c])).join(' | ') + ' |\n';
if (rows.length >= ROW_CAP) {
  md += `\n_نتیجه به ${ROW_CAP} ردیف محدود شده و ممکن است ردیف‌های بیشتری وجود داشته باشد؛ برای نتیجه کامل سوال را محدودتر بپرسید (مثلاً «۲۰ مورد اول» یا یک بازه زمانی)._\n`;
} else if (rows.length > shown.length) {
  md += `\n_${rows.length} ردیف یافت شد، ${shown.length} ردیف اول نمایش داده شده._\n`;
}

// ---------- تشخیص ستون اندازه و برچسب ----------
const numericCols = cols.filter(c => rows.some(r => toNum(r[c]) !== null)
                                  && rows.every(r => r[c] === null || toNum(r[c]) !== null));
const valueCol = numericCols.length ? numericCols[numericCols.length - 1] : null;
const labelCols = cols.filter(c => c !== valueCol).slice(0, 3);
const isTemporal = labelCols.some(c =>
  /date|month|year|day|quarter|week|period|تاریخ|ماه|سال|روز|فصل|هفته|دوره/i.test(c));

// ---------- انتخاب نوع نمودار ----------
let type = null;
if (/دایره|پای|کیک|سهم|\bpie\b/i.test(question))               type = 'pie';
else if (/خطی|روند|تغییرات|\btrend\b|\bline\b/i.test(question)) type = 'line';
else if (/میله|ستون|\bbar\b|\bcolumn\b/i.test(question))        type = 'bar';
else if (/نمودار|چارت|\bchart\b|\bgraph\b|رسم/i.test(question) || AUTO_CHART) {
  if (isTemporal)            type = 'line';
  else if (rows.length <= 6) type = 'pie';
  else                       type = 'bar';
}

const CHART_LIMITS = { pie: 8, line: 15, bar: 20 };
const chartCap = Math.min(MAX_CHART, CHART_LIMITS[type] || MAX_CHART);

// پالت رنگ برای اینکه هر میله/برش رنگ خودش را داشته باشد، نه یک رنگ یکنواخت
const PALETTE = ['#4E79A7','#F28E2B','#E15759','#76B7B2','#59A14F','#EDC948',
                  '#B07AA1','#FF9DA7','#9C755F','#BAB0AC','#86BCB6','#D37295'];
const colorAt = i => PALETTE[i % PALETTE.length];

let chartImageUrl = '';
let chartTitle = '';

if (type && valueCol && labelCols.length && rows.length >= 2) {
  const clean = v => String(v ?? '').replace(/[\[\],;]/g, ' ').replace(/\s+/g, ' ').trim();
  const safeTitle = v => clean(String(v ?? '').replace(/[:]/g, ' ')).slice(0, 70);

  let data = rows.map(r => ({
    // برچسب کامل نگه داشته می‌شود؛ Chart.js خودش فضای لازم را برای آن رزرو می‌کند
    label: labelCols.map(c => clean(fmtCell(r[c]))).filter(Boolean).join(' ').slice(0, 40),
    value: Math.round((toNum(r[valueCol]) ?? 0) * 100) / 100
  })).filter(d => d.label);

  data = data.slice(0, chartCap); // ترتیب از ORDER BY کوئری می‌آید؛ دوباره مرتب نمی‌کنیم

  // برچسب تکراری یعنی هر ردیف یک نقطه‌ی مستقل نیست
  if (new Set(data.map(d => d.label)).size !== data.length) data = [];

  const title = safeTitle(question) || safeTitle(`${valueCol} بر اساس ${labelCols.join(' و ')}`);
  chartTitle = title;

  if (data.length >= 2) {
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);

    // میله افقی وقتی برچسب‌ها طولانی یا تعدادشان زیاد است خواناتر است
    const avgLabelLen = labels.reduce((s, l) => s + l.length, 0) / labels.length;
    const horizontal = type === 'bar' && (data.length > 8 || avgLabelLen > 14);

    let config, width, height;

    if (type === 'pie') {
      const positive = data.filter(d => d.value > 0);
      if (positive.length >= 2) {
        config = {
          type: 'pie',
          data: {
            labels: positive.map(d => d.label),
            datasets: [{ data: positive.map(d => d.value),
                         backgroundColor: positive.map((_, i) => colorAt(i)) }]
          },
          options: {
            plugins: {
              title: { display: true, text: title, font: { size: 18 } },
              legend: { position: 'right', labels: { font: { size: 13 } } }
            }
          }
        };
        width = 640; height = 480;
      }
    } else if (type === 'line') {
      config = {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: safeTitle(valueCol),
            data: values,
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
      };
      width = Math.min(1200, Math.max(650, data.length * 70));
      height = 460;
    } else { // bar
      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: safeTitle(valueCol),
            data: values,
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
      };
      if (horizontal) {
        width  = 760;
        height = Math.min(1200, Math.max(420, data.length * 38 + 110)); // فضای کافی برای هر ردیف برچسب
      } else {
        width  = Math.min(1300, Math.max(650, data.length * 80));
        height = 460;
      }
    }

    if (config) {
      // URLSearchParams در sandbox نود Code موجود نیست؛ کوئری‌استرینگ را دستی می‌سازیم
      const qcParams = {
        c: JSON.stringify(config),
        w: String(width),
        h: String(height),
        backgroundColor: 'white',
        version: '4',
        devicePixelRatio: '2'
      };
      const qs = Object.entries(qcParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      chartImageUrl = `${CHART_BASE_URL}/chart?${qs}`;
    }
  }
}

if (rows.length > chartCap && type) {
  md += `\n_نمودار برای خوانایی بیشتر به ${chartCap} ردیف اول محدود شده است (از مجموع ${rows.length} ردیف)._\n`;
}

const chartMd = chartImageUrl ? `\n![${chartTitle}](${chartImageUrl})\n` : '';
const answer = thinkBlock + md + chartMd;
return respond(answer, rows);
