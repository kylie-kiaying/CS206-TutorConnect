import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Provider as PaperProvider,
  Snackbar,
  Modal,
  Portal,
} from "react-native-paper";
import {
  getSessionNotesByCode,
  updateSessionNote,
} from "../../../lib/sessionNotes";

type SessionNote = {
  id: string;
  student_id: string;
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
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState<SessionNote | null>(null);
  const [parentFeedback, setParentFeedback] = useState("");

  const handleFetchNotes = async () => {
    const notes = await getSessionNotesByCode(studentCode);
    if (notes) {
      setSessionNotes(notes);
      setSnackbarMessage("Session notes fetched successfully!");
    } else {
      setSnackbarMessage("Invalid student code or no session notes found.");
    }
    setSnackbarVisible(true);
  };

  const handleOpenFeedbackModal = (note: SessionNote) => {
    setCurrentNote(note);
    setParentFeedback(note.parent_feedback);
    setFeedbackModalVisible(true);
  };

  const handleSaveFeedback = async () => {
    if (currentNote) {
      await updateSessionNote({
        ...currentNote,
        parent_feedback: parentFeedback,
        student_id: currentNote.student_id,
        engagement_level: currentNote.engagement_level as
          | "Highly Engaged"
          | "Engaged"
          | "Neutral"
          | "Distracted",
      });
      setSnackbarMessage("Feedback updated successfully!");
      setFeedbackModalVisible(false);
      handleFetchNotes();
    }
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
            <Card.Actions>
              <Button onPress={() => handleOpenFeedbackModal(note)}>
                Feedback
              </Button>
            </Card.Actions>
          </Card>
        ))}

        {/* Snackbar for Feedback */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>

        {/* Feedback Modal */}
        <Portal>
          <Modal
            visible={feedbackModalVisible}
            onDismiss={() => setFeedbackModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Title style={styles.modalTitle}>Provide Feedback</Title>
            <TextInput
              label="Parent Feedback"
              value={parentFeedback}
              onChangeText={setParentFeedback}
              mode="outlined"
              multiline
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleSaveFeedback}
              style={styles.modalButton}
            >
              Save Feedback
            </Button>
            <Button
              onPress={() => setFeedbackModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
          </Modal>
        </Portal>
      </ScrollView>
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
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 8,
  },
});
