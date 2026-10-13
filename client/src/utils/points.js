// KTU 2024 Activity Points Algorithm
// Source: APJ Abdul Kalam Technological University - Activity Points Handbook 2024

export const CATALOG_VERSION = 'ktu-2024-provisional-v2';

export const STUDENT_TYPES = {
    regular: { total: 120, perGroup: 40 },
    lateral: { total: 90, perGroup: 30 },
    pwd: { total: 60, perGroup: 20 },
};

export const ACTIVITIES = {
    // ───────────── GROUP I ─────────────
    '1.1': {
        id: '1.1', group: 1, exclusiveGroup: 'sport-event', name: 'Sports/Games/Arts — Participation',
        category: 'Sports, Arts & Cultural',
        type: 'level',
        maxPoints: 40,
        levels: [
            { label: 'College Level', points: 1 },
            { label: 'Zonal Level', points: 5 },
            { label: 'State Level', points: 10 },
            { label: 'National Level', points: 20 },
            { label: 'International Level', points: 40 },
        ],
        note: 'KTU Organized/Approved Events only',
    },
    '1.2': {
        id: '1.2', group: 1, exclusiveGroup: 'sport-event', name: 'Sports/Games/Arts — Winners (Single Events)',
        category: 'Sports, Arts & Cultural',
        type: 'level',
        maxPoints: 40,
        levels: [
            { label: 'College Level', points: 5 },
            { label: 'Zonal Level', points: 10 },
            { label: 'State Level', points: 20 },
            { label: 'National Level', points: 40 },
            { label: 'International Level', points: 40 },
        ],
        note: 'Winners: 1st, 2nd and 3rd places',
    },
    '1.3': {
        id: '1.3', group: 1, exclusiveGroup: 'sport-event', name: 'Sports/Games/Arts — Winners (Group Events)',
        category: 'Sports, Arts & Cultural',
        type: 'level',
        maxPoints: 40,
        levels: [
            { label: 'College Level', points: 3 },
            { label: 'Zonal Level', points: 5 },
            { label: 'State Level', points: 15 },
            { label: 'National Level', points: 30 },
            { label: 'International Level', points: 40 },
        ],
    },
    '1.4': {
        id: '1.4', group: 1, name: 'College Magazine Publication',
        category: 'Sports, Arts & Cultural',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
        note: '5 pts per magazine; maximum 5 pts per magazine in an academic year',
    },
    '1.5': {
        id: '1.5', group: 1, name: 'Driving License (4-Wheeler)',
        category: 'Community & Outreach',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
        note: 'Must be obtained during programme duration',
    },
    '1.6': {
        id: '1.6', group: 1, name: 'Community Service (2 Days)',
        category: 'Community & Outreach',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
    },
    '1.7': {
        id: '1.7', group: 1, name: 'Community Service (Up to 1 Week)',
        category: 'Community & Outreach',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 10,
    },
    '1.8': {
        id: '1.8', group: 1, name: 'Blood Donation',
        category: 'Community & Outreach',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
        note: '5 pts per donation',
    },
    '1.9': {
        id: '1.9', group: 1, name: 'THRIVE Project (Min 5 Days/Semester)',
        category: 'Community & Outreach',
        type: 'fixed',
        maxPoints: 20,
        pointsPerEntry: 10,
        note: '10 pts per semester',
    },
    '1.10': {
        id: '1.10', group: 1, name: 'Tree Planting (Geo-tagged)',
        category: 'Community & Outreach',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
    },
    '1.11': {
        id: '1.11', group: 1, name: 'NSS Volunteer (2 Years Completed)',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 30,
        pointsPerEntry: 30,
    },
    '1.12': {
        id: '1.12', group: 1, name: 'University Leadership Camp (100 Hours)',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 20,
        pointsPerEntry: 20,
    },
    '1.13': {
        id: '1.13', group: 1, name: 'Winners – State NSS Festival/Meet',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 15,
        pointsPerEntry: 15,
    },
    '1.14': {
        id: '1.14', group: 1, name: 'Special Service/Appreciation (State/NCC)',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 15,
    },
    '1.15': {
        id: '1.15', group: 1, name: 'State/National Level Awards (NSS)',
        category: 'NSS/NCC',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: 'State Award', points: 15 },
            { label: 'National Award', points: 25 },
        ],
    },
    '1.16': {
        id: '1.16', group: 1, name: 'National Camps / NIC / NYF / Pre-RDC',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 15,
        pointsPerEntry: 15,
    },
    '1.17': {
        id: '1.17', group: 1, name: '10-Day Volunteer Service (50 Hrs, State Programme)',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 15,
        pointsPerEntry: 15,
    },
    '1.18': {
        id: '1.18', group: 1, name: 'RDC / IDC / International NSS/NCC Events',
        category: 'NSS/NCC',
        type: 'fixed',
        maxPoints: 25,
        pointsPerEntry: 25,
    },
    '1.19': {
        id: '1.19', group: 1, name: 'NCC Certificates',
        category: 'NSS/NCC',
        type: 'choice',
        maxPoints: 30,
        levels: [
            { label: '1 Year NCC + Min Parade Attendance', points: 10 },
            { label: "NCC 'B' Certificate", points: 20 },
            { label: "NCC 'C' Certificate", points: 30 },
        ],
        note: 'Only one option can be claimed',
    },
    '1.20': {
        id: '1.20', group: 1, name: 'First Aid / CPR / Fire Safety Training',
        category: 'Health, Safety & Life Skills',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
        note: '5 pts per programme',
    },
    '1.21': {
        id: '1.21', group: 1, name: 'Swimming Proficiency',
        category: 'Health, Safety & Life Skills',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
    },
    // ───────────── GROUP II ─────────────
    '2.1': {
        id: '2.1', group: 2, exclusiveGroup: 'techfest', name: 'Tech-Fest Participation (KTU Approved)',
        category: 'Technical Events & Competitions',
        type: 'level',
        maxPoints: 40,
        levels: [
            { label: 'College Level', points: 2 },
            { label: 'Zonal Level', points: 5 },
            { label: 'State Level', points: 10 },
            { label: 'National Level', points: 20 },
            { label: 'International Level', points: 30 },
        ],
    },
    '2.2': {
        id: '2.2', group: 2, exclusiveGroup: 'techfest', name: 'Tech-Fest Winners (KTU Approved)',
        category: 'Technical Events & Competitions',
        type: 'level',
        maxPoints: 40,
        levels: [
            { label: 'College Level', points: 5 },
            { label: 'Zonal Level', points: 10 },
            { label: 'State Level', points: 20 },
            { label: 'National Level', points: 40 },
            { label: 'International Level', points: 40 },
        ],
    },
    '2.3': {
        id: '2.3', group: 2, exclusiveGroup: 'professional-society', name: 'Professional Society Events — Participation (IEEE/IET/ASME etc.)',
        category: 'Technical Events & Competitions',
        type: 'level',
        maxPoints: 20,
        levels: [
            { label: 'College Level', points: 2 },
            { label: 'Zonal Level', points: 5 },
            { label: 'State Level', points: 10 },
            { label: 'National Level', points: 15 },
            { label: 'International Level', points: 20 },
        ],
    },
    '2.4': {
        id: '2.4', group: 2, exclusiveGroup: 'professional-society', name: 'Professional Society Events — Winners (IEEE/IET/ASME etc.)',
        category: 'Technical Events & Competitions',
        type: 'level',
        maxPoints: 35,
        levels: [
            { label: 'College Level', points: 3 },
            { label: 'Zonal Level', points: 7 },
            { label: 'State Level', points: 15 },
            { label: 'National Level', points: 25 },
            { label: 'International Level', points: 35 },
        ],
    },
    '2.5': {
        id: '2.5', group: 2, name: 'Conferences/Workshops at IITs/NITs/NIRF Top 100',
        category: 'Technical Events & Competitions',
        type: 'fixed',
        maxPoints: 15,
        pointsPerEntry: 5,
        note: '5 pts per event',
    },
    '2.6': {
        id: '2.6', group: 2, name: 'Poster Presentation (KTU/IITs/NITs/NIRF Top 100)',
        category: 'Technical Events & Competitions',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 5,
        note: '5 pts per event',
    },
    '2.7': {
        id: '2.7', group: 2, exclusiveGroup: 'paper-top-institute', name: 'Paper Presentation — Participation (KTU/IITs/NITs/NIRF Top 100)',
        category: 'Technical Events & Competitions',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 10,
        note: '10 pts per event',
    },
    '2.8': {
        id: '2.8', group: 2, exclusiveGroup: 'paper-top-institute', name: 'Paper Presentation — Winners (KTU/IITs/NITs/NIRF Top 100)',
        category: 'Technical Events & Competitions',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: '1st Prize', points: 20 },
            { label: '2nd or 3rd Prize', points: 15 },
        ],
    },
    '2.9': {
        id: '2.9', group: 2, exclusiveGroup: 'paper-ktu-affiliated', name: 'Paper Presentation — Participation (KTU Affiliated Colleges)',
        category: 'Technical Events & Competitions',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 5,
    },
    '2.10': {
        id: '2.10', group: 2, exclusiveGroup: 'paper-ktu-affiliated', name: 'Paper Presentation — Winners (KTU Affiliated Colleges)',
        category: 'Technical Events & Competitions',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: '1st Prize', points: 10 },
            { label: '2nd or 3rd Prize', points: 7 },
        ],
    },
    '2.11': {
        id: '2.11', group: 2, name: 'Professional Society Membership (IEEE/IET/ASME/ACM etc., min 2 yrs)',
        category: 'Leadership & Management',
        type: 'choice',
        maxPoints: 15,
        levels: [
            { label: 'Member', points: 5 },
            { label: 'Executive Committee Member', points: 10 },
            { label: 'Student Secretary / Chapter Lead / Chair', points: 15 },
            { label: 'Professional Body Coordinator (per event)', points: 5 },
        ],
    },
    '1.22': {
        id: '1.22', group: 1, name: 'College/University Union',
        category: 'Leadership & Management',
        type: 'choice',
        maxPoints: 30,
        levels: [
            { label: 'College Union — Executive Committee Member', points: 15 },
            { label: 'College Union — Office Bearer', points: 20 },
            { label: 'University Union — Member (Excl. Office Bearers)', points: 25 },
            { label: 'University Union — Office Bearer', points: 30 },
        ],
    },
    '2.12': {
        id: '2.12', group: 2, name: 'Department Student Association Activities',
        category: 'Leadership & Management',
        type: 'choice',
        maxPoints: 10,
        levels: [
            { label: 'Exec Committee / Office Bearer (per year)', points: 5 },
            { label: 'Student Coordinator (per event)', points: 5 },
        ],
    },
    '2.13': {
        id: '2.13', group: 2, name: 'Class Representative',
        category: 'Leadership & Management',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
        note: '5 pts per academic year (1 CR per class)',
    },
    '2.14': {
        id: '2.14', group: 2, name: 'Industrial Visit Coordinator (Min 6 Days)',
        category: 'Leadership & Management',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
        note: 'Max 2 coordinators per class',
    },
    '2.15': {
        id: '2.15', group: 2, name: 'Placement Cell (Min 1 Academic Year)',
        category: 'Leadership & Management',
        type: 'choice',
        maxPoints: 10,
        levels: [
            { label: 'Executive Committee Member (1 per class)', points: 5 },
            { label: 'Coordinator / Convenor (max 2)', points: 10 },
        ],
    },
    '2.16': {
        id: '2.16', group: 2, name: 'IEDC Cell (Min 1 Academic Year)',
        category: 'Leadership & Management',
        type: 'choice',
        maxPoints: 10,
        levels: [
            { label: 'Exec / Office Bearer (per year)', points: 5 },
            { label: 'Student Coordinator (per event)', points: 5 },
        ],
    },
    '2.17': {
        id: '2.17', group: 2, name: 'YIP – K-DISC (Min 1 Academic Year)',
        category: 'Leadership & Management',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
    },
    '2.18': {
        id: '2.18', group: 2, name: 'STRIDE – K-DISC (Min 1 Academic Year)',
        category: 'Leadership & Management',
        type: 'choice',
        maxPoints: 20,
        levels: [
            { label: 'Certified Volunteer (1-year service)', points: 5 },
            { label: 'STRIDE Member (enrolled/registered)', points: 5 },
            { label: 'Leadership Team Role', points: 10 },
            { label: 'High Impact Project — L1', points: 10 },
            { label: 'High Impact Project — L2', points: 15 },
            { label: 'High Impact Project — L5', points: 20 },
        ],
    },
    '1.23': {
        id: '1.23', group: 1, name: 'College Magazine Editorial Board',
        category: 'Leadership & Management',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
        note: '5 pts per academic year',
    },
    '1.24': {
        id: '1.24', group: 1, name: 'Hobby Club Executive/Convenor',
        category: 'Leadership & Management',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 5,
        note: '5 pts per academic year',
    },
    '2.19': {
        id: '2.19', group: 2, name: 'ICFOSS / FOSS Activities (Min 1 Academic Year)',
        category: 'FOSS & Open Source',
        type: 'choice',
        maxPoints: 20,
        levels: [
            { label: 'FOSS Club Member (min 2 activities)', points: 5 },
            { label: 'ICFOSS Workshop/Bootcamp (min 2 days)', points: 5 },
            { label: 'ICFOSS Hackathon/FOSS Event', points: 5 },
            { label: 'FOSS Club Student Lead / Coordinator / Ambassador', points: 10 },
            { label: 'Open-Source Contribution (GitHub/GitLab, validated by ICFOSS)', points: 10 },
            { label: 'FOSS Project Dev / ICFOSS Internship (min 15 days)', points: 10 },
        ],
    },
    '2.20': {
        id: '2.20', group: 2, name: 'Short-Term Internship (Min 2 Weeks / 10 Working Days)',
        category: 'Short-Term Internship',
        type: 'fixed',
        maxPoints: 10,
        pointsPerEntry: 10,
    },
    '2.21': {
        id: '2.21', group: 2, name: 'English Proficiency Certification (TOEFL/IELTS/PTE/BEC)',
        category: 'Standardized Tests & Proficiency',
        type: 'choice',
        maxPoints: 30,
        levels: [
            { label: 'TOEFL iBT ≥ 105', points: 30 },
            { label: 'TOEFL iBT 95–104', points: 25 },
            { label: 'TOEFL iBT 80–94', points: 20 },
            { label: 'IELTS Academic ≥ 7.5', points: 30 },
            { label: 'IELTS Academic 7.0', points: 25 },
            { label: 'IELTS Academic 6.5', points: 20 },
            { label: 'PTE Academic ≥ 76', points: 30 },
            { label: 'PTE Academic 65–75', points: 25 },
            { label: 'PTE Academic 58–64', points: 20 },
            { label: 'BEC Higher (C1 Level)', points: 25 },
            { label: 'BEC Vantage (B2 Level)', points: 20 },
            { label: 'BEC Preliminary (B1 Level)', points: 15 },
        ],
    },
    '2.22': {
        id: '2.22', group: 2, name: 'Aptitude Proficiency Certification (GRE/GATE/CAT/GMAT)',
        category: 'Standardized Tests & Proficiency',
        type: 'choice',
        maxPoints: 30,
        levels: [
            { label: 'GRE Score ≥ 320', points: 30 },
            { label: 'GRE Score 310–319', points: 25 },
            { label: 'GRE Score 300–309', points: 20 },
            { label: 'GATE AIR within Top 5000', points: 30 },
            { label: 'GATE AIR 5001–15000', points: 25 },
            { label: 'Qualified GATE (Valid GATE Score)', points: 20 },
            { label: 'CAT Percentile ≥ 95', points: 30 },
            { label: 'CAT Percentile 90–94', points: 25 },
            { label: 'CAT Percentile 85–89', points: 20 },
            { label: 'GMAT Score ≥ 700', points: 30 },
            { label: 'GMAT Score 650–699', points: 25 },
            { label: 'GMAT Score 600–649', points: 20 },
        ],
    },
    // ───────────── GROUP III ─────────────
    '3.1': {
        id: '3.1', group: 3, name: 'Industrial Visit Report (Min 4 Industries, S5/S6)',
        category: 'Industry Exposure & Academic Projects',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
    },
    '3.2': {
        id: '3.2', group: 3, name: 'Best Mini Project / Best Project / Best Seminar',
        category: 'Industry Exposure & Academic Projects',
        type: 'fixed',
        maxPoints: 5,
        pointsPerEntry: 5,
        note: 'Min class strength 30 students',
    },
    '3.3': {
        id: '3.3', group: 3, name: 'Long-Term Internship (Min 3.5 Months)',
        category: 'Industry Exposure & Academic Projects',
        type: 'fixed',
        maxPoints: 15,
        pointsPerEntry: 15,
        note: 'As per KTU Long-Term Internship Guidelines',
    },
    '3.4': {
        id: '3.4', group: 3, name: 'LEAP – IIT Madras Incubation Cell',
        category: 'Industry Exposure & Academic Projects',
        type: 'choice',
        maxPoints: 30,
        levels: [
            { label: 'LEAP Bootcamps (LPB01 & LPB02) Completed', points: 10 },
            { label: 'LEAP Course (LP1XX/LP2XX/LP3XX) Completed', points: 15 },
            { label: 'LEAP Project/Prototype (Assigned by LEAP Mentor)', points: 20 },
        ],
    },
    '3.5': {
        id: '3.5', group: 3, name: 'YIP – Young Innovators Programme (K-DISC)',
        category: 'Innovation & Entrepreneurship',
        type: 'choice',
        maxPoints: 35,
        levels: [
            { label: 'Idea Submitted (Accepted in YIP portal)', points: 5 },
            { label: 'Preliminary Winner (Shortlisted for District Round)', points: 10 },
            { label: 'District Level Winner / Finalist', points: 20 },
            { label: 'State Level Winner', points: 35 },
        ],
    },
    '3.6': {
        id: '3.6', group: 3, name: 'STRIDE – Social Technology & Research (K-DISC)',
        category: 'Innovation & Entrepreneurship',
        type: 'choice',
        maxPoints: 35,
        levels: [
            { label: 'Idea Submitted (Phase 1 Completed)', points: 5 },
            { label: 'Top 100+ Teams (Selected to Phase 2)', points: 10 },
            { label: 'Top 30+ Teams (State-Level Finalists, Phase 3)', points: 20 },
            { label: 'State Level Winners', points: 35 },
        ],
    },
    '3.7': {
        id: '3.7', group: 3, name: 'GDC AI Workforce Internship Program',
        category: 'Innovation & Entrepreneurship',
        type: 'choice',
        maxPoints: 35,
        levels: [
            { label: 'AI Grading Test Completed', points: 5 },
            { label: 'Learning Track Completed', points: 15 },
            { label: 'Fellowship Track Coursework Completed', points: 25 },
            { label: '6-Month Internship Completed (GDC Fellow)', points: 35 },
        ],
    },
    '3.8': {
        id: '3.8', group: 3, name: 'ICFOSS Certified FOSS Solution/Innovation',
        category: 'Innovation & Entrepreneurship',
        type: 'fixed',
        maxPoints: 25,
        pointsPerEntry: 25,
    },
    '3.9': {
        id: '3.9', group: 3, name: 'Registered Startup (MSME/DPIIT/ROC/Kerala Startup Mission)',
        category: 'Innovation & Entrepreneurship',
        type: 'fixed',
        maxPoints: 30,
        pointsPerEntry: 30,
    },
    '3.10': {
        id: '3.10', group: 3, name: 'Patents',
        category: 'Innovation & Entrepreneurship',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: 'Patent Filed (Application with IPO/WIPO)', points: 20 },
            { label: 'Patent Published (in Patent Journal)', points: 30 },
            { label: 'Patent Granted / Approved', points: 40 },
            { label: 'Patent Licensed (Technology licensed to industry)', points: 40 },
        ],
    },
    '3.11': {
        id: '3.11', group: 3, name: 'Prototype Development & Industry Adoption',
        category: 'Innovation & Entrepreneurship',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 40,
    },
    '3.12': {
        id: '3.12', group: 3, name: 'Venture Capital / Angel Funding',
        category: 'Innovation & Entrepreneurship',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 40,
    },
    '3.13': {
        id: '3.13', group: 3, name: 'Societal Innovation (via IEDC/Local Bodies/Govt Agencies)',
        category: 'Innovation & Entrepreneurship',
        type: 'fixed',
        maxPoints: 40,
        pointsPerEntry: 40,
    },
    '3.14': {
        id: '3.14', group: 3, name: 'Research Publication in Reputed Journals',
        category: 'Research Publications & Scholarly Output',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: 'SCI/SCIE/Scopus Q1–Q2 Journal', points: 40 },
            { label: 'SCI/SCIE/Scopus Q3–Q4 Journal', points: 25 },
        ],
    },
    '3.15': {
        id: '3.15', group: 3, name: 'National Hackathons (SIH, KAVACH, MoE, AICTE, etc.)',
        category: 'Hackathons',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: '1st Prize', points: 40 },
            { label: '2nd Prize', points: 35 },
            { label: '3rd Prize', points: 30 },
        ],
    },
    '3.16': {
        id: '3.16', group: 3, name: 'International Hackathons (NASA, Google, Microsoft, etc.)',
        category: 'Hackathons',
        type: 'choice',
        maxPoints: 40,
        levels: [
            { label: '1st Prize', points: 40 },
            { label: '2nd or 3rd Prize', points: 35 },
            { label: 'Participation', points: 30 },
        ],
    },
    '3.17': {
        id: '3.17', group: 3, name: 'Skilling Courses (KTU/K-DISC/SWAYAM/NPTEL Approved)',
        category: 'Skill Development Courses',
        type: 'hours',
        maxPoints: 40,
        pointsPerHour: 1,
        note: '1 point per hour, max 40 points. Only KTU-approved courses count.',
    },
};

