import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ACTIVITIES,
    CATALOG_VERSION,
    calculateStudentSummary,
    getActivityForCertificate,
} from './points.js';

function certificate(activityId, points, { date = '2025-08-15', event = activityId, version = CATALOG_VERSION, snapshot } = {}) {
    return {
        id: `${activityId}-${event}-${date}`,
        activity_id: activityId,
        activity_snapshot: snapshot || ACTIVITIES[activityId],
        catalog_version: version,
        event_name: event,
        activity_date: date,
        points_awarded: points,
        status: 'approved',
    };
}

test('catalog IDs follow the 2024 handbook groups and ranges', () => {
    assert.equal(CATALOG_VERSION, 'ktu-2024-provisional-v3');
    for (let i = 1; i <= 21; i += 1) assert.equal(ACTIVITIES[`1.${i}`]?.group, 1);
    for (let i = 1; i <= 25; i += 1) assert.equal(ACTIVITIES[`2.${i}`]?.group, 2);
    for (let i = 1; i <= 17; i += 1) assert.equal(ACTIVITIES[`3.${i}`]?.group, 3);
    assert.equal(ACTIVITIES['2.12'].name, 'College/University Union');
    assert.equal(ACTIVITIES['2.20'].name, 'College Magazine Editorial Board');
    assert.equal(ACTIVITIES['2.21'].name, 'Hobby Club Executive/Convenor');
    assert.equal(ACTIVITIES['2.23'].name, 'Short-Term Internship (Min 2 Weeks / 10 Working Days)');
    assert.equal(ACTIVITIES['2.24'].name, 'English Proficiency Certification (TOEFL/IELTS/PTE/BEC)');
    assert.equal(ACTIVITIES['2.25'].name, 'Aptitude Proficiency Certification (GRE/GATE/CAT/GMAT)');
    assert.equal(ACTIVITIES['1.22'], undefined);
});

test('catalog point amounts and activity caps stay within the handbook limits', () => {
    assert.equal(ACTIVITIES['1.4'].maxPoints, 20);
    assert.equal(ACTIVITIES['1.4'].pointsPerEntry, 5);
    assert.equal(ACTIVITIES['3.1'].maxPoints, 20);
    assert.equal(ACTIVITIES['3.1'].pointsPerEntry, 5);
    assert.equal(ACTIVITIES['3.9'].pointsPerEntry, 30);
    assert.equal(ACTIVITIES['3.9'].maxPoints, 40);
    for (const activity of Object.values(ACTIVITIES)) {
        assert.ok(activity.maxPoints > 0 && activity.maxPoints <= 40, activity.id);
        for (const level of activity.levels || []) assert.ok(level.points <= activity.maxPoints, `${activity.id}: ${level.label}`);
    }
});

test('a winning result replaces participation for the same event', () => {
    const summary = calculateStudentSummary([
        certificate('1.1', 40, { event: 'university track meet' }),
        certificate('1.2', 20, { event: 'university track meet' }),
    ]);
    assert.equal(summary.group1, 20);
});

test('a patent counts its highest saved milestone once across years', () => {
    const summary = calculateStudentSummary([
        certificate('3.10', 20, { event: 'campus assist patent', date: '2024-08-15' }),
        certificate('3.10', 40, { event: 'campus assist patent', date: '2025-08-15' }),
    ]);
    assert.equal(summary.group3, 40);
});

test('old v2 snapshots are placed in their corrected Group II buckets', () => {
    const records = [
        certificate('1.22', 20, { version: 'ktu-2024-provisional-v2', event: 'union role', snapshot: { id: '1.22', group: 1, maxPoints: 30, name: 'College/University Union' } }),
        certificate('1.23', 5, { version: 'ktu-2024-provisional-v2', event: 'magazine board', snapshot: { id: '1.23', group: 1, maxPoints: 10, name: 'College Magazine Editorial Board' } }),
        certificate('1.24', 5, { version: 'ktu-2024-provisional-v2', event: 'hobby club', snapshot: { id: '1.24', group: 1, maxPoints: 10, name: 'Hobby Club Executive/Convenor' } }),
        certificate('2.12', 5, { version: 'ktu-2024-provisional-v2', event: 'department association', snapshot: { id: '2.12', group: 2, maxPoints: 10, name: 'Department Student Association Activities' } }),
    ];
    const summary = calculateStudentSummary(records);
    assert.equal(summary.group1, 0);
    assert.equal(summary.group2, 35);
    assert.equal(getActivityForCertificate(records[0]).group, 2);
    assert.equal(getActivityForCertificate(records[0]).id, '2.12');
});

test('the 40-point group ceiling and lower student-type minima are applied independently', () => {
    const records = [
        certificate('1.1', 40, { event: 'arts exhibition' }),
        certificate('2.6', 5, { event: 'poster one' }),
        certificate('2.6', 5, { event: 'poster two' }),
        certificate('2.6', 5, { event: 'poster three' }),
        certificate('2.6', 5, { event: 'poster four' }),
        certificate('2.6', 5, { event: 'poster five' }),
        certificate('2.6', 5, { event: 'poster six' }),
        certificate('2.6', 5, { event: 'poster seven' }),
        certificate('2.6', 5, { event: 'poster eight' }),
        certificate('3.11', 40, { event: 'prototype' }),
    ];
    const summary = calculateStudentSummary(records, 'lateral');
    assert.deepEqual([summary.group1, summary.group2, summary.group3, summary.total], [40, 40, 40, 120]);
    assert.equal(summary.perGroupMax, 40);
    assert.equal(summary.perGroupMin, 30);
    assert.equal(summary.required, 90);
    assert.equal(summary.eligible, true);
});
