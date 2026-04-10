# Activity Point Management System (APMS)

## Project Abstract

The **Activity Point Management System (APMS)** is a full-stack web application built to digitize and streamline the management of co-curricular and extra-curricular activity points for students under the **APJ Abdul Kalam Technological University (KTU) 2024 Curriculum Scheme**.

---

## The Problem

KTU mandates that every B.Tech, B.Des, BBA, and BCA student earn a minimum of **120 Activity Points** — distributed across three groups (Arts/Sports/Community, Technical/Professional, and Innovation/Research/Industry) — to qualify for **3 Activity Credits**, which are **compulsory for the award of their degree**. Managing this process — students submitting certificates, faculty verifying them, and admins configuring rules — has traditionally been a manual, paper-heavy process prone to errors and delays.

---

## The Solution

APMS provides a **role-based web platform** with three portals:

### 🎓 Student Portal
- Upload certificates for activities (sports, hackathons, internships, NCC/NSS, publications, etc.)
- Select the activity category and level
- Track submission status (pending / approved / rejected)
- Monitor points progress across all three KTU activity groups

### 👨‍🏫 Faculty Portal
- Review submitted certificates from students
- Approve or reject submissions with notes
- Override auto-calculated points when needed
- Manage students under their department with a clear dashboard view

### 🏛️ Admin Portal
- Manage departments and user accounts
- Post and manage circulars/announcements
- Customize point grading rules (how many points each activity awards at each level)
- System-wide configuration and oversight

---

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | React (Vite) — modern, desktop-first UI with light/dark themes |
| Backend    | Node.js + Express REST API                       |
| Database   | Supabase (PostgreSQL) with Row Level Security    |
| Auth       | JWT-based authentication with role-based access control |

---

## Key Features

- 📤 **Certificate Upload** — File attachments with activity metadata
- ✅ **Faculty Review Workflow** — Approve/reject with optional points override
- 📊 **Dashboard** — Real-time points tracking across all three KTU activity groups
- 🏛️ **Admin Management** — Departments, circulars, and grading rule configuration
- 👤 **Profile Management** — Editable profiles for students and faculty
- 🔒 **Role-Based Access** — Secure Student / Faculty / Admin portals
- 📱 **Responsive Design** — Professional UI optimized for desktop and mobile

---

## KTU Activity Points Overview

Under the 2024 scheme, activity points are organized into **three groups**, and students must earn at least **40 points from each group**:

| Group   | Category                                                                 |
|---------|--------------------------------------------------------------------------|
| Group I | Arts, Sports, Cultural Activities, NSS/NCC, Community Service            |
| Group II| Technical Events, Professional Societies, Internships, Proficiency Tests  |
| Group III| Innovation, Research Publications, Patents, Startups, Skilling Courses   |

**Special requirements:**
- **Regular students:** Minimum 120 points (40 per group)
- **Lateral entry students:** Minimum 90 points (30 per group)
- **PwD students:** Minimum 60 points (20 per group)

---

## In One Line

> APMS is a digital platform that automates KTU's mandatory activity point tracking — letting students submit certificates, faculty verify them, and admins manage the rules — replacing the traditional paper-based process with a streamlined, role-based web application.

---

*APJ Abdul Kalam Technological University — Activity Points Handbook, 2024 Scheme*
