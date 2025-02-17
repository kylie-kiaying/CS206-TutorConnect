import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
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
          <View
            style={{
              padding: 15,
              backgroundColor: "#f2f2f2",
              marginBottom: 10,
              borderRadius: 10,
            }}
          >
            {editingStudent === item.id ? (
              <>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={{
                    borderColor: "#ccc",
                    borderWidth: 1,
                    padding: 8,
                    marginBottom: 5,
                  }}
                  placeholder="Enter new name"
                />
                <TouchableOpacity
                  onPress={() => handleEditStudent(item.id)}
                  style={{
                    backgroundColor: "green",
                    padding: 5,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center" }}>
                    Save
                  </Text>
                </TouchableOpacity>
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
                <Text style={{ fontSize: 18 }}>{item.name}</Text>
                <Text>Subject: {item.subject}</Text>
                <Text>
                  Next Session:{" "}
                  {new Date(item.next_session_date).toLocaleString()}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingStudent(item.id);
                    setNewName(item.name);
                  }}
                >
                  <Text style={{ color: "blue", marginTop: 5 }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteStudent(item.id)}>
                  <Text style={{ color: "red", marginTop: 5 }}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        onPress={handleAddStudent}
        style={{
          backgroundColor: "blue",
          padding: 15,
          borderRadius: 10,
          marginTop: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>Add Student</Text>
      </TouchableOpacity>
    </View>
  );
}
