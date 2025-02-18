import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { FlatList, TouchableOpacity } from "react-native";
import { TextInput, Card, Button as PaperButton, IconButton } from "react-native-paper";
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
    await addStudent({
      tutor_id: "123", // Static ID for now
      name: "New Student",
      subject: "Math",
      next_session_date: new Date().toISOString(),
    });
    fetchStudents();
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
          <Card style={{ marginBottom: 10 }}>
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 18 }}>{item.name}</Text>
                      <Text>Subject: {item.subject}</Text>
                      <Text>
                        Next Session:{" "}
                        {new Date(item.next_session_date).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
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
          </Card>
        )}
      />

      <PaperButton mode="contained" onPress={handleAddStudent}>
        Add Student
      </PaperButton>
    </View>
  );
}
