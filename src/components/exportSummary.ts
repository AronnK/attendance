import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";

export const generateSummaryPDF = async () => {
  // Fetch mentors data including present/absent counts
  const { data: mentors, error: mentorError } = await supabase
    .from("Mentors")
    .select("id, name, students_present, students_absent");

  if (mentorError) {
    throw new Error(`Error fetching mentors: ${mentorError.message}`);
  }

  mentors.sort((a, b) => a.id - b.id);

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Attendance Summary", 10, 10);

  // Table columns
  const tableColumns = [
    "Mentor Name",
    "Total Students",
    "Total Present",
    "Total Absent",
    "Absent Student Details",
    "Total Leave Days",
  ];

  const tableRows = [];

  for (const mentor of mentors) {
    // Fetch students' roll numbers for this mentor
    const { data: mentees, error: menteeError } = await supabase
      .from("Mentorship")
      .select("student_roll_no")
      .eq("mentor_id", mentor.id);

    if (menteeError) {
      throw new Error(`Error fetching mentees: ${menteeError.message}`);
    }

    const rollNumbers = mentees.map((mentee) => mentee.student_roll_no);

    // Fetch student details
    const { data: students, error: studentError } = await supabase
      .from("Students")
      .select("roll_no, name")
      .in("roll_no", rollNumbers);

    if (studentError) {
      throw new Error(`Error fetching students: ${studentError.message}`);
    }

    // Fetch attendance details
    const { data: attendances, error: attendanceError } = await supabase
      .from("Attendance")
      .select("student_roll_no, total_absent")
      .in("student_roll_no", rollNumbers);

    if (attendanceError) {
      throw new Error(`Error fetching attendance records: ${attendanceError.message}`);
    }

    // Fetch leave details
    const { data: leaveDetails, error: leaveError } = await supabase
      .from("LeaveDetails")
      .select("student_roll_no, leave_dates, reason")
      .in("student_roll_no", rollNumbers);

    if (leaveError) {
      throw new Error(`Error fetching leave details: ${leaveError.message}`);
    }

    // Process student attendance and leave details
    const attendanceMap = attendances.reduce((acc, record) => {
      acc[record.student_roll_no] = record;
      return acc;
    }, {} as Record<string, any>);

    const leaveMap = leaveDetails.reduce((acc, record) => {
      if (!acc[record.student_roll_no]) {
        acc[record.student_roll_no] = { reason: [], leave_dates: [] };
      }
      acc[record.student_roll_no].reason.push(record.reason);
      acc[record.student_roll_no].leave_dates.push(record.leave_dates);
      return acc;
    }, {} as Record<string, { reason: string[], leave_dates: Date[] }>);

    const absentDetails = students
      .filter((student) => attendanceMap[student.roll_no]?.total_absent > 0)
      .map((student) => {
        const leaves = leaveMap[student.roll_no];
        const latestReason = leaves ? leaves.reason.slice(-1)[0] : "N/A";
        const totalLeaveDays = leaves ? leaves.leave_dates.length : 0;
        return `${student.name}: ${latestReason}, ${totalLeaveDays} days`;
      })
      .join(", ");

    tableRows.push([
      mentor.name,
      mentor.students_present + mentor.students_absent,
      mentor.students_present,
      mentor.students_absent,
      absentDetails || "None",
      absentDetails ? `${absentDetails.split(',').length} days` : "N/A",
    ]);
  }

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
  });

  doc.save("attendance_summary.pdf");
};
