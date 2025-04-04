# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

    ```bash
    npm install
    ```

2. Start the app

    ```bash
     npx expo start
    ```

In the output, you'll find options to open the app in a

-   [development build](https://docs.expo.dev/develop/development-builds/introduction/)
-   [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
-   [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
-   [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

-   [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
-   [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

-   [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
-   [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

Tables created

```
create table students (
   id uuid default uuid_generate_v4() primary key,
   tutor_id text not null,
   name text not null,
   subject text not null,
   next_session_date timestamp,
   created_at timestamp default now()
);
```

```
create table session_notes (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references students(id) on delete cascade,
    session_date timestamp not null,
    subject text not null,
    topic text not null,
    lesson_summary text,
    homework_assigned text,
    engagement_level text check (engagement_level in ('Highly Engaged', 'Engaged', 'Neutral', 'Distracted')),
    tutor_notes text,
    parent_feedback text,
    created_at timestamp default now()
);
```

## Weekly Reminders Setup

The application includes a feature to send weekly reminders to tutors about adding session notes. To set this up:

1. Ensure your `.env` file contains the necessary Supabase credentials:

    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    ```

2. Test the reminders functionality:

    ```bash
    npm run test-reminders
    ```

    This will create test reminders for all tutors in the database.

3. To schedule weekly reminders automatically, you can use one of these methods:

    a. Using Windows Task Scheduler:

    - Open Task Scheduler
    - Create a new Basic Task
    - Set the trigger to Weekly
    - Set the action to "Start a program"
    - Program/script: `node`
    - Add arguments: `scripts/schedule-reminders.js`
    - Set the start time to your preferred time (e.g., Monday at 9:00 AM)

    b. Using a cron job (Linux/Mac):

    ```bash
    # Run every Monday at 9:00 AM
    0 9 * * 1 cd /path/to/your/project && node scripts/schedule-reminders.js
    ```

4. The reminders will appear in the notifications bell for each tutor when they log in.
