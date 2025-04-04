// This script is designed to be run weekly via a cron job or scheduled task
// It creates weekly reminders for tutors to add session notes

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createWeeklyReminder(tutorId) {
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

async function scheduleWeeklyReminders() {
  try {
    console.log('Starting to schedule weekly reminders...');
    
    // Get all tutors - updated to match the actual database schema
    const { data: tutors, error } = await supabase
      .from('tutors')
      .select('id');

    if (error) {
      console.error('Error fetching tutors:', error);
      return false;
    }

    console.log(`Found ${tutors.length} tutors. Creating reminders...`);

    // Create reminders for each tutor
    const promises = tutors.map(tutor => createWeeklyReminder(tutor.id));
    const results = await Promise.all(promises);
    
    const successCount = results.filter(Boolean).length;
    console.log(`Successfully created ${successCount} out of ${tutors.length} reminders.`);
    
    return true;
  } catch (error) {
    console.error('Error scheduling weekly reminders:', error);
    return false;
  }
}

// Execute the function
scheduleWeeklyReminders()
  .then(success => {
    if (success) {
      console.log('Weekly reminders scheduled successfully.');
    } else {
      console.error('Failed to schedule weekly reminders.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 