// Get all activities by group
export function getActivitiesByGroup(group) {
    return Object.values(ACTIVITIES).filter(a => a.group === group);
}

// Calculate points for a single certificate submission
export function calculatePoints(activityId, selectedLevel, hours) {
    const activity = ACTIVITIES[activityId];
    if (!activity) return 0;

    if (activity.type === 'hours') {
        const h = parseFloat(hours) || 0;
        return Math.min(h * activity.pointsPerHour, activity.maxPoints);
    }

    if (activity.type === 'fixed') {
        return activity.pointsPerEntry;
    }

    if (activity.type === 'level' || activity.type === 'choice') {
        const level = activity.levels.find(l => l.label === selectedLevel);
        return level ? level.points : 0;
    }
    return 0;
}

// Calculate summary for a student (approved certificates only). Repeated records for
// one activity/event count once; participation/winner categories in an exclusive group
// also count only at their highest approved value.
export function calculateStudentSummary(certificates, studentType = 'regular') {
    const req = STUDENT_TYPES[studentType] || STUDENT_TYPES.regular;
    const groupRaw = { 1: 0, 2: 0, 3: 0 };
    const bestAwards = new Map();

    for (const cert of certificates) {
        if (cert.status !== 'approved') continue;
        const actId = cert.activity_id || cert.activityId;
        const activity = cert.activity_snapshot || cert.activitySnapshot || ACTIVITIES[actId];
        if (!activity || ![1, 2, 3].includes(activity.group)) continue;
        const points = Number(cert.points_awarded ?? cert.pointsAwarded ?? 0);
        if (!Number.isFinite(points) || points <= 0) continue;
        const version = cert.catalog_version || cert.catalogVersion || CATALOG_VERSION;
        const name = String(cert.event_name || cert.eventName || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const year = String(cert.activity_date || cert.activityDate || '').slice(0, 4);
        // Without a validated event identifier these remain provisional estimates.
        const event = name && year ? [name, year] : ['legacy', cert.id || JSON.stringify(cert)];
        const key = JSON.stringify([version, activity.group, activity.exclusiveGroup || actId, event]);
        const previous = bestAwards.get(key);
        if (!previous || points > previous.points) {
            bestAwards.set(key, { activity, version, points });
        }
    }
    const activityAwards = new Map();
    for (const award of bestAwards.values()) {
        const key = JSON.stringify([award.version, award.activity.id]);
        const previous = activityAwards.get(key);
        activityAwards.set(key, { ...award, points: (previous?.points || 0) + award.points });
    }
    for (const { activity, points } of activityAwards.values()) {
        groupRaw[activity.group] += Math.min(points, activity.maxPoints);
    }
    const group1 = Math.min(groupRaw[1], 40);
    const group2 = Math.min(groupRaw[2], 40);
    const group3 = Math.min(groupRaw[3], 40);
    const total = group1 + group2 + group3;
    return {
        group1, group2, group3, total,
        required: req.total, perGroupMin: req.perGroup, perGroupMax: 40,
        eligible: group1 >= req.perGroup && group2 >= req.perGroup && group3 >= req.perGroup && total >= req.total,
    };
}
