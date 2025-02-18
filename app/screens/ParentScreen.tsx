import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { getSessionNotesByCode } from "../../lib/sessionNotes";

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

  const handleFetchNotes = async () => {
    const notes = await getSessionNotesByCode(studentCode);
    console.log("Fetched Session Notes:", notes);
    if (notes) {
      setSessionNotes(notes);
    } else {
      alert("Invalid student code or no session notes found.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent Dashboard</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Student Code"
        value={studentCode}
        onChangeText={setStudentCode}
      />
      <Button title="Fetch Session Notes" onPress={handleFetchNotes} />
      {/* Display session notes here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
});