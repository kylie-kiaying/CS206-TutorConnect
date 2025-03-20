import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, useColorScheme } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { FlatList, TouchableOpacity } from "react-native";
import {
  TextInput,
  Card,
  Button as PaperButton,
  IconButton,
  Menu,
  Modal,
  Appbar,
  Divider,
  SegmentedButtons,
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from "react-native-paper";
import {
  getStudentsByTutorId,
  addStudent,
  deleteStudent,
  editStudent,
  getSessionsByStudentId,
  Session,
  Student,
  addSession,
  deleteSession,
  updateSession,
  getDayName,
  getNextSessionDate,
} from "../../lib/students";
import { useRouter } from "expo-router";
import { getStudentCode } from "../../lib/studentCodes";
import { supabase } from "../../lib/supabase";
import TimePicker from "react-time-picker";
import storage from "../../lib/storage";

// Custom theme with better dark mode colors
const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
    primary: '#2196F3',
    surfaceVariant: '#ffffff',
    secondaryContainer: '#e3f2fd',
  }
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    primary: '#90CAF9',
    surfaceVariant: '#2c2c2c',
    secondaryContainer: '#0d47a1',
  }
};

interface Class {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  curriculum_id: string | null;
  student_count?: number;
  class_students: { count: number }[];
}

interface StudentClass {
  class_id: string;
  class: {
    id: string;
    name: string;
    subject: string;
  }
}

type StudentWithClasses = Student & {
  classes: StudentClass[];
};

