import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { FlatList, TouchableOpacity, Modal } from "react-native";
import {
  TextInput,
  Card,
  Button as PaperButton,
  IconButton,
} from "react-native-paper";
import {
  getStudents,
  addStudent,
  deleteStudent,
  editStudent,
} from "../../lib/students";
import { useRouter } from "expo-router";

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
  };

  const handleEditStudent = async (id: string) => {
    if (newName.trim()) {
      await editStudent(id, newName);
      setEditingStudent(null);
      fetchStudents();
    }
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
          <Card style={{ marginBottom: 15, marginHorizontal: 10, padding: 10 }}>
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
                      <View style={{ flexDirection: "row" }}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => {
                            setEditingStudent(item.id);
                            setNewName(item.name);
                          }}
                        />
                        <IconButton
                          icon="trash-can"
                          size={20}
                          onPress={() => handleDeleteStudent(item.id)}
                        />
                      </View>
                    </View>
                  </>
                )}
              </Card.Content>
            </TouchableOpacity>
          </Card>
        )}
      />

      <PaperButton mode="contained" onPress={() => setModalVisible(true)}>
        Add Student
      </PaperButton>

      <Modal visible={modalVisible} animationType="slide">
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
    </View>
  );
}
