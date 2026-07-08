import assert from 'node:assert/strict';
import { convertPdfsToWorkbook } from '../web/src/pdfToWorkbook.js';
import fs from 'node:fs/promises';

const sample = await fs.readFile(new URL('./fixtures/sample-teacher-marks.csv', import.meta.url), 'utf8');
const file = {
  name: 'sample-teacher-marks.csv',
  async text() { return sample; },
  async arrayBuffer() { return new TextEncoder().encode(sample).buffer; }
};

const { workbook, records } = await convertPdfsToWorkbook([file]);

assert.equal(records.length, 3, 'sample CSV should group into 3 learner records');
assert.deepEqual(
  records.map((r) => r.learner_name).sort(),
  ['Achieng Maria', 'Kato Daniel', 'Nakato Sarah'].sort(),
  'sample CSV should preserve canonical learner names'
);

const qas = workbook.getWorksheet('qa_issues');
assert.ok(qas, 'qa_issues worksheet should exist');
assert.ok(qas.rowCount >= 2, 'qa_issues should include at least one issue row plus header');

const parent = workbook.getWorksheet('parent_results');
assert.ok(parent, 'parent_results worksheet should exist');
const parentRows = parent.getSheetValues().slice(2).filter(Boolean);
assert.equal(parentRows.length, 3, 'parent_results should contain one row per learner');

console.log('parser-regression: pass');
