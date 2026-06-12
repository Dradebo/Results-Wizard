import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';

function parseCsv(text) {
  const rows = [];
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return rows;
  const headers = splitCsvLine(lines[0]);
  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') { current += '"'; i += 1; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue; }
    current += ch;
  }
  values.push(current);
  return values;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function averageFromRow(row) {
  const scores = Object.entries(row)
    .filter(([k]) => /^(mark|score|subject|math|english|science|social|history)/i.test(k))
    .map(([, v]) => Number.parseFloat(String(v).replace(/[^0-9.]/g, '')))
    .filter(Number.isFinite);
  if (!scores.length) return '';
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

async function buildWorkbook(rows, meta, outPath) {
  const wb = new ExcelJS.Workbook();
  const summary = wb.addWorksheet('School Summary');
  summary.addRow(['School', meta.schoolName]);
  summary.addRow(['Term', meta.term]);
  summary.addRow(['Learners', rows.length]);
  summary.addRow(['Channel', 'Email first']);

  const report = wb.addWorksheet('Report Cards');
  report.columns = [
    { header: 'Learner', key: 'learner', width: 24 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Stream', key: 'stream', width: 10 },
    { header: 'Parent email', key: 'email', width: 28 },
    { header: 'Average', key: 'average', width: 10 },
    { header: 'Result note', key: 'note', width: 42 },
  ];
  rows.forEach((row) => {
    report.addRow({
      learner: row.name || row.learner || '',
      class: row.class || row.Class || '',
      stream: row.stream || row.Stream || '',
      email: row.email || row.parent_email || row.guardian_email || '',
      average: averageFromRow(row),
      note: row.comment || row.note || row['Teacher comment'] || 'Ready for parent delivery'
    });
  });
  await wb.xlsx.writeFile(outPath);
}

function renderEmail(row, meta) {
  const learner = row.name || row.learner || 'Learner';
  const cls = row.class || row.Class || '';
  const stream = row.stream || row.Stream || '';
  const average = averageFromRow(row);
  const subject = `${meta.schoolName} results for ${learner}`;
  const body = [
    `Dear parent/guardian,`,
    '',
    `Attached is the official results summary for ${learner}.`,
    `School: ${meta.schoolName}`,
    `Term: ${meta.term}`,
    cls ? `Class: ${cls}` : null,
    stream ? `Stream: ${stream}` : null,
    average ? `Average: ${average}` : null,
    '',
    'Please review the report card and reply if you need correction support.',
    '',
    'Regards,',
    meta.schoolName,
  ].filter(Boolean).join('\n');
  return { to: row.email || row.parent_email || row.guardian_email || '', subject, body, learner };
}

async function maybeSendEmailQueue(rows, meta, smtp) {
  const queue = rows.map((row) => renderEmail(row, meta));
  if (!smtp?.host || !smtp?.user || !smtp?.pass) return { mode: 'draft-only', queue };
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || 587),
    secure: String(smtp.secure || 'false') === 'true',
    auth: { user: smtp.user, pass: smtp.pass }
  });
  const sent = [];
  for (const item of queue) {
    if (!item.to) {
      sent.push({ ...item, status: 'skipped', reason: 'missing email' });
      continue;
    }
    const info = await transporter.sendMail({ from: smtp.from || smtp.user, to: item.to, subject: item.subject, text: item.body });
    sent.push({ ...item, status: 'sent', messageId: info.messageId });
  }
  return { mode: 'sent', queue: sent };
}

const input = process.argv[2];
const outDir = process.argv[3] || path.resolve('out/results-wizard');
const meta = {
  schoolName: process.argv[4] || 'Demo Primary School',
  term: process.argv[5] || 'Term 3, 2026'
};
const smtp = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM
};

if (!input) {
  console.error('Usage: node scripts/process-batch.mjs <input.csv> [outDir] [schoolName] [term]');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const raw = fs.readFileSync(input, 'utf8');
const rows = parseCsv(raw);
if (!rows.length) {
  console.error('No rows found in input CSV');
  process.exit(2);
}

const workbookPath = path.join(outDir, 'results-wizard-report-cards.xlsx');
await buildWorkbook(rows, meta, workbookPath);
const emailResult = await maybeSendEmailQueue(rows, meta, smtp);
const queuePath = path.join(outDir, 'email-queue.csv');
const headers = ['learner', 'to', 'subject', 'status', 'messageId', 'reason'];
const csv = [headers.join(',')].concat((emailResult.queue || []).map((row) => headers.map((h) => csvEscape(row[h] || '')).join(','))).join('\n');
fs.writeFileSync(queuePath, csv);

const draftsPath = path.join(outDir, 'email-drafts.json');
fs.writeFileSync(draftsPath, JSON.stringify(emailResult.queue, null, 2));

console.log(JSON.stringify({ ok: true, mode: emailResult.mode, workbookPath, queuePath, draftsPath, rows: rows.length }, null, 2));
