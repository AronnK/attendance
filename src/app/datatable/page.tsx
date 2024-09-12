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
};

export const columns: ColumnDef<Student>[] = [
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
];

const generatePDF = (data: Student[]) => {
  const sortedData = data.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  const doc = new jsPDF();
  const tableColumn = [
    "Roll Number",
    "Name",
    "Total Present",
    "Total Absent",
    "Today",
  ];
  const tableRows = sortedData.map((student) => [
    student.id,
    student.name,
    student.totalPresent,
    student.totalAbsent,
    student.today,
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
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const className = searchParams.get("class") || "AIDS-A";

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  React.useEffect(() => {
    const fetchData = async () => {
      const { data: supabaseData, error } = await supabase
        .from(className)
        .select(
          "id, Name, attendance_today, total_present, total_absent, attendance_percentage, total_days, leave_dates"
        );

      if (error) {
        console.error("Error fetching data from Supabase:", error);
        return;
      }

      const transformedData: Student[] = supabaseData.map((row: any) => ({
        id: String(row.id),
        name: row.Name,
        today: row.attendance_today ? "present" : "absent",
        totalPresent: row.total_present,
        totalAbsent: row.total_absent,
        attendancePercentage: parseFloat(row.attendance_percentage),
        totalDays: row.total_days,
        leaveDates: row.leave_dates,
      }));

      setData(transformedData);
    };

    fetchData();
  }, [className]);

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

  const handleDoneClick = async () => {
    const currentDate = new Date().toISOString().split("T")[0];
    let presentCount = 0;
    let absentCount = 0;

    for (const row of data) {
      const { id, today, totalPresent, totalDays, leaveDates } = row;
      const updatedTotalDays = totalDays + 1;
      let newTotalPresent = totalPresent;

      if (today === "present") {
        presentCount += 1;
        newTotalPresent += 1;
        const attendancePercentage = (
          (newTotalPresent / updatedTotalDays) *
          100
        ).toFixed(2);
        await supabase
          .from(className)
          .update({
            total_present: newTotalPresent,
            total_days: updatedTotalDays,
            attendance_percentage: parseFloat(attendancePercentage),
          })
          .eq("id", id);
      } else {
        absentCount += 1;
        const newLeaveDates = leaveDates
          ? [...leaveDates, currentDate]
          : [currentDate];
        const attendancePercentage = (
          (newTotalPresent / updatedTotalDays) *
          100
        ).toFixed(2);
        await supabase
          .from(className)
          .update({
            total_absent: row.totalAbsent + 1,
            total_days: updatedTotalDays,
            attendance_percentage: parseFloat(attendancePercentage),
            leave_dates: newLeaveDates,
          })
          .eq("id", id);
      }
    }

    // Refetch the updated data
    const { data: updatedData, error } = await supabase
      .from(className)
      .select(
        "id, Name, attendance_today, total_present, total_absent, attendance_percentage, total_days, leave_dates"
      );

    if (error) {
      console.error("Error fetching updated data from Supabase:", error);
      return;
    }

    const transformedData: Student[] = updatedData.map((row: any) => ({
      id: String(row.id),
      name: row.Name,
      today: row.attendance_today ? "present" : "absent",
      totalPresent: row.total_present,
      totalAbsent: row.total_absent,
      attendancePercentage: parseFloat(row.attendance_percentage),
      totalDays: row.total_days,
      leaveDates: row.leave_dates,
    }));

    setData(transformedData);

    setTotalPresent(presentCount);
    setTotalAbsent(absentCount);
    setShowSummary(true);
  };

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
                    onClick={() => handleRowClick(row.original)}
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

        <StudentInfo
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          student={selectedStudent}
          leaveDays={selectedStudent?.leaveDates || []}
        />
      </div>
      <Footer />
    </>
  );
}
