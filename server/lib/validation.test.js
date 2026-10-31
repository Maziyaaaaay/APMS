import test from 'node:test';
import assert from 'node:assert/strict';
import { getDateInTimeZone, inferKtuBatchYear, isValidIsoDate, normalizeAcademicYear } from './validation.js';

test('KTU registration numbers map to their admission batch', () => {
  assert.equal(inferKtuBatchYear('TLY24IT032'), 2024);
  assert.equal(inferKtuBatchYear('KTE2023CS001'), 2023);
  assert.equal(inferKtuBatchYear('7306667874'), null);
  assert.equal(inferKtuBatchYear(''), null);
});

test('date validation rejects normalized but impossible calendar dates', () => {
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('2025-02-29'), false);
  assert.equal(isValidIsoDate('2025-02-31'), false);
  assert.equal(isValidIsoDate('2025-2-03'), false);
  assert.equal(isValidIsoDate('2025-08-15'), true);
});

test('academic-year validation requires consecutive academic years', () => {
  assert.equal(normalizeAcademicYear('2025-26'), '2025-26');
  assert.equal(normalizeAcademicYear(' 2025–26 '), '2025-26');
  assert.equal(normalizeAcademicYear('2025-25'), null);
  assert.equal(normalizeAcademicYear('2025-2026'), null);
  assert.equal(normalizeAcademicYear(null), null);
});

test('date-only activity checks use the KTU calendar day, including around UTC midnight', () => {
  const lateUtc = new Date('2026-10-12T20:00:00.000Z');
  assert.equal(getDateInTimeZone(lateUtc), '2026-10-13');
  assert.equal(getDateInTimeZone(lateUtc, 'UTC'), '2026-10-12');
});
