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
} from "react-native-paper";
import {
  getStudents,
  addStudent,
  deleteStudent,
  editStudent,
} from "../lib/students";
import { useRouter } from "expo-router";
import { getStudentCode } from "../lib/studentCodes";

type Student = {
  id: string;
  tutor_id: string;
  name: string;
  subject: string;
  next_session_date: string;
};

export default function HomeScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [nextSessionDate, setNextSessionDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [studentCodePopupVisible, setStudentCodePopupVisible] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const data = await getStudents();
    setStudents(
      data.map((student) => ({
        ...student,
        next_session_date: student.next_session_date ?? "",
      }))
    );
  };

  const handleAddStudent = async () => {
    if (newName.trim() && newSubject.trim()) {
      await addStudent({
        tutor_id: "123", // Static ID for now
        name: newName,
        subject: newSubject,
        next_session_date: nextSessionDate.toISOString(),
      });
      fetchStudents();
      setModalVisible(false);
      setNewName("");
      setNewSubject("");
    }
  };

  const handleDeleteStudent = async (id: string) => {
    await deleteStudent(id);
    fetchStudents();
    setMenuVisible(null);
  };

  const handleEditStudent = async (id: string) => {
    if (newName.trim()) {
      await editStudent(id, newName);
      setEditingStudent(null);
      fetchStudents();
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

  const copyToClipboard = () => {
    Clipboard.setString(studentCode);
    Alert.alert("Copied!", "Student code copied to clipboard.");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
        Students
      </Text>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <TouchableOpacity
              onPress={() => router.push(`/student/${item.id}`)}
              style={{ flex: 1 }}
            >
              <Card.Content>
                {editingStudent === item.id ? (
                  <>
                    <TextInput
                      label="Enter new name"
                      value={newName}
                      onChangeText={setNewName}
                      mode="outlined"
                      style={{ marginBottom: 5 }}
                    />
                    <PaperButton
                      mode="contained"
                      onPress={() => handleEditStudent(item.id)}
                      style={{ marginBottom: 5 }}
                    >
                      Save
                    </PaperButton>
                    <TouchableOpacity
                      onPress={() => router.push(`/student/${item.id}`)}
                    >
                      <Text style={{ color: "blue", marginTop: 5 }}>
                        View Sessions
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 18 }}>{item.name}</Text>
                        <Text>Subject: {item.subject}</Text>
                        <Text>
                          Next Session:{" "}
                          {new Date(item.next_session_date).toLocaleString()}
                        </Text>
                      </View>

                      {/* Dropdown Menu for Actions */}
                      <Menu
                        visible={menuVisible === item.id}
                        onDismiss={() => setMenuVisible(null)}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            size={20}
                            onPress={() => setMenuVisible(item.id)}
                            style={styles.menuIcon}
                          />
                        }
                      >
                        <Menu.Item
                          onPress={() => {
                            setEditingStudent(item.id);
                            setNewName(item.name);
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
                          title="View Student Code"
                        />
                      </Menu>
                    </View>
                  </>
                )}
              </Card.Content>
            </TouchableOpacity>
          </Card>
        )}
      />

      {/* Add Student Button */}
      <PaperButton mode="contained" onPress={() => setModalVisible(true)}>
        Add Student
      </PaperButton>

      {/* Add Student Modal */}
      <Modal visible={modalVisible}>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            Add New Student
          </Text>
          <TextInput
            label="Name"
            value={newName}
            onChangeText={setNewName}
            mode="outlined"
            style={{ marginBottom: 10 }}
          />
          <TextInput
            label="Subject"
            value={newSubject}
            onChangeText={setNewSubject}
            mode="outlined"
            style={{ marginBottom: 10 }}
          />
          <PaperButton
            mode="contained"
            onPress={handleAddStudent}
            style={{ marginTop: 20 }}
          >
            Add Student
          </PaperButton>
          <PaperButton
            mode="text"
            onPress={() => setModalVisible(false)}
            style={{ marginTop: 10 }}
          >
            Cancel
          </PaperButton>
        </View>
      </Modal>

      {/* Student Code Popup */}
      <Modal
        visible={studentCodePopupVisible}
        onDismiss={() => setStudentCodePopupVisible(false)}
        contentContainerStyle={styles.popupContainer}
      >
        {/* Student Code and Copy Icon */}
        <View style={styles.popupContent}>
          <Text style={styles.popupTitle}>Student Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.popupCode}>{studentCode}</Text>
            <IconButton
              icon="content-copy"
              size={24}
              onPress={copyToClipboard}
              style={styles.copyIcon}
            />
          </View>
        </View>

        {/* Close Button at Bottom-Right */}
        <PaperButton
          mode="text"
          onPress={() => setStudentCodePopupVisible(false)}
          style={styles.closeButton}
        >
          Close
        </PaperButton>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    marginHorizontal: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  menuIcon: {
    marginRight: -20,
  },
  popupContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  popupContent: {
    alignItems: "center",
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  popupCode: {
    fontSize: 16,
    marginRight: 10,
  },
  copyIcon: {
    marginLeft: 10,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginTop: 10,
  },
});