import { supabase } from "./supabase";

export type SessionNote = {
  id: string;
  student_id: string;
  session_date: string;
  subject: string;
  topic: string;
  lesson_summary: string;
  homework_assigned: string;
  engagement_level: "Highly Engaged" | "Engaged" | "Neutral" | "Distracted";
  tutor_notes: string;
  parent_feedback: string;
};

// Fetch session notes for a student
export const getSessionNotes = async (student_id: string): Promise<SessionNote[]> => {
  const { data, error } = await supabase
    .from("session_notes")
    .select("*")
    .eq("student_id", student_id)
    .order("session_date", { ascending: false });

  if (error) {
    console.error("Error fetching session notes:", error);
    return [];
  }
  return data;
};

// Add a new session note
export const addSessionNote = async (sessionNote: Omit<SessionNote, "id">) => {
  const { data, error } = await supabase.from("session_notes").insert([sessionNote]);
  if (error) {
    console.error("Error adding session note:", error);
  }
  return data;
};

// Update a session note
export const updateSessionNote = async (sessionNote: SessionNote) => {
  const { data, error } = await supabase
    .from("session_notes")
    .update(sessionNote)
    .eq("id", sessionNote.id);
  if (error) {
    console.error("Error updating session note:", error);
  }
  return data;
};

// Delete a session note
export const deleteSessionNote = async (id: string) => {
  const { error } = await supabase.from("session_notes").delete().eq("id", id);
  if (error) {
    console.error("Error deleting session note:", error);
  }
};

export async function getSessionNotesByCode(code: string) {
  const { data, error } = await supabase
    .from("session_notes")
    .select("*")
    .eq("student_id", (await getStudentIdByCode(code)) || "");

  if (error) {
    console.error("Error fetching session notes:", error);
    return null;
  }

  return data;
}

async function getStudentIdByCode(code: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("student_codes")
    .select("student_id")
    .eq("code", code)
    .single();

  if (error) {
    console.error("Error fetching student ID by code:", error);
    return null;
  }

  return data?.student_id || null;
}