export default function TutorDashboard() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? customDarkTheme : customLightTheme;
  
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<StudentWithClasses[]>([]);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [studentCodePopupVisible, setStudentCodePopupVisible] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editStudentModalVisible, setEditStudentModalVisible] = useState(false);
  const [newSubjects, setNewSubjects] = useState<
    { subject: string; day: number; time: string }[]
  >([]);
  const [newSubject, setNewSubject] = useState("");
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [selectedTime, setSelectedTime] = useState("15:00"); // Default to 3:00 PM
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [addSessionTimePickerVisible, setAddSessionTimePickerVisible] = useState(false);
  const [addStudentTimePickerVisible, setAddStudentTimePickerVisible] = useState(false);
  const [editSessionModalVisible, setEditSessionModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionSubject, setEditSessionSubject] = useState("");
  const [editSessionDay, setEditSessionDay] = useState(1);
  const [editSessionTime, setEditSessionTime] = useState("15:00");
  const [editSessionTimePickerVisible, setEditSessionTimePickerVisible] =
    useState(false);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' or 'students'
  const [createClassModalVisible, setCreateClassModalVisible] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  const checkAuth = async () => {
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Redirect to login if not authenticated
      router.replace("/tutor-login");
      return;
    }

    setUser(session.user);

    // Try to get tutorId from storage first
    let id = await storage.getItem("tutorId");

    // If not found in storage, get it from the database
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
        router.replace("/tutor-login");
        return;
      }

      id = tutorData.id;
      // Save it for future use
      await storage.setItem("tutorId", id);
    }

    // Set the tutor ID and fetch students
    setTutorId(id);

    // Fix TypeScript error by ensuring id is not null
    if (id) {
      fetchStudents(id);
    }
  };

  const fetchClasses = async () => {
    try {
      if (!user) return;

      // Fetch classes with student count
      const { data, error } = await supabase
        .from('classes')
        .select('*, class_students(count)')
        .eq('tutor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (tutorId: string) => {
    if (!tutorId) return;

    try {
      // Get all students for this tutor
      const studentsData = await getStudentsByTutorId(tutorId);

      // For each student, get the classes they're enrolled in
      const studentsWithClasses: StudentWithClasses[] = await Promise.all(
        studentsData.map(async (student) => {
          // Get classes for this student from class_students table
          const { data: classData, error } = await supabase
            .from("class_students")
            .select(`
              class_id, 
              classes:classes(id, name, subject)
            `)
            .eq("student_id", student.id);

          if (error) {
            console.error("Error fetching classes for student:", error);
            return { ...student, classes: [] };
          }

          // Log the raw data to debug
          console.log(`Raw class data for student ${student.name}:`, classData);

          // Transform the data to match the StudentClass interface
          const classes = (classData || []).map(item => {
            // Extract class data, checking if it's an array (which it might be in Supabase's response)
            const classInfo = Array.isArray(item.classes) 
              ? item.classes[0] // If it's an array, take the first item
              : item.classes;   // Otherwise use it directly

            return {
              class_id: item.class_id,
              class: {
                id: classInfo?.id || "",
                name: classInfo?.name || "",
                subject: classInfo?.subject || ""
              }
            };
          });

          console.log(`Processed classes for student ${student.name}:`, classes);

          return {
            ...student,
            classes,
          };
        })
      );

      setStudents(studentsWithClasses);
    } catch (error) {
      console.error("Error fetching students with classes:", error);
      Alert.alert("Error", "Failed to load students");
    }
  };

  const handleAddStudent = async () => {
    if (!tutorId) {
      Alert.alert("Error", "Tutor ID not found. Please log in again.");
      return;
    }

    if (newName.trim()) {
      try {
        // Insert the student
        const { data, error } = await supabase
          .from("students")
          .insert([
            {
              tutor_id: tutorId,
              name: newName.trim(),
            },
          ])
          .select();

        if (error) throw error;

        // Refresh students list
        fetchStudents(tutorId);
        setModalVisible(false);
        setNewName("");
      } catch (error) {
        console.error("Error adding student:", error);
        Alert.alert("Error", "Failed to add student");
      }
    } else {
      Alert.alert("Error", "Please provide a name for the student.");
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
    await storage.removeItem("tutorId");
    router.replace("/tutor-login");
  };

  const handleAddSubject = () => {
    if (newSubject.trim()) {
      setNewSubjects([
        ...newSubjects,
        {
          subject: newSubject,
          day: selectedDay,
          time: selectedTime,
        },
      ]);
      setNewSubject("");
    }
  };

  const handleRemoveSubject = (index: number) => {
    const updatedSubjects = [...newSubjects];
    updatedSubjects.splice(index, 1);
    setNewSubjects(updatedSubjects);
  };

  const handleAddSessionForStudent = async () => {
    if (!selectedStudent || !newSubject.trim()) {
      Alert.alert("Error", "Please provide a subject name.");
      return;
    }

    await addSession({
      student_id: selectedStudent,
      subject: newSubject,
      day_of_week: selectedDay,
      time: selectedTime,
    });

    if (tutorId) fetchStudents(tutorId);
    setSessionModalVisible(false);
    setNewSubject("");
    setSelectedDay(1);
    setSelectedTime("15:00");
  };

  const handleAddSubjectFromEdit = async () => {
    if (!editingStudent || !newSubject.trim()) {
      Alert.alert("Error", "Please provide a subject name.");
      return;
    }

    await addSession({
      student_id: editingStudent,
      subject: newSubject,
      day_of_week: selectedDay,
      time: selectedTime,
    });

    if (tutorId) fetchStudents(tutorId);
    setSessionModalVisible(false);
    setNewSubject("");
    setSelectedDay(1);
    setSelectedTime("15:00");
  };

  const handleEditSession = async () => {
    if (!editingSession || !editSessionSubject.trim()) {
      Alert.alert("Error", "Please provide a subject name.");
      return;
    }

    await updateSession(editingSession.id, {
      subject: editSessionSubject,
      day_of_week: editSessionDay,
      time: editSessionTime,
    });
    if (tutorId) fetchStudents(tutorId);
    setEditSessionModalVisible(false);
    setEditingSession(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    if (tutorId) fetchStudents(tutorId);
    setEditSessionModalVisible(false);
    setEditingSession(null);
  };

  const openEditSessionModal = (session: Session) => {
    setEditingSession(session);
    setEditSessionSubject(session.subject);
    setEditSessionDay(session.day_of_week);
    setEditSessionTime(session.time);
    // Store the currently open edit student modal state
    const fromEditStudent = editStudentModalVisible;
    if (fromEditStudent) {
      // Temporarily close edit student modal
      setEditStudentModalVisible(false);
    }
    setEditSessionModalVisible(true);
  };

  const openEditStudentModal = (student: StudentWithClasses) => {
    setEditingStudent(student.id);
    setNewName(student.name);
    setEditStudentModalVisible(true);
    setMenuVisible(null);
  };

  // Format time from 24h to 12h format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get the next session date for display
  const getNextSessionDateString = (session: Session) => {
    const nextDate = getNextSessionDate(session.day_of_week);
    return nextDate.toLocaleDateString();
  };

  // Clean up states when closing modals
  const closeAddStudentModal = () => {
    setModalVisible(false);
    setNewSubjects([]);
    setNewName("");
    setSelectedTime("15:00");
    setSelectedDay(1);
  };

  const closeEditStudentModal = () => {
    setEditStudentModalVisible(false);
    setEditingStudent(null);
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !newClassSubject.trim()) {
      Alert.alert("Error", "Class name and subject are required");
      return;
    }

    try {
      // Insert the new class into the database
      const { data, error } = await supabase
        .from("classes")
        .insert([
          {
            name: newClassName.trim(),
            subject: newClassSubject.trim(),
            description: newClassDescription.trim() || null,
            tutor_id: user.id,
          },
        ])
        .select();

      if (error) throw error;

      // Refresh the classes list
      fetchClasses();
      
      // Close the modal and reset form
      setCreateClassModalVisible(false);
      resetClassForm();
      
      // Navigate to the newly created class
      if (data && data[0]) {
        router.push({
          pathname: '/tutor/classes/[id]' as any,
          params: { id: data[0].id }
        });
      }
    } catch (error) {
      console.error("Error creating class:", error);
      Alert.alert("Error", "Failed to create class");
    }
  };

  const resetClassForm = () => {
    setNewClassName("");
    setNewClassSubject("");
    setNewClassDescription("");
  };

  if (loading) {
    return (
      <PaperProvider theme={theme}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </PaperProvider>
    );
  }

  const renderClassesTab = () => (
    <>
      <ScrollView style={styles.list}>
        {classes.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                You haven't created any classes yet.
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.text + 'aa' }]}>
                Create a class to start managing your students and curriculum.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          classes.map((classItem) => (
            <Card
              key={classItem.id}
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              onPress={() => router.push({
                pathname: '/tutor/classes/[id]' as any,
                params: { id: classItem.id }
              })}
            >
              <Card.Content>
                <Text style={[styles.className, { color: theme.colors.text }]}>
                  {classItem.name}
                </Text>
                <Text style={[styles.subject, { color: theme.colors.primary }]}>
                  {classItem.subject}
                </Text>
                {classItem.description && (
                  <Text style={[styles.descriptionText, { color: theme.colors.text + 'cc' }]}>
                    {classItem.description}
                  </Text>
                )}
                <Text style={[styles.studentCountText, { backgroundColor: theme.colors.secondaryContainer }]}>
                  {classItem.class_students[0]?.count || 0} student{(classItem.class_students[0]?.count || 0) === 1 ? '' : 's'}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <PaperButton
        mode="contained"
        onPress={() => setCreateClassModalVisible(true)}
        style={styles.floatingAddButton}
      >
        Create Class
      </PaperButton>
    </>
  );

  const renderStudentsTab = () => (
    <>
      <FlatList
        style={styles.list}
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              {editingStudent === item.id ? (
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.editInput}
                  theme={theme}
                />
              ) : (
                <View style={styles.cardHeader}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.totalSubjects, { backgroundColor: theme.colors.secondaryContainer }]}>
                    {item.classes.length}{" "}
                    {item.classes.length === 1 ? "Class" : "Classes"}
                  </Text>
                </View>
              )}

              {item.classes.length > 0 ? (
                <View style={styles.classesContainer}>
                  <Text style={[styles.classHeader, { color: theme.colors.text + 'cc' }]}>Enrolled Classes:</Text>
                  {item.classes.map((studentClass) => (
                    <TouchableOpacity
                      key={studentClass.class_id}
                      style={[styles.classItem, { backgroundColor: theme.colors.surfaceVariant }]}
                      onPress={() => 
                        router.push({
                          pathname: '/tutor/classes/[id]' as any,
                          params: { id: studentClass.class_id }
                        })
                      }
                    >
                      <View style={styles.classInfo}>
                        <Text style={[styles.subject, { color: theme.colors.primary }]}>{studentClass.class.name}</Text>
                        <Text style={[styles.classSubject, { color: theme.colors.text + 'cc' }]}>
                          Subject: {studentClass.class.subject}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noClassesContainer}>
                  <Text style={[styles.noClassesText, { color: theme.colors.text + '88' }]}>
                    Not enrolled in any classes
                  </Text>
                </View>
              )}
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
                        openEditStudentModal(item);
                      }}
                      title="Edit"
                      leadingIcon="pencil"
                    />
                    <Menu.Item
                      onPress={() => handleDeleteStudent(item.id)}
                      title="Delete Student"
                      leadingIcon="delete"
                    />
                    <Menu.Item
                      onPress={() => handleMoreInfo(item.id)}
                      title="Get Student Code"
                      leadingIcon="key"
                    />
                  </Menu>
                </>
              )}
            </Card.Actions>
          </Card>
        )}
      />
    </>
  );

  return (
    <PaperProvider theme={theme}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.Content title="Dashboard" />
          <Appbar.Action icon="logout" onPress={handleLogout} />
        </Appbar.Header>

        <View style={[styles.tabContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={setActiveTab}
            buttons={[
              { value: 'classes', label: 'Classes' },
              { value: 'students', label: 'Students' },
            ]}
            style={styles.tabs}
          />
        </View>

        {activeTab === 'classes' ? renderClassesTab() : renderStudentsTab()}

        {/* Add New Student Modal */}
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            setNewName("");
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Student</Text>
          <TextInput
            style={styles.input}
            label="Name"
            value={newName}
            onChangeText={setNewName}
            theme={theme}
            mode="outlined"
          />
          <View style={styles.modalButtons}>
            <PaperButton onPress={() => setModalVisible(false)}>Cancel</PaperButton>
            <PaperButton 
              mode="contained" 
              onPress={handleAddStudent}
              disabled={!newName.trim()}
            >
              Add
            </PaperButton>
          </View>
        </Modal>

        {/* Edit Student Modal */}
        <Modal
          visible={editStudentModalVisible}
          onDismiss={closeEditStudentModal}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Student</Text>
          <TextInput
            style={styles.input}
            label="Name"
            value={newName}
            onChangeText={setNewName}
            theme={theme}
            mode="outlined"
          />
          <View style={styles.modalButtons}>
            <PaperButton onPress={closeEditStudentModal}>Cancel</PaperButton>
            <PaperButton 
              mode="contained" 
              onPress={() => {
                if (editingStudent) handleEditStudent(editingStudent);
              }}
              disabled={!newName.trim()}
            >
              Save
            </PaperButton>
          </View>
        </Modal>

        {/* Student Code Modal */}
        <Modal
          visible={studentCodePopupVisible}
          onDismiss={() => setStudentCodePopupVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Student Code</Text>
          <Text style={[styles.codeText, { color: theme.colors.primary }]}>{studentCode}</Text>
          <View style={styles.modalButtons}>
            <PaperButton
              onPress={() => {
                Clipboard.setString(studentCode);
                Alert.alert("Copied!", "Student code copied to clipboard");
              }}
            >
              Copy
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={() => setStudentCodePopupVisible(false)}
            >
              Close
            </PaperButton>
          </View>
        </Modal>

        {/* Create Class Modal */}
        <Modal
          visible={createClassModalVisible}
          onDismiss={() => {
            setCreateClassModalVisible(false);
            resetClassForm();
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create New Class</Text>
          <TextInput
            style={styles.input}
            label="Class Name"
            value={newClassName}
            onChangeText={setNewClassName}
            theme={theme}
            mode="outlined"
          />
          <TextInput
            style={styles.input}
            label="Subject"
            value={newClassSubject}
            onChangeText={setNewClassSubject}
            theme={theme}
            mode="outlined"
          />
          <TextInput
            style={styles.input}
            label="Description (Optional)"
            value={newClassDescription}
            onChangeText={setNewClassDescription}
            multiline
            numberOfLines={3}
            theme={theme}
            mode="outlined"
          />
          <View style={styles.modalButtons}>
            <PaperButton 
              onPress={() => {
                setCreateClassModalVisible(false);
                resetClassForm();
              }}
            >
              Cancel
            </PaperButton>
            <PaperButton 
              mode="contained" 
              onPress={handleCreateClass}
              disabled={!newClassName.trim() || !newClassSubject.trim()}
            >
              Create
            </PaperButton>
          </View>
        </Modal>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalSubjects: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#e1f5fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  classesContainer: {
    marginTop: 8,
  },
  classHeader: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#666",
  },
  classItem: {
    marginBottom: 8,
    backgroundColor: "#f0f4f8",
    borderRadius: 8,
    padding: 12,
  },
  classInfo: {
    flexDirection: "column",
  },
  subject: {
    fontSize: 16,
    fontWeight: "500",
  },
  classSubject: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  noClassesContainer: {
    padding: 16,
    alignItems: "center",
  },
  noClassesText: {
    color: "#888",
    fontStyle: "italic",
  },
  editInput: {
    marginBottom: 16,
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  codeText: {
    fontSize: 24,
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "bold",
    color: "#1976d2",
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    borderRadius: 28,
  },
  emptyCard: {
    margin: 16,
    padding: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
  },
  tabContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  tabs: {
    marginBottom: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: "bold",
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 8,
  },
  studentCountText: {
    fontSize: 14,
    color: "#607d8b",
    backgroundColor: "#e1f5fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
});
