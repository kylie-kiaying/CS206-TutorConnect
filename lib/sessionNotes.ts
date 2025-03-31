import { supabase } from "./supabase";
import { createSessionNoteNotification } from "./notifications";

export type SessionNote = {
  id: string;
  student_id: string;
  session_date: string;
  date?: string; // alias for session_date for compatibility
  subject?: string;
  topic?: string;
  class_id?: string | null;
  topic_id?: string | null;
  lesson_summary: string;
  homework_assigned: string;
  homework?: string; // alias for homework_assigned for compatibility
  engagement_level: "Highly Engaged" | "Engaged" | "Neutral" | "Distracted" | "Unattentive";
  understanding_level: "Excellent" | "Good" | "Fair" | "Needs Improvement" | "Poor" ;
  tutor_notes: string;
  notes?: string; // alias for tutor_notes for compatibility
  parent_feedback: string;
  assignment_completion?: number;
  duration?: number;
  status?: 'completed' | 'scheduled' | 'cancelled';
  objectives?: string[];
  nextSession?: string;
  topic_proficiency?: number; // Score from 1-10
  file_url?: string;
  tutor?: {
    name: string;
    subject: string;
  };
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
    return data;
  }

  // Get the student's name
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("name")
    .eq("id", sessionNote.student_id)
    .single();

  if (studentError) {
    console.error("Error fetching student name:", studentError);
    return data;
  }

  // Get the parent's ID from parent_students table
  const { data: parentData, error: parentError } = await supabase
    .from("parent_students")
    .select("parent_id")
    .eq("student_id", sessionNote.student_id)
    .single();

  if (parentError) {
    console.error("Error fetching parent ID:", parentError);
    return data;
  }

  // Create notification for the parent
  if (parentData && studentData) {
    await createSessionNoteNotification(
      sessionNote.student_id,
      parentData.parent_id,
      studentData.name
    );
  }

  return data;
};

// Update a session note
export const updateSessionNote = async (sessionNote: SessionNote) => {
  console.log("Updating session note with parent feedback:", sessionNote.parent_feedback);
  
  const { data, error } = await supabase
    .from("session_notes")
    .update({
      parent_feedback: sessionNote.parent_feedback
    })
    .eq("id", sessionNote.id)
    .select();

  if (error) {
    console.error("Error updating session note:", error);
    throw error; // Propagate the error to handle it in the UI
  }

  console.log("Session note updated successfully:", data);

  // If parent feedback was added or updated, notify the tutor
  if (sessionNote.parent_feedback) {
    // Get the student's name and tutor ID
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("name, tutor_id")
      .eq("id", sessionNote.student_id)
      .single();

    if (studentError) {
      console.error("Error fetching student data:", studentError);
      return data;
    }

    // Create notification for the tutor
    if (studentData) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'tutor',
          recipient_id: studentData.tutor_id,
          type: 'parent_feedback',
          message: `New parent feedback for ${studentData.name}`,
          is_read: false
        });

      if (notificationError) {
        console.error("Error creating tutor notification:", notificationError);
      }
    }
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