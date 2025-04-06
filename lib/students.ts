import { supabase } from "./supabase";

export type Student = {
  id: string;
  tutor_id: string;
  name: string;
};

export type Session = {
  id: string;
  student_id: string;
  subject: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // Format: "HH:MM" in 24-hour format
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

// Get all sessions for a student
export const getSessionsByStudentId = async (studentId: string): Promise<Session[]> => {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", studentId);
    
  if (error) {
    console.error("Error fetching sessions for student:", error);
    return [];
  }
  return data || [];
};

// Check if a student code already exists
async function codeExists(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("student_codes")
    .select("id")
    .eq("code", code)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error("Error checking if code exists:", error);
    return false;
  }
  
  return !!data;
}

// Add a new student with initial sessions
export async function addStudent(
  studentData: Omit<Student, "id">, 
  sessions: Omit<Session, "id" | "student_id">[]
): Promise<Student | null> {
  // Start a transaction
  const { data, error } = await supabase
    .from("students")
    .insert([studentData])
    .select(); // Ensure we get the inserted data back

  if (error || !data || data.length === 0) {
    console.error("Error adding student:", error);
    return null;
  }

  const newStudent = data[0];

  // Generate a unique student code
  let studentCode = generateStudentCode();
  let attempts = 0;
  const maxAttempts = 5;
  
  // Try to generate a unique code
  while (attempts < maxAttempts) {
    if (!(await codeExists(studentCode))) {
      break;
    }
    studentCode = generateStudentCode();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    console.error("Failed to generate a unique student code after", maxAttempts, "attempts");
  }

  // Insert the student code into the student_codes table
  const { error: codeError } = await supabase
    .from("student_codes")
    .insert([{ student_id: newStudent.id, code: studentCode }]);

  if (codeError) {
    console.error("Error adding student code:", codeError);
    console.error("Student ID:", newStudent.id);
    console.error("Generated Code:", studentCode);
    // Don't return null here, continue with the student creation
    // The code might still be added later
  }

  // Add sessions if provided
  if (sessions.length > 0) {
    const sessionsWithStudentId = sessions.map(session => ({
      ...session,
      student_id: newStudent.id
    }));

    const { error: sessionError } = await supabase
      .from("sessions")
      .insert(sessionsWithStudentId);

    if (sessionError) {
      console.error("Error adding sessions:", sessionError);
      // Consider handling this error better - perhaps delete the student if sessions fail to add
    }
  }

  return newStudent;
}

function generateStudentCode() {
  // Create a more unique code by combining random string with timestamp
  const timestamp = Date.now().toString(36).substring(2, 6);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}${random}`.toUpperCase();
}

// Delete student (will cascade delete sessions)
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

// Add a new session for a student
export const addSession = async (session: Omit<Session, "id">): Promise<Session | null> => {
  const { data, error } = await supabase
    .from("sessions")
    .insert([session])
    .select();
  
  if (error || !data || data.length === 0) {
    console.error("Error adding session:", error);
    return null;
  }
  
  return data[0];
};

// Update a session
export const updateSession = async (id: string, updates: Partial<Omit<Session, "id" | "student_id">>): Promise<void> => {
  const { error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id);
  
  if (error) {
    console.error("Error updating session:", error);
  }
};

// Delete a session
export const deleteSession = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting session:", error);
  }
};

// Helper function to get the next upcoming session date for a day of week
export const getNextSessionDate = (dayOfWeek: number): Date => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days until the next session
  const daysUntilSession = (dayOfWeek + 7 - currentDay) % 7;
  
  // If it's the same day but we've already passed the time, make it next week
  if (daysUntilSession === 0) {
    // This logic can be enhanced when we have the time component
    // For now, if it's the same day, schedule for next week
    today.setDate(today.getDate() + 7);
  } else {
    today.setDate(today.getDate() + daysUntilSession);
  }
  
  return today;
};

// Get day name from day number
export const getDayName = (day: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};
