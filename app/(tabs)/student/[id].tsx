import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getSessionNotes,
  addSessionNote,
  deleteSessionNote,
} from "../../../lib/sessionNotes";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import ModalComponent from "react-native-modal";

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

export default function StudentView() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Get student ID from URL
  const router = useRouter();
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState<SessionNote[]>([]);

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

  const handleAddSessionNote = async () => {
    if (!id) return;
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
    fetchSessionNotes();
    setModalVisible(false);
  };

  const handleDeleteSessionNote = async (noteId: string) => {
    await deleteSessionNote(noteId);
    fetchSessionNotes();
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
        Session Notes
      </Text>

      {/* Sorting Dropdown */}
      <RNPickerSelect
        onValueChange={(value: "Newest" | "Oldest") => setSortOrder(value)}
        items={[
          { label: "Newest First", value: "Newest" },
          { label: "Oldest First", value: "Oldest" },
        ]}
        value={sortOrder}
      />

      {/* Filtering by Subject */}
      <RNPickerSelect
        onValueChange={(value) => setSelectedSubject(value)}
        items={[
          { label: "All Subjects", value: null },
          { label: "Math", value: "Math" },
          { label: "Science", value: "Science" },
          { label: "English", value: "English" },
        ]}
        value={selectedSubject}
      />

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 15,
              backgroundColor: "#f2f2f2",
              marginBottom: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>{item.subject}</Text>
            <Text>Topic: {item.topic}</Text>
            <Text>Date: {format(new Date(item.session_date), "PPPp")}</Text>
            <Text>Engagement: {item.engagement_level}</Text>
            <Text>Homework: {item.homework_assigned}</Text>
            <TouchableOpacity onPress={() => handleDeleteSessionNote(item.id)}>
              <Text style={{ color: "red", marginTop: 5 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* ADD SESSION NOTE BUTTON */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: "blue",
          padding: 15,
          borderRadius: 10,
          marginTop: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Add Session Note
        </Text>
      </TouchableOpacity>

      {/* MODAL FOR ADDING SESSION NOTE */}
      <ModalComponent isVisible={modalVisible}>
        <View
          style={{ backgroundColor: "white", padding: 20, borderRadius: 10 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            Add Session Note
          </Text>

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
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            style={{
              borderColor: "#ccc",
              borderWidth: 1,
              padding: 8,
              marginBottom: 5,
            }}
          />

          {/* TOPIC INPUT */}
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="Topic Covered"
            style={{
              borderColor: "#ccc",
              borderWidth: 1,
              padding: 8,
              marginBottom: 5,
            }}
          />

          {/* LESSON SUMMARY INPUT */}
          <TextInput
            value={lessonSummary}
            onChangeText={setLessonSummary}
            placeholder="Lesson Summary"
            style={{
              borderColor: "#ccc",
              borderWidth: 1,
              padding: 8,
              marginBottom: 5,
            }}
          />

          {/* HOMEWORK INPUT */}
          <TextInput
            value={homeworkAssigned}
            onChangeText={setHomeworkAssigned}
            placeholder="Homework Assigned"
            style={{
              borderColor: "#ccc",
              borderWidth: 1,
              padding: 8,
              marginBottom: 5,
            }}
          />

          {/* ENGAGEMENT LEVEL DROPDOWN */}
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
          />

          {/* ADD BUTTON */}
          <TouchableOpacity
            onPress={handleAddSessionNote}
            style={{
              backgroundColor: "green",
              padding: 10,
              marginTop: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Add Note
            </Text>
          </TouchableOpacity>

          {/* CLOSE MODAL BUTTON */}
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: "red", textAlign: "center" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ModalComponent>

      {/* GO BACK BUTTON */}
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={{ color: "blue" }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
