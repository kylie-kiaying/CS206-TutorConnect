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

// Add a new student
export const addStudent = async (student: Omit<Student, "id">) => {
  const { data, error } = await supabase.from("students").insert([student]);
  if (error) {
    console.error("Error adding student:", error);
  }
  return data;
};

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
