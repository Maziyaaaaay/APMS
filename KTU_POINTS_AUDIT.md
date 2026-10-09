# KTU activity-points audit — Phase 1

**Status: not authoritative yet.** Student totals are labeled provisional until the full catalog and calculation rules have been reconciled and implemented. This audit records the first comparison of the current `client/src/utils/points.js` with the APJAKTU 2024 Activity Points Handbook.

## Rules confirmed

- The 2024 handbook specifies 120 points total and 40 from each Group for regular students; 90 total and 30 per Group for lateral-entry students; and 60 total and 20 per Group for PwD students.
- Each of the three Groups has a 40-point maximum. The per-Group minimum for lateral-entry/PwD students does not reduce the 40-point ceiling.
- For the same activity/event, participation and winning points cannot be combined; the higher achievement level is considered. The handbook also sets caps at activity/segment and Group levels.
- Eligible activity evidence must be from the student's programme period and must be verified; approved skilling courses have their own eligibility requirements.

The point-summary function was updated so lateral-entry and PwD totals retain up to 40 points per Group while eligibility still checks their lower required minima. All displayed totals remain marked provisional until the catalog work below is complete.

## Confirmed discrepancies and fixes

- The handbook includes **1.22 College Union**, **1.23 College Magazine Editorial Board**, and **1.24 Hobby Clubs** in Group I. The Group II table then starts at **2.1**. The repository had these three entries omitted or placed under Group II; they are restored under their handbook identifiers.
- Group II leadership and service rows are **2.11 Professional Society Membership/Student Coordinator**, **2.12 Department Student Association**, **2.13 Class Representatives**, **2.14 Industrial Visit Coordinators**, **2.15 Placement Cell**, **2.16 IEDC**, **2.17 YIP**, **2.18 STRIDE**, **2.19 ICFOSS/FOSS**, **2.20 Short-Term Internship/Clinical Exposure**, **2.21 English Proficiency**, and **2.22 Aptitude Proficiency**. The prior repository had rows shifted after 2.11 and had extra 2.23–2.25 identifiers. These mappings are corrected.
- The repository includes Group III **3.18 State-Level Hackathons** and **3.19 District/College-Level Hackathons**. These do not appear in the handbook's listed 3.1–3.17 categories and must not be awarded without a separate current KTU order that authorizes them.
- The old catalog gave College Magazine Publication a 20-point activity cap; the handbook caps it at 5 points per magazine in an academic year. The old Industrial Visit Report allowed multiple 5-point entries up to 20; the handbook awards 5 points for the qualifying report. Both limits are corrected.
- The registered startup activity (3.9) is capped at **30 points** in the handbook; the catalog cap is now 30.
- New submissions require an event name and completed activity date. The calculator uses the event name and year to merge duplicate submissions and avoid combining participation/winner scores for the same annual event; older rows without these fields remain separate estimates.
- Several catalog definitions still need a per-row review of exact values, caps, eligibility conditions, and evidence requirements. The generic `fixed`, `choice`, `level`, and `hours` model does not encode the handbook's nuanced qualifications (for example, score thresholds, academic-year limits, approved lists, student-per-class limits, or evidence authority).

## Implementation gate for authoritative points

The currently implemented repairs do not yet make totals authoritative. Reconcile every activity row against the handbook, encode the evidence source, eligibility period, age/course rules and all per-segment limits, and verify that the calculation handles repeat events, highest achievement across levels, participation/winner conflicts, activity caps, the 40-point Group cap, and student-category thresholds. Faculty approval remains the source of credited points, with an auditable explanation for any adjustment.

## References

- APJ Abdul Kalam Technological University, *Activity Points Handbook – 2024 Scheme* (PDF copy hosted by an affiliated institution): https://www.iiet.org.in/wp-content/uploads/2025/12/KTURegulations2024%E2%80%93ActivityPointsHandbook.pdf
- KTU B.Tech 2024 curriculum page: https://ktu.edu.in/academics/branchcurriculum/hardcoded-btech

Handbook pages 2–4 contain the thresholds and verification principles; pages 5–18 contain the detailed activity table; pages 17–18 contain general calculation and eligibility rules.
