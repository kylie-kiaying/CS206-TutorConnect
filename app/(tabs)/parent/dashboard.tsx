import React, { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Provider as PaperProvider,
  Snackbar,
} from "react-native-paper";
import { getSessionNotesByCode } from "../../../lib/sessionNotes";

type SessionNote = {
  id: string;
  session_date: string;
  subject: string;
  topic: string;
  lesson_summary: string;
  homework_assigned: string;
  engagement_level: string;
  tutor_notes: string;
  parent_feedback: string;
};

export default function ParentScreen() {
  const [studentCode, setStudentCode] = useState("");
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleFetchNotes = async () => {
    const notes = await getSessionNotesByCode(studentCode);
    console.log("Fetched Session Notes:", notes);
    if (notes) {
      setSessionNotes(notes);
      setSnackbarMessage("Session notes fetched successfully!");
    } else {
      setSnackbarMessage("Invalid student code or no session notes found.");
    }
    setSnackbarVisible(true);
  };

  return (
    <PaperProvider>
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Parent Dashboard</Title>

        {/* Student Code Input */}
        <TextInput
          label="Enter Student Code"
          value={studentCode}
          onChangeText={setStudentCode}
          mode="outlined"
          style={styles.input}
        />

        {/* Fetch Notes Button */}
        <Button
          mode="contained"
          onPress={handleFetchNotes}
          style={styles.button}
        >
          Fetch Session Notes
        </Button>

        {/* Display Session Notes */}
        {sessionNotes.map((note) => (
          <Card key={note.id} style={styles.card}>
            <Card.Content>
              <Title>{note.subject}</Title>
              <Paragraph>Topic: {note.topic}</Paragraph>
              <Paragraph>Date: {note.session_date}</Paragraph>
              <Paragraph>Engagement: {note.engagement_level}</Paragraph>
              <Paragraph>Homework: {note.homework_assigned}</Paragraph>
              <Paragraph>Tutor Notes: {note.tutor_notes}</Paragraph>
              <Paragraph>Parent Feedback: {note.parent_feedback}</Paragraph>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Snackbar for Feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    marginBottom: 20,
    backgroundColor: "white",
  },
  button: {
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
  },
});