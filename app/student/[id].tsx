import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import {
  Appbar,
  TextInput,
  Button,
  Card,
  Modal,
  Portal,
  Provider as PaperProvider,
  Title,
  Paragraph,
  Snackbar,
} from "react-native-paper";
import RNPickerSelect from "react-native-picker-select";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getSessionNotes,
  addSessionNote,
  deleteSessionNote,
  updateSessionNote,
} from "../../lib/sessionNotes";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";

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

export default function StudentView() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Get student ID from URL
  const router = useRouter();
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState<SessionNote[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);

  // Sorting & Filtering States
  const [sortOrder, setSortOrder] = useState<"Newest" | "Oldest">("Newest");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Form State for New Session Note
  const [sessionDate, setSessionDate] = useState(new Date());
  const [subject, setSubject] = useState("Math");
  const [topic, setTopic] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [homeworkAssigned, setHomeworkAssigned] = useState("");
  const [engagementLevel, setEngagementLevel] = useState<
    "Highly Engaged" | "Engaged" | "Neutral" | "Distracted"
  >("Engaged");
  const [tutorNotes, setTutorNotes] = useState("");
  const [parentFeedback, setParentFeedback] = useState("");

  useEffect(() => {
    fetchSessionNotes();
  }, []);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [sessionNotes, sortOrder, selectedSubject]);

  const fetchSessionNotes = async () => {
    if (id) {
      const data = await getSessionNotes(id);
      setSessionNotes(data);
    }
  };

  // Apply Sorting and Filtering
  const applyFiltersAndSorting = () => {
    let filtered = sessionNotes;

    // Filter by subject
    if (selectedSubject) {
      filtered = filtered.filter((note) => note.subject === selectedSubject);
    }

    // Sort by date
    filtered = filtered.sort((a, b) =>
      sortOrder === "Newest"
        ? new Date(b.session_date).getTime() -
          new Date(a.session_date).getTime()
        : new Date(a.session_date).getTime() -
          new Date(b.session_date).getTime()
    );

    setFilteredNotes([...filtered]);
  };

  const handleAddOrUpdateSessionNote = async () => {
    if (!id) return;
    if (editingNote) {
      await updateSessionNote({
        ...editingNote,
        session_date: sessionDate.toISOString(),
        subject,
        topic,
        lesson_summary: lessonSummary,
        homework_assigned: homeworkAssigned,
        engagement_level: engagementLevel,
        tutor_notes: tutorNotes,
        parent_feedback: parentFeedback,
      });
      setSnackbarMessage("Session note updated successfully!");
    } else {
      await addSessionNote({
        student_id: id,
        session_date: sessionDate.toISOString(),
        subject,
        topic,
        lesson_summary: lessonSummary,
        homework_assigned: homeworkAssigned,
        engagement_level: engagementLevel,
        tutor_notes: tutorNotes,
        parent_feedback: parentFeedback,
      });
      setSnackbarMessage("Session note added successfully!");
    }
    fetchSessionNotes();
    setModalVisible(false);
    setSnackbarVisible(true);
    setEditingNote(null);
  };

  const handleDeleteSessionNote = async (noteId: string) => {
    await deleteSessionNote(noteId);
    fetchSessionNotes();
    setSnackbarMessage("Session note deleted successfully!");
    setSnackbarVisible(true);
  };

  const handleEditSessionNote = (note: SessionNote) => {
    setEditingNote(note);
    setSessionDate(new Date(note.session_date));
    setSubject(note.subject);
    setTopic(note.topic);
    setLessonSummary(note.lesson_summary);
    setHomeworkAssigned(note.homework_assigned);
    setEngagementLevel(note.engagement_level as any);
    setTutorNotes(note.tutor_notes);
    setParentFeedback(note.parent_feedback);
    setModalVisible(true);
  };

  return (
    <PaperProvider>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Session Notes" />
      </Appbar.Header>

      <View style={styles.container}>
        {/* Sorting Dropdown */}
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            onValueChange={(value: "Newest" | "Oldest") => setSortOrder(value)}
            items={[
              { label: "Newest First", value: "Newest" },
              { label: "Oldest First", value: "Oldest" },
            ]}
            value={sortOrder}
            style={pickerSelectStyles}
            placeholder={{ label: "Sort by...", value: null }}
            useNativeAndroidPickerStyle={false}
          />
        </View>

        {/* Filtering by Subject */}
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            onValueChange={(value) => setSelectedSubject(value)}
            items={[
              { label: "All Subjects", value: null },
              { label: "Math", value: "Math" },
              { label: "Science", value: "Science" },
              { label: "English", value: "English" },
            ]}
            value={selectedSubject}
            style={pickerSelectStyles}
            placeholder={{ label: "Filter by subject...", value: null }}
            useNativeAndroidPickerStyle={false}
          />
        </View>

        {/* Spacing between dropdowns and the first card */}
        <View style={styles.spacer} />

        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <Title>{item.subject}</Title>
                <Paragraph>Topic: {item.topic}</Paragraph>
                <Paragraph>
                  Date: {format(new Date(item.session_date), "PPPp")}
                </Paragraph>
                <Paragraph>Engagement: {item.engagement_level}</Paragraph>
                <Paragraph>Homework: {item.homework_assigned}</Paragraph>
                <Paragraph>Tutor Notes: {item.tutor_notes}</Paragraph>
                <Paragraph>Parent Feedback: {item.parent_feedback}</Paragraph>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleEditSessionNote(item)}>Edit</Button>
                <Button onPress={() => handleDeleteSessionNote(item.id)}>
                  Delete
                </Button>
              </Card.Actions>
            </Card>
          )}
        />

        {/* ADD SESSION NOTE BUTTON */}
        <Button
          mode="contained"
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        >
          Add Session Note
        </Button>

        {/* MODAL FOR ADDING/EDITING SESSION NOTE */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Title style={styles.modalTitle}>
              {editingNote ? "Edit Session Note" : "Add Session Note"}
            </Title>

            {/* DATE PICKER */}
            <DateTimePicker
              value={sessionDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (selectedDate) setSessionDate(selectedDate);
              }}
            />

            {/* SUBJECT INPUT */}
            <TextInput
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              style={styles.input}
            />

            {/* TOPIC INPUT */}
            <TextInput
              label="Topic Covered"
              value={topic}
              onChangeText={setTopic}
              style={styles.input}
            />

            {/* LESSON SUMMARY INPUT */}
            <TextInput
              label="Lesson Summary"
              value={lessonSummary}
              onChangeText={setLessonSummary}
              style={styles.input}
            />

            {/* HOMEWORK INPUT */}
            <TextInput
              label="Homework Assigned"
              value={homeworkAssigned}
              onChangeText={setHomeworkAssigned}
              style={styles.input}
            />

            {/* ENGAGEMENT LEVEL DROPDOWN */}
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={(
                  value: "Highly Engaged" | "Engaged" | "Neutral" | "Distracted"
                ) => setEngagementLevel(value)}
                items={[
                  { label: "Highly Engaged", value: "Highly Engaged" },
                  { label: "Engaged", value: "Engaged" },
                  { label: "Neutral", value: "Neutral" },
                  { label: "Distracted", value: "Distracted" },
                ]}
                value={engagementLevel}
                style={pickerSelectStyles}
                placeholder={{ label: "Select engagement level...", value: null }}
                useNativeAndroidPickerStyle={false}
              />
            </View>

            {/* ADD/UPDATE BUTTON */}
            <Button
              mode="contained"
              onPress={handleAddOrUpdateSessionNote}
              style={styles.modalButton}
            >
              {editingNote ? "Update Note" : "Add Note"}
            </Button>

            {/* CLOSE MODAL BUTTON */}
            <Button
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
          </Modal>
        </Portal>

        {/* SNACKBAR FOR FEEDBACK */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginBottom: 16,
    paddingHorizontal: 10,
    backgroundColor: "white",
  },
  spacer: {
    height: 16,
  },
  card: {
    marginBottom: 16,
  },
  addButton: {
    marginTop: 16,
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
  input: {
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 8,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: "black",
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "black",
  },
});