"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StudentInfo from "@/components/StudentInfo";

export type Student = {
  id: string;
  name: string;
  today: "present" | "absent";
  totalPresent: number;
  totalAbsent: number;
  totalDays: number;
  attendancePercentage: number;
  leaveDates: string[];
  reasonToday: string;
};

const generatePDF = (data: Student[]) => {
  const absenteesData = data.filter((student) => student.today === "absent");
  const sortedData = absenteesData.sort(
    (a, b) => parseInt(a.id) - parseInt(b.id)
  );
  const doc = new jsPDF();
  const tableColumn = ["Roll Number", "Name", "Total Absent", "Reason"];
  const tableRows = sortedData.map((student) => [
    student.id,
    student.name,
    student.totalAbsent,
    student.reasonToday,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
  });
  doc.save("attendance_report.pdf");
};

export default function DataTable() {
  const [data, setData] = React.useState<Student[]>([]);
  const [showSummary, setShowSummary] = React.useState(false);
  const [totalPresent, setTotalPresent] = React.useState(0);
  const [totalAbsent, setTotalAbsent] = React.useState(0);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "id", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(
    null
  );
  // const [isModalOpen, setIsModalOpen] = React.useState(false);
  const isModalOpen = selectedStudent ? true : false;
  const router = useRouter();
  const searchParams = useSearchParams();
  const mentorName = searchParams.get("mentor") || "mentor1";

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student);
  };

  React.useEffect(() => {
    const fetchData = async () => {
      const { data: mentor, error } = await supabase
        .from("Mentors")
        .select("id, students_present, students_absent")
        .eq("name", mentorName)
        .single();

      if (error || !mentor) {
        throw new Error(`Error fetching mentor ID: ${error?.message}`);
      }

      const mentorId = mentor.id;

      const { data: mentorships, error: mentorshipError } = await supabase
        .from("Mentorship")
        .select("student_roll_no")
        .eq("mentor_id", mentorId);

      if (mentorshipError) {
        throw new Error(
          `Error fetching mentorships: ${mentorshipError.message}`
        );
      }

      const studentRollNos = mentorships.map((m) => m.student_roll_no);

      if (studentRollNos.length === 0) {
        return []; // No students found
      }

      const { data: students, error: studentError } = await supabase
        .from("Students")
        .select("*")
        .in("roll_no", studentRollNos);

      if (studentError) {
        throw new Error(`Error fetching students: ${studentError.message}`);
      }

      const studentRollNoSet = new Set(studentRollNos);

      const { data: attendances, error: attendanceError } = await supabase
        .from("Attendance")
        .select("*")
        .in("student_roll_no", studentRollNos);

      if (attendanceError) {
        throw new Error(
          `Error fetching attendance records: ${attendanceError.message}`
        );
      }

      const { data: leaveDetails, error: leaveError } = await supabase
        .from("LeaveDetails")
        .select("student_roll_no, leave_dates, reason")
        .in("student_roll_no", studentRollNos);

      if (leaveError) {
        throw new Error(`Error fetching leave details: ${leaveError.message}`);
      }

      const attendanceMap = attendances.reduce((acc, record) => {
        acc[record.student_roll_no] = record;
        return acc;
      }, {} as Record<string, any>);

      const leaveMap = leaveDetails.reduce((acc, record) => {
        if (!acc[record.student_roll_no]) {
          acc[record.student_roll_no] = [];
        }
        acc[record.student_roll_no].push(record.leave_dates);
        return acc;
      }, {} as Record<string, string[]>);

      const transformedData: Student[] = students.map((student) => {
        const attendance = attendanceMap[student.roll_no] || {};
        const leaveDates = leaveMap[student.roll_no] || [];
        const reasonToday = attendance.attendance_today ? "present" : "absent";

        return {
          id: student.roll_no,
          name: student.name,
          today: attendance.attendance_today ? "present" : "absent",
          totalPresent: attendance.total_present || 0,
          totalAbsent: attendance.total_absent || 0,
          totalDays: attendance.total_days || 0,
          attendancePercentage:
            parseFloat(attendance.attendance_percentage) || 0,
          leaveDates,
          reasonToday: attendance.reason || "",
        };
      });
      console.log(transformedData);
      setData(transformedData);
    };

    fetchData();
  }, [mentorName]);
  const handleDoneClick = async () => {
    const currentDate = new Date().toISOString().split("T")[0];
    let presentCount = 0;
    let absentCount = 0;

    try {
      for (const row of data) {
        const {
          id,
          today,
          totalPresent,
          totalAbsent,
          totalDays,
          leaveDates,
          reasonToday,
        } = row;
        const updatedTotalDays = totalDays + 1;
        let newTotalPresent = totalPresent;

        if (today === "present") {
          presentCount += 1;
          newTotalPresent += 1;

          const attendancePercentage = (
            (newTotalPresent / updatedTotalDays) *
            100
          ).toFixed(2);

          // Update the Attendance table for the present student
          const { error: attendanceError } = await supabase
            .from("Attendance")
            .update({
              total_present: newTotalPresent,
              total_days: updatedTotalDays,
              attendance_percentage: parseFloat(attendancePercentage),
            })
            .eq("student_roll_no", id);

          if (attendanceError) {
            throw new Error(
              `Error updating attendance for student ${id}: ${attendanceError.message}`
            );
          }
        } else {
          absentCount += 1;

          // Fetch existing leave details for the student
          const { data: leaveData, error: leaveFetchError } = await supabase
            .from("LeaveDetails")
            .select("leave_dates, reason")
            .eq("student_roll_no", id)
            .single();

          if (leaveFetchError) {
            throw new Error(
              `Error fetching leave details for student ${id}: ${leaveFetchError.message}`
            );
          }

          // Append the new leave date and reason to the existing arrays
          const existingLeaveDates = leaveData?.leave_dates || [];
          const existingReasons = leaveData?.reason || [];

          const newLeaveDates = existingLeaveDates.includes(currentDate)
            ? existingLeaveDates
            : [...existingLeaveDates, currentDate];

          const newReasons = reasonToday
            ? [...existingReasons, reasonToday]
            : [...existingReasons, "No reason provided"];

          const attendancePercentage = (
            (newTotalPresent / updatedTotalDays) *
            100
          ).toFixed(2);

          const { error: attendanceError } = await supabase
            .from("Attendance")
            .update({
              total_absent: row.totalAbsent + 1,
              total_days: updatedTotalDays,
              attendance_percentage: parseFloat(attendancePercentage),
            })
            .eq("student_roll_no", id);

          if (attendanceError) {
            throw new Error(
              `Error updating attendance for student ${id}: ${attendanceError.message}`
            );
          }

          // Update the LeaveDetails table with the appended leave dates and reasons
          const { error: leaveUpdateError } = await supabase
            .from("LeaveDetails")
            .update({
              leave_dates: newLeaveDates, // Updated array of leave dates
              reason: newReasons, // Updated array of reasons
            })
            .eq("student_roll_no", id);

          if (leaveUpdateError) {
            throw new Error(
              `Error updating leave details for student ${id}: ${leaveUpdateError.message}`
            );
          }
        }
      }
      const { error: mentorUpdateError } = await supabase
        .from("Mentors")
        .update({
          students_present: presentCount,
          students_absent: absentCount,
        })
        .eq("name", mentorName); // Assuming you have mentorName available

      if (mentorUpdateError) {
        throw new Error(
          `Error updating mentor's present/absent count: ${mentorUpdateError.message}`
        );
      }

      console.log(
        `Attendance updated. Present: ${presentCount}, Absent: ${absentCount}`
      );
    } catch (error) {
      console.error("Error updating attendance and leave details:", error);
    }

    // Refetch the updated data
    const refetchUpdatedData = async (studentRollNos: string[]) => {
      try {
        const { data: students, error: studentError } = await supabase
          .from("Students")
          .select("roll_no, name")
          .in("roll_no", studentRollNos);

        if (studentError || !students) {
          throw new Error(`Error refetching students: ${studentError.message}`);
        }

        const { data: attendances, error: attendanceError } = await supabase
          .from("Attendance")
          .select(
            "student_roll_no, attendance_today, total_present, total_absent, total_days, attendance_percentage"
          )
          .in("student_roll_no", studentRollNos);

        if (attendanceError || !attendances) {
          throw new Error(
            `Error refetching attendance data: ${attendanceError.message}`
          );
        }

        const { data: leaveDetails, error: leaveError } = await supabase
          .from("LeaveDetails")
          .select("student_roll_no, leave_dates, reason")
          .in("student_roll_no", studentRollNos);

        if (leaveError || !leaveDetails) {
          throw new Error(
            `Error refetching leave details: ${leaveError.message}`
          );
        }

        const attendanceMap = attendances.reduce((acc, record) => {
          acc[record.student_roll_no] = record;
          return acc;
        }, {} as Record<string, any>);

        const leaveMap = leaveDetails.reduce((acc, record) => {
          if (!acc[record.student_roll_no]) {
            acc[record.student_roll_no] = { leave_dates: [], reason: [] };
          }
          acc[record.student_roll_no].leave_dates = record.leave_dates;
          acc[record.student_roll_no].reason = record.reason;
          return acc;
        }, {} as Record<string, { leave_dates: string[]; reason: string[] }>);

        const transformedData: Student[] = students.map((student) => {
          const attendance = attendanceMap[student.roll_no] || {};
          const leaveDetails = leaveMap[student.roll_no] || {
            leave_dates: [],
            reason: [],
          };
          const reasonToday = attendance.attendance_today
            ? ""
            : attendance.reason || "No reason";

          return {
            id: student.roll_no,
            name: student.name,
            today: attendance.attendance_today ? "present" : "absent",
            totalPresent: attendance.total_present || 0,
            totalAbsent: attendance.total_absent || 0,
            totalDays: attendance.total_days || 0,
            attendancePercentage:
              parseFloat(attendance.attendance_percentage) || 0,
            leaveDates: leaveDetails.leave_dates,
            reasonToday: reasonToday,
          };
        });

        console.log(transformedData);
        setData(transformedData);
      } catch (error) {
        console.error("Error refetching updated data:", error);
      }
    };

    setTotalPresent(presentCount);
    setTotalAbsent(absentCount);
    setShowSummary(true);
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "id",
      header: () => <div className="text-black">Roll Number</div>,
      cell: ({ row }) => (
        <div className="capitalize  text-black">{row.getValue("id")}</div>
      ),
    },
    {
      accessorKey: "name",
      header: () => <div className="text-black">Name</div>,
      cell: ({ row }) => (
        <div className="capitalize text-black">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "totalPresent",
      header: () => <div className="text-black">No of days present</div>,
      cell: ({ row }) => (
        <div className="text-black">{row.getValue("totalPresent")}</div>
      ),
    },
    {
      accessorKey: "totalAbsent",
      header: () => <div className="text-black">No of days absent</div>,
      cell: ({ row }) => (
        <div className="text-black">{row.getValue("totalAbsent")}</div>
      ),
    },
    {
      id: "today",
      header: () => <div className="text-black">Today</div>,
      cell: ({ row }) => {
        const [isChecked, setIsChecked] = React.useState(
          row.original.today === "present"
        );

        return (
          <Checkbox
            className="border-black"
            checked={isChecked}
            onCheckedChange={(value) => {
              setIsChecked(!!value);
              row.original.today = !!value ? "present" : "absent";
            }}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "reasonToday",
      header: () => <div className="text-black">Reason</div>,
      cell: ({ row }) => {
        const [reason, setReason] = React.useState("");
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setReason(e.target.value);
          row.original.reasonToday = e.target.value; // Update the row data with new reason
        };

        return (
          <input
            type="text"
            className="border-black p-1 text-black"
            value={reason}
            onChange={handleChange}
          />
        );
      },
    },
    {
      id: "showSummary",
      header: () => <div className="text-black">Show Summary</div>,
      cell: ({ row }) => {
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-black"
            onClick={() => handleRowClick(row.original)}
          >
            Show
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <>
      <Header />
      <div className="w-full bg-white">
        <div className="flex items-center py-4">
          <Input
            placeholder="Find Student..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm border border-black text-black"
          />
        </div>

        <div className="rounded-md border-black">
          <Table>
            <TableHeader className="border border-black">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="border border-black"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border border-black"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-black"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            className="text-black"
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          {table.getCanNextPage() ? (
            <Button
              className="text-black"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          ) : (
            <Button
              className="text-black"
              variant="outline"
              size="sm"
              onClick={handleDoneClick}
            >
              Done
            </Button>
          )}
        </div>

        {showSummary && (
          <Card className="bg-white text-black w-[400px] mx-auto mt-8">
            <CardHeader>
              <CardTitle>Attendance Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <div>Total Present:</div>
                <div>{totalPresent}</div>
              </div>
              <div className="flex justify-between">
                <div>Total Absent:</div>
                <div>{totalAbsent}</div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSummary(false);
                  router.push("/");
                }}
              >
                Close
              </Button>
              <Button onClick={() => generatePDF(data)}>Export PDF</Button>
            </CardFooter>
          </Card>
        )}
        {isModalOpen && selectedStudent && (
          <StudentInfo
            student={selectedStudent}
            isOpen={isModalOpen}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </div>
      <Footer />
    </>
  );
}
