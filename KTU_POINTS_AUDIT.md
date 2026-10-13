# KTU activity-points audit — catalog mapping correction

**Status: not authoritative yet.** Student totals remain provisional until every catalog row, eligibility condition, and segment cap is encoded and reviewed. This update corrects a major numbering and group assignment error found when comparing `client/src/utils/points.js` with the APJAKTU 2024 Activity Points Handbook.

## Rules confirmed

- The 2024 handbook specifies 120 points total and 40 from each Group for regular students; 90 total and 30 per Group for lateral-entry students; and 60 total and 20 per Group for PwD students.
- Each of the three Groups has a 40-point maximum. The per-Group minimum for lateral-entry/PwD students does not reduce the 40-point ceiling.
- For the same activity/event, participation and winning points cannot be combined; when a winning record exists, the winning points apply. The handbook also sets caps at activity/segment and Group levels.
- Eligible activity evidence must be from the student's programme period and must be verified; approved skilling courses have their own eligibility requirements.

The point-summary function was updated so lateral-entry and PwD totals retain up to 40 points per Group while eligibility still checks their lower required minima. All displayed totals remain marked provisional until the catalog work below is complete.

## Confirmed discrepancy and fix

- The handbook's Group I ends at **1.21 Swimming Proficiency**. Group II includes **2.12 College Union**, **2.20 College Magazine Editorial Board**, and **2.21 Hobby Clubs**. The previous catalog had these assigned fictitious Group I identifiers (`1.22`–`1.24`), which understated Group II progress and overstated Group I progress for affected students.
- This also shifted the remaining Group II identifiers. The corrected sequence is **2.11 Professional Society**, **2.12 College Union**, **2.13 Department Student Association**, **2.14 Class Representatives**, **2.15 Industrial Visit Coordinators**, **2.16 Placement Cell**, **2.17 IEDC**, **2.18 YIP**, **2.19 STRIDE**, **2.20 Magazine Editorial Board**, **2.21 Hobby Clubs**, **2.22 ICFOSS/FOSS**, **2.23 Short-Term Internship/Clinical Exposure**, **2.24 English Proficiency**, and **2.25 Aptitude Proficiency**.
- Catalog version is now `ktu-2024-provisional-v3`. Previously saved v2 submission snapshots are immutable; progress totals, certificate lists, review screens, and generated approval PDFs resolve their old IDs to the handbook's correct groups without rewriting submitted evidence or awarded point values.
- Caps from the detailed table are being corrected alongside the mapping: College Magazine Publication allows 5 points per magazine, up to 20 overall; an Industrial Visit / Training Report awards 5 points with a 20-point activity maximum; a registered startup earns 30 points, subject to the 40-point Group ceiling. The catalog now also lets the Group ceiling govern repeated Professional Society competition entries where the table gives per-level points but no lower activity cap.
- Same-event participation/winner records now prefer the winning award, rather than choosing whichever raw point value is larger. Patent stages are grouped by patent title across dates so filed/published/granted milestones are not added as unrelated annual events.
- The catalog's requested fields still do not capture enough to validate every handbook condition. Examples include proof authority, programme enrollment dates, minimum internship duration, academic year, student-per-class caps, approved-course status, and event-level context. These remain subject to faculty verification, so totals must stay provisional.

## Implementation gate for authoritative points

The current corrections do not make totals authoritative. Reconcile every remaining activity row against the handbook, capture eligibility evidence and programme dates, model academic-year and per-segment caps, and verify repeat-event handling, highest achievement, participation/winner conflicts, activity caps, 40-point Group ceilings, and student-category thresholds. In particular, academic-year rules currently cannot be inferred reliably from calendar dates; the submission flow needs a defined academic-year field for capped recurring activities. Faculty approval remains the source of credited points; any adjustment must retain an auditable explanation.

## References

- APJ Abdul Kalam Technological University, *Activity Points Handbook – 2024 Scheme* (the handbook bears APJAKTU authorship; this accessible PDF copy is hosted by an affiliated institution): https://www.iiet.org.in/wp-content/uploads/2025/12/KTURegulations2024%E2%80%93ActivityPointsHandbook.pdf — Group I and II tables, pp. 3–12; general rules, pp. 17–18.
- KTU B.Tech 2024 curriculum page: https://ktu.edu.in/academics/branchcurriculum/hardcoded-btech

Handbook pages 2–4 contain the thresholds and verification principles; pages 5–18 contain the detailed activity table; pages 17–18 contain general calculation and eligibility rules.
