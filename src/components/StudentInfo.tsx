"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns"; // Utility for formatting dates

type Student = {
  id: string;
  name: string;
  totalPresent: number;
  totalAbsent: number;
  leaveDates: string[];
};

interface StudentInfoProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  leaveDates?: string[]; // Optional leave days
}

const StudentInfo: React.FC<StudentInfoProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  // Format leave days to "dd-mm" format
  const formattedLeaveDates =
    student?.leaveDates && student.leaveDates.length > 0
      ? student.leaveDates
          .map((date) => format(new Date(date), "dd-MM"))
          .join(", ")
      : "NIL"; // Show "NIL" if no leave days are found

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student?.name}'s Attendance</DialogTitle>
        </DialogHeader>
        <Card className="bg-white text-black w-[400px] mx-auto mt-8">
          <CardHeader>
            <CardTitle>Total Days Present: {student?.totalPresent}</CardTitle>
            <CardTitle>Total Days Absent: {student?.totalAbsent}</CardTitle>
            <CardTitle>Days Absent: {formattedLeaveDates}</CardTitle>
            <CardTitle>
              Attendance Percentage:{" "}
              {student
                ? (
                    (student.totalPresent /
                      (student.totalPresent + student.totalAbsent)) *
                    100
                  ).toFixed(2)
                : "N/A"}
              %
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* You can add additional content here if needed */}
          </CardContent>
          <CardFooter>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default StudentInfo;
