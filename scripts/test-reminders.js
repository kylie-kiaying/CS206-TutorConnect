// This script is for testing the weekly reminders functionality
// It creates a test notification for a specific tutor

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

async function createTestReminder(tutorId) {
  console.log(`Creating test reminder for tutor ID: ${tutorId}`);
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_type: 'tutor',
      recipient_id: tutorId,
      type: 'weekly_reminder',
      message: 'TEST: Please input your session notes for this week',
      is_read: false
    });

  if (error) {
    console.error('Error creating test reminder:', error);
    return false;
  }

  console.log('Test reminder created successfully!');
  return true;
}

async function getTutors() {
  // Updated to match the actual database schema
  const { data, error } = await supabase
    .from('tutors')
    .select('id, email');

  if (error) {
    console.error('Error fetching tutors:', error);
    return [];
  }

  return data;
}

async function main() {
  try {
    // Get all tutors
    const tutors = await getTutors();
    
    if (tutors.length === 0) {
      console.error('No tutors found in the database.');
      process.exit(1);
    }
    
    console.log(`Found ${tutors.length} tutors:`);
    tutors.forEach((tutor, index) => {
      console.log(`${index + 1}. ${tutor.email} (ID: ${tutor.id})`);
    });
    
    // Ask for tutor ID to test with
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Enter the number of the tutor to test with (1-' + tutors.length + '): ', async (answer) => {
      const index = parseInt(answer) - 1;
      
      if (isNaN(index) || index < 0 || index >= tutors.length) {
        console.error('Invalid selection.');
        readline.close();
        process.exit(1);
      }
      
      const selectedTutor = tutors[index];
      console.log(`Selected tutor: ${selectedTutor.email} (ID: ${selectedTutor.id})`);
      
      // Create test reminder
      await createTestReminder(selectedTutor.id);
      
      readline.close();
      console.log('Test completed. Check the notifications in the app.');
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 