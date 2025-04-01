import { supabase } from "./supabase";
import { createSessionNoteNotification } from "./notifications";

export type FileAttachment = {
  id: string;
  url: string;
  type: 'image' | 'pdf' | 'document';
  name: string;
};

export type SessionAttachment = {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
};

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
  file_url?: string; // First image URL for thumbnail
  attachments?: FileAttachment[];
  tutor?: {
    name: string;
    subject: string;
  };
};

// Fetch session notes for a student
export const getSessionNotes = async (student_id: string): Promise<SessionNote[]> => {
  if (!student_id) {
    console.error("No student ID provided to getSessionNotes");
    return [];
  }

  try {
    console.log(`Fetching session notes for student ID: ${student_id}`);
    
    // First, verify the student exists
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, name")
      .eq("id", student_id)
      .single();

    if (studentError) {
      console.error("Error checking student existence:", studentError);
      return [];
    }

    if (!studentData) {
      console.error(`No student found with ID: ${student_id}`);
      return [];
    }

    console.log(`Found student: ${studentData.name}`);

    // Now fetch the session notes
    const { data, error } = await supabase
      .from("session_notes")
      .select(`
        *,
        class:classes (
          id,
          name,
          subject
        ),
        topic:topics (
          id,
          name
        )
      `)
      .eq("student_id", student_id)
      .order("session_date", { ascending: false });

    if (error) {
      console.error("Error fetching session notes:", error);
      throw error;
    }

    console.log(`Raw session notes data:`, JSON.stringify(data, null, 2));

    if (!data) {
      console.log("No session notes found for student:", student_id);
      return [];
    }

    // Transform the data to match the expected format
    const transformedNotes = (data || []).map(note => {
      const transformedNote = {
        ...note,
        subject: note.class?.subject || note.class?.name || 'Unknown Class',
        topic: note.topic?.name || note.topic || 'Untitled Topic',
        class_id: note.class?.id || null,
        topic_id: note.topic?.id || null,
        attachments: [] // Initialize empty attachments array - we'll fetch these separately
      };
      
      return transformedNote;
    });

    console.log(`Successfully fetched ${transformedNotes.length} session notes for student ${student_id}`);
    return transformedNotes;
  } catch (error) {
    console.error("Error in getSessionNotes:", error);
    return [];
  }
};

// Add a new session note
export const addSessionNote = async (sessionNote: Omit<SessionNote, "id">) => {
  try {
    console.log("Starting addSessionNote process...");
    console.log("Full session note data:", JSON.stringify(sessionNote, null, 2));
    console.log("Attachments:", sessionNote.attachments);

    // Create a copy of the session note without attachments
    const { attachments, ...noteData } = sessionNote;

    // First, insert the session note
    const { data: insertedNote, error: noteError } = await supabase
      .from("session_notes")
      .insert([{
        ...noteData,
        file_url: noteData.file_url || null // We'll handle attachments separately
      }])
      .select()
      .single();
    
    if (noteError) {
      console.error("Error creating session note:", noteError);
      throw noteError;
    }
    if (!insertedNote) {
      console.error("Failed to create session note - no data returned");
      throw new Error("Failed to create session note");
    }

    console.log("Session note created successfully with ID:", insertedNote.id);

    // If there are attachments, create attachment records
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments...`);
      
      const attachmentPromises = attachments.map(async (attachment, index) => {
        console.log(`Processing attachment ${index + 1}:`, {
          name: attachment.name,
          type: attachment.type,
          url: attachment.url
        });

        try {
          // Create attachment record directly with the base64 URL
          const { error: attachmentError } = await supabase
            .from('session_attachments')
            .insert([{
              session_note_id: insertedNote.id,
              file_url: attachment.url,
              file_type: attachment.type,
              file_name: attachment.name
            }]);

          if (attachmentError) {
            console.error(`Error creating attachment record ${index + 1}:`, attachmentError);
            throw attachmentError;
          }

          console.log(`Attachment record ${index + 1} created successfully`);
        } catch (error) {
          console.error(`Failed to process attachment ${index + 1}:`, error);
          // Don't throw the error, just log it and continue with other attachments
          return null;
        }
      });

      console.log("Waiting for all attachments to process...");
      const results = await Promise.all(attachmentPromises);
      const successfulUploads = results.filter(r => r !== null).length;
      console.log(`Successfully processed ${successfulUploads} out of ${attachments.length} attachments`);
    } else {
      console.log("No attachments to process");
    }

    // Get the student's name
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("name")
      .eq("id", sessionNote.student_id)
      .single();

    if (studentError) {
      console.error("Error fetching student name:", studentError);
      return insertedNote;
    }

    // Get the parent's ID from parent_students table
    const { data: parentData, error: parentError } = await supabase
      .from("parent_students")
      .select("parent_id")
      .eq("student_id", sessionNote.student_id)
      .single();

    if (parentError) {
      console.error("Error fetching parent ID:", parentError);
      return insertedNote;
    }

    // Create notification for the parent
    if (parentData && studentData) {
      await createSessionNoteNotification(
        sessionNote.student_id,
        parentData.parent_id,
        studentData.name
      );
    }

    return insertedNote;
  } catch (error) {
    console.error("Error in addSessionNote:", error);
    throw error;
  }
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