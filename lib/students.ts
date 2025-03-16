import { supabase } from "./supabase";

export type Student = {
  id: string;
  tutor_id: string;
  name: string;
  subject: string;
  next_session_date: string | null;
};

// Fetch all students
export const getStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase.from("students").select("*");
  if (error) {
    console.error("Error fetching students:", error);
    return [];
  }
  return data;
};

// Fetch students by tutor ID
export const getStudentsByTutorId = async (tutorId: string): Promise<Student[]> => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("tutor_id", tutorId);
    
  if (error) {
    console.error("Error fetching students for tutor:", error);
    return [];
  }
  return data || [];
};

// Add a new student
export async function addStudent(student: Omit<Student, "id">): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .insert([student])
    .select(); // Ensure we get the inserted data back

  if (error || !data || data.length === 0) {
    console.error("Error adding student:", error);
    return null;
  }

  const newStudent = data[0];

  // Generate a unique student code
  const studentCode = generateStudentCode();

  // Insert the student code into the student_codes table
  const { error: codeError } = await supabase
    .from("student_codes")
    .insert([{ student_id: newStudent.id, code: studentCode }]);

  if (codeError) {
    console.error("Error adding student code:", codeError);
    return null;
  }

  return newStudent;
}

function generateStudentCode() {
  // Implement a logic to generate a unique student code
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Delete student
export const deleteStudent = async (id: string) => {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    console.error("Error deleting student:", error);
  }
};

// Edit student name
export const editStudent = async (id: string, name: string) => {
  const { error } = await supabase
    .from("students")
    .update({ name })
    .eq("id", id);
  if (error) {
    console.error("Error editing student:", error);
  }
};
