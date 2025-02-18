import { supabase } from "./supabase";

export async function getStudentCode(studentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("student_codes")
    .select("code")
    .eq("student_id", studentId)
    .single();

  if (error) {
    console.error("Error fetching student code:", error);
    return null;
  }

  return data?.code || null;
}