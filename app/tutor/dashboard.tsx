import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import Clipboard from '@react-native-clipboard/clipboard';
import { FlatList, TouchableOpacity } from "react-native";
import {
  TextInput,
  Card,
  Button as PaperButton,
  IconButton,
  Menu,
  Modal,
  Appbar,
} from "react-native-paper";
import {
  getStudentsByTutorId,
  addStudent,
  deleteStudent,
  editStudent,
} from "../../lib/students";
import { useRouter } from "expo-router";
import { getStudentCode } from "../../lib/studentCodes";
import { supabase } from "../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Student = {
  id: string;
  tutor_id: string;
  name: string;
  subject: string;
  next_session_date: string;
};

export default function TutorDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [nextSessionDate, setNextSessionDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [studentCodePopupVisible, setStudentCodePopupVisible] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Redirect to login if not authenticated
      router.replace("/login");
      return;
    }
    
    // Try to get tutorId from AsyncStorage first
    let id = await AsyncStorage.getItem("tutorId");
    
    // If not found in AsyncStorage, get it from the database
    if (!id) {
      const userId = session.user.id;
      
      // Get the tutor ID from the tutors table
      const { data: tutorData, error: tutorError } = await supabase
        .from("tutors")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      if (tutorError || !tutorData) {
        // If not a tutor, redirect to login
        Alert.alert("Error", "Could not verify tutor account.");
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      
      id = tutorData.id;
      // Save it for future use
      await AsyncStorage.setItem("tutorId", id);
    }
    
    // Set the tutor ID and fetch students
    setTutorId(id);
    fetchStudents(id);
  };

  const fetchStudents = async (tutorId: string) => {
    if (!tutorId) return;
    
    const data = await getStudentsByTutorId(tutorId);
    setStudents(
      data.map((student) => ({
        ...student,
        next_session_date: student.next_session_date ?? "",
      }))
    );
  };

  const handleAddStudent = async () => {
    if (!tutorId) {
      Alert.alert("Error", "Tutor ID not found. Please log in again.");
      return;
    }
    
    if (newName.trim() && newSubject.trim()) {
      await addStudent({
        tutor_id: tutorId,
        name: newName,
        subject: newSubject,
        next_session_date: nextSessionDate.toISOString(),
      });
      fetchStudents(tutorId);
      setModalVisible(false);
      setNewName("");
      setNewSubject("");
    }
  };

  const handleDeleteStudent = async (id: string) => {
    await deleteStudent(id);
    if (tutorId) fetchStudents(tutorId);
    setMenuVisible(null);
  };

  const handleEditStudent = async (id: string) => {
    if (newName.trim()) {
      await editStudent(id, newName);
      setEditingStudent(null);
      if (tutorId) fetchStudents(tutorId);
    }
  };

  const handleMoreInfo = async (studentId: string) => {
    const code = await getStudentCode(studentId);
    if (code) {
      setStudentCode(code);
      setStudentCodePopupVisible(true);
    } else {
      Alert.alert("Error", "Could not retrieve student code.");
    }
    setMenuVisible(null);
  };

  const handleCopyCode = () => {
    Clipboard.setString(studentCode);
    Alert.alert("Success", "Student code copied to clipboard!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="My Students" />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>
      
      <FlatList
        style={styles.list}
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              {editingStudent === item.id ? (
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.editInput}
                />
              ) : (
                <View style={styles.nameSubjectContainer}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.subject}>{item.subject}</Text>
                </View>
              )}
              <Text style={styles.nextSession}>
                Next Session:{" "}
                {item.next_session_date
                  ? new Date(item.next_session_date).toLocaleDateString()
                  : "Not scheduled"}
              </Text>
            </Card.Content>
            <Card.Actions>
              {editingStudent === item.id ? (
                <PaperButton onPress={() => handleEditStudent(item.id)}>
                  Save
                </PaperButton>
              ) : (
                <>
                  <PaperButton
                    onPress={() => router.push(`/student/${item.id}`)}
                  >
                    Session Notes
                  </PaperButton>
                  <Menu
                    visible={menuVisible === item.id}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        onPress={() => setMenuVisible(item.id)}
                      />
                    }
                  >
                    <Menu.Item
                      onPress={() => {
                        setNewName(item.name);
                        setEditingStudent(item.id);
                        setMenuVisible(null);
                      }}
                      title="Edit"
                    />
                    <Menu.Item
                      onPress={() => handleDeleteStudent(item.id)}
                      title="Delete"
                    />
                    <Menu.Item
                      onPress={() => handleMoreInfo(item.id)}
                      title="Get Student Code"
                    />
                  </Menu>
                </>
              )}
            </Card.Actions>
          </Card>
        )}
      />

      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Add New Student</Text>
        <TextInput
          label="Name"
          value={newName}
          onChangeText={setNewName}
          style={styles.input}
        />
        <TextInput
          label="Subject"
          value={newSubject}
          onChangeText={setNewSubject}
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setDatePickerVisible(true)}
        >
          <Text>
            Next Session Date: {nextSessionDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        
        {isDatePickerVisible && (
          <DateTimePicker
            value={nextSessionDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setDatePickerVisible(false);
              if (selectedDate) {
                setNextSessionDate(selectedDate);
              }
            }}
          />
        )}
        
        <View style={styles.buttonContainer}>
          <PaperButton onPress={() => setModalVisible(false)}>
            Cancel
          </PaperButton>
          <PaperButton onPress={handleAddStudent} mode="contained">
            Add
          </PaperButton>
        </View>
      </Modal>

      <Modal
        visible={studentCodePopupVisible}
        onDismiss={() => setStudentCodePopupVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Student Code</Text>
        <Text style={styles.codeText}>{studentCode}</Text>
        <Text style={styles.codeInstructions}>
          Give this code to the student's parents to link the student to their account.
        </Text>
        <View style={styles.buttonContainer}>
          <PaperButton onPress={() => setStudentCodePopupVisible(false)}>
            Close
          </PaperButton>
          <PaperButton onPress={handleCopyCode} mode="contained">
            Copy Code
          </PaperButton>
        </View>
      </Modal>

      <PaperButton
        mode="contained"
        onPress={() => setModalVisible(true)}
        style={styles.addButton}
      >
        Add Student
      </PaperButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  nameSubjectContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  subject: {
    fontSize: 14,
    color: "#555",
  },
  nextSession: {
    fontSize: 14,
    marginTop: 8,
    color: "#777",
  },
  editInput: {
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
  },
  addButton: {
    margin: 16,
    borderRadius: 8,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  codeText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  codeInstructions: {
    textAlign: "center",
    marginBottom: 16,
    color: "#666",
  },
  datePickerButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginBottom: 16,
  },
}); 