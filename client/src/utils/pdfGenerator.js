import jsPDF from 'jspdf';
import { getActivityForCertificate } from './points';

export function generateApprovalPDF(certificate, student, faculty) {
    const doc = new jsPDF();
    const activity = getActivityForCertificate(certificate);

    // Header background
    doc.setFillColor(15, 23, 42); // dark blue
    doc.rect(0, 0, 210, 40, 'F');

    // University name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('APJ Abdul Kalam Technological University', 105, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Faculty Activity Submission Review Record', 105, 25, { align: 'center' });

    doc.setFontSize(9);
    doc.text('KTU Activity Point Management System', 105, 33, { align: 'center' });

    // Divider
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1);
    doc.line(14, 44, 196, 44);

    // Student Info Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 14, 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const studentInfo = [
        ['Name', student.name || 'Unknown'],
        ['Roll Number', student.rollNo || student.roll_no || 'N/A'],
        ['Department', student.department || 'N/A'],
        ['Student Type', (student.studentType || student.student_type || 'regular').toUpperCase()],
        ['Email', student.email || 'N/A'],
    ];
    let y = 62;
    for (const [label, value] of studentInfo) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 18, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 70, y);
        y += 8;
    }

    // Certificate Details Section
    y += 4;
    const activityId = certificate.activity_id || certificate.activityId || activity?.id || 'N/A';
    const description = String(certificate.description || 'N/A');
    const details = [
        ['Activity ID', activityId],
        ['Activity Name', activity ? activity.name : (certificate.activityName || 'N/A')],
        ['Group', `Group ${activity ? activity.group : 'N/A'} — ${activity ? activity.category : ''}`],
        ['Level / Type', certificate.selectedLevel || certificate.level_selected || 'N/A'],
        ['Sub-details', description.length > 180 ? `${description.slice(0, 177)}… (full details in APMS)` : description],
        ['Date of Activity', certificate.activity_date || certificate.activityDate || (certificate.created_at ? new Date(certificate.created_at).toLocaleDateString('en-IN') : 'N/A')],
        ['Academic Year', certificate.academic_year || certificate.academicYear || 'Not recorded'],
    ];
    const detailRows = details.map(([label, value]) => ({ label, lines: doc.splitTextToSize(String(value), 120) }));
    const detailsHeight = 18 + detailRows.reduce((height, row) => height + Math.max(1, row.lines.length) * 7, 0);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y - 4, 182, detailsHeight, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Activity Details', 18, y + 4);
    doc.setFontSize(10);
    y += 12;
    for (const { label, lines } of detailRows) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(`${label}:`, 18, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(lines, 75, y);
        y += Math.max(7, lines.length * 7);
    }

    // Points Awarded Box
    y += 6;
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(14, y, 182, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Points Awarded:', 22, y + 13);
    doc.setFontSize(20);
    doc.text(`${certificate.points_awarded ?? certificate.pointsAwarded ?? 0} pts`, 170, y + 13, { align: 'right' });

    // Approval Details
    y += 36;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Verification Details', 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const approval = [
        ['Approved By', faculty.name || 'System'],
        ['Designation', faculty.designation || 'Faculty'],
        ['Approval Date', certificate.approvedAt || certificate.reviewed_at ? new Date(certificate.approvedAt || certificate.reviewed_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')],
        ['Remarks', String(certificate.notes || certificate.facultyRemark || 'Approved').slice(0, 180)],
    ];
    y += 8;
    for (const [label, value] of approval) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 18, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 70, y);
        y += 8;
    }

    // Estimates are not university-issued certificates and remain subject to eligibility review.
    doc.setTextColor(103, 91, 119);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('APMS progress totals are estimates. This record is not an official KTU certificate.', 105, Math.min(y + 12, 268), { align: 'center' });

    // Footer
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This document is system-generated by the KTU Activity Point Management System.', 105, 288, { align: 'center' });
    doc.text('Verify authenticity with your Student Faculty Advisor.', 105, 294, { align: 'center' });

    // Save
    const sName = student?.name ? student.name.replace(/\s/g, '_') : 'Student';
    const sRoll = student?.rollNo || student?.roll_no || sName;
    const filename = `KTU_ActivityPoints_${sRoll}_${certificate.id}.pdf`;
    doc.save(filename);
    return filename;
}

