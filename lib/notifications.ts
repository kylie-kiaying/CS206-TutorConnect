import { supabase } from './supabase';

export async function createWeeklyReminder(tutorId: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_type: 'tutor',
      recipient_id: tutorId,
      type: 'weekly_reminder',
      message: 'Please input your session notes for this week',
      is_read: false
    });

  if (error) {
    console.error('Error creating weekly reminder:', error);
    return false;
  }

  return true;
}

export async function createSessionNoteNotification(studentId: string, parentId: string, studentName: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_type: 'parent',
      recipient_id: parentId,
      type: 'session_note',
      message: `A new session note has been added for ${studentName}`,
      is_read: false
    });

  if (error) {
    console.error('Error creating session note notification:', error);
    return false;
  }

  return true;
}

// Function to schedule weekly reminders
export async function scheduleWeeklyReminders() {
  try {
    // Get all tutors
    const { data: tutors, error } = await supabase
      .from('tutors')
      .select('id');

    if (error) throw error;

    // Create reminders for each tutor
    const promises = tutors.map(tutor => createWeeklyReminder(tutor.id));
    await Promise.all(promises);

    return true;
  } catch (error) {
    console.error('Error scheduling weekly reminders:', error);
    return false;
  }
} 