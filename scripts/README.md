# Scripts

This directory contains utility scripts for the Tutor-Track application.

## Weekly Reminders Script

The `schedule-reminders.js` script is designed to create weekly reminders for tutors to add session notes. This script should be run on a weekly basis.

### Prerequisites

-   Node.js installed
-   Access to the Supabase project
-   Environment variables set up in a `.env` file

### Environment Variables

Make sure your `.env` file contains the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Running the Script

You can run the script manually with:

```bash
node scripts/schedule-reminders.js
```

### Setting Up Automated Weekly Execution

#### Using Cron (Linux/macOS)

1. Open your crontab file:

```bash
crontab -e
```

2. Add a line to run the script weekly (e.g., every Monday at 9:00 AM):

```
0 9 * * 1 cd /path/to/Tutor-Track && node scripts/schedule-reminders.js >> /path/to/logs/reminders.log 2>&1
```

#### Using Windows Task Scheduler

1. Open Task Scheduler
2. Create a new Basic Task
3. Set the trigger to Weekly on Monday at 9:00 AM
4. Set the action to start a program
5. Program/script: `node`
6. Add arguments: `scripts/schedule-reminders.js`
7. Set the "Start in" field to your project directory

#### Using a Cloud Service

You can also set up this script to run on a cloud service like:

-   **Vercel Cron Jobs**: If your application is deployed on Vercel, you can use their cron job feature.
-   **AWS Lambda with EventBridge**: Set up a Lambda function that runs this script and trigger it with EventBridge.
-   **Google Cloud Functions with Cloud Scheduler**: Similar to AWS, but using Google Cloud services.

### Monitoring

The script logs its execution to the console. For automated runs, consider redirecting the output to a log file as shown in the cron example above.

### Troubleshooting

If the script fails to run:

1. Check that your environment variables are correctly set
2. Verify that you have the necessary permissions in Supabase
3. Check the logs for specific error messages
4. Ensure the script has the required dependencies installed
