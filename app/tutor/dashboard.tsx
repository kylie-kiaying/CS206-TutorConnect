import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
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

type StudentWithSessions = Student & {
  sessions: Session[];
};

export default function TutorDashboard() {
  const [students, setStudents] = useState<StudentWithSessions[]>([]);
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
  const router = useRouter();

  // New session state
  const [newSubjects, setNewSubjects] = useState<
    { subject: string; day: number; time: string }[]
  >([]);
  const [newSubject, setNewSubject] = useState("");
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [selectedTime, setSelectedTime] = useState("15:00"); // Default to 3:00 PM
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [addSessionTimePickerVisible, setAddSessionTimePickerVisible] = useState(false);
  const [addStudentTimePickerVisible, setAddStudentTimePickerVisible] = useState(false);

  // Edit session states
  const [editSessionModalVisible, setEditSessionModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionSubject, setEditSessionSubject] = useState("");
  const [editSessionDay, setEditSessionDay] = useState(1);
  const [editSessionTime, setEditSessionTime] = useState("15:00");
  const [editSessionTimePickerVisible, setEditSessionTimePickerVisible] =
    useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Redirect to login if not authenticated
      router.replace("/login");
      return;
    }

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
        router.replace("/login");
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

  const fetchStudents = async (tutorId: string) => {
    if (!tutorId) return;

    // Get all students for this tutor
    const studentsData = await getStudentsByTutorId(tutorId);

    // For each student, get their sessions
    const studentsWithSessions: StudentWithSessions[] = await Promise.all(
      studentsData.map(async (student) => {
        const sessions = await getSessionsByStudentId(student.id);
        return {
          ...student,
          sessions,
        };
      })
    );

    setStudents(studentsWithSessions);
  };

  const handleAddStudent = async () => {
    if (!tutorId) {
      Alert.alert("Error", "Tutor ID not found. Please log in again.");
      return;
    }

    if (newName.trim() && newSubjects.length > 0) {
      await addStudent(
        {
          tutor_id: tutorId,
          name: newName,
        },
        newSubjects.map((subject) => ({
          subject: subject.subject,
          day_of_week: subject.day,
          time: subject.time,
        }))
      );

      fetchStudents(tutorId);
      setModalVisible(false);
      setNewName("");
      setNewSubjects([]);
    } else {
      Alert.alert(
        "Error",
        "Please provide a name and at least one subject with schedule."
      );
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
    router.replace("/login");
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

  const openEditStudentModal = (student: StudentWithSessions) => {
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
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.totalSubjects}>
                    {item.sessions.length}{" "}
                    {item.sessions.length === 1 ? "Subject" : "Subjects"}
                  </Text>
                </View>
              )}

              {item.sessions.length > 0 ? (
                <View style={styles.sessionsContainer}>
                  <Text style={styles.sessionHeader}>Scheduled Sessions:</Text>
                  {item.sessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.sessionItem}
                      onPress={() => openEditSessionModal(session)}
                    >
                      <View style={styles.sessionInfo}>
                        <Text style={styles.subject}>{session.subject}</Text>
                        <Text style={styles.scheduleText}>
                          {getDayName(session.day_of_week)}s at{" "}
                          {formatTime(session.time)}
                        </Text>
                        <Text style={styles.nextSession}>
                          Next: {getNextSessionDateString(session)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noSessionsContainer}>
                  <Text style={styles.noSessionsText}>
                    No sessions scheduled
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
                      onPress={() => {
                        setSelectedStudent(item.id);
                        setSessionModalVisible(true);
                        setMenuVisible(null);
                      }}
                      title="Add Subject"
                      leadingIcon="plus"
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

      {/* Add New Student Modal */}
      <Modal
        visible={modalVisible}
        onDismiss={closeAddStudentModal}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>Add New Student</Text>
          <TextInput
            label="Name"
            value={newName}
            onChangeText={setNewName}
            style={styles.input}
          />

          <Divider style={styles.divider} />
          <Text style={styles.sectionTitle}>Add Subjects & Schedule</Text>

          <View style={styles.subjectInputContainer}>
            <TextInput
              label="Subject"
              value={newSubject}
              onChangeText={setNewSubject}
              style={styles.subjectInput}
            />

            <View style={styles.scheduleContainer}>
              <Text style={styles.scheduleLabel}>Day:</Text>
              <SegmentedButtons
                value={selectedDay.toString()}
                onValueChange={(value) => setSelectedDay(parseInt(value))}
                buttons={[
                  { value: "1", label: "Mon" },
                  { value: "2", label: "Tue" },
                  { value: "3", label: "Wed" },
                  { value: "4", label: "Thu" },
                ]}
                style={styles.dayPicker}
              />
              <SegmentedButtons
                value={selectedDay.toString()}
                onValueChange={(value) => setSelectedDay(parseInt(value))}
                buttons={[
                  { value: "5", label: "Fri" },
                  { value: "6", label: "Sat" },
                  { value: "0", label: "Sun" },
                ]}
                style={styles.dayPicker}
              />
            </View>

            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setAddStudentTimePickerVisible(true)}
            >
              <Text>Time: {formatTime(selectedTime)}</Text>
            </TouchableOpacity>

            {addStudentTimePickerVisible && (
              <View style={styles.timePickerContainer}>
                <TimePicker
                  onChange={(value) => {
                    setSelectedTime(value || "00:00");
                    setAddStudentTimePickerVisible(false);
                  }}
                  value={selectedTime}
                  disableClock={true}
                />
              </View>
            )}

            <PaperButton
              mode="contained"
              onPress={handleAddSubject}
              style={styles.addSubjectButton}
            >
              Add Subject
            </PaperButton>
          </View>

          {newSubjects.length > 0 && (
            <View style={styles.subjectListContainer}>
              <Text style={styles.subjectListTitle}>Added Subjects:</Text>
              {newSubjects.map((subject, index) => (
                <View key={index} style={styles.subjectListItem}>
                  <View style={styles.subjectDetails}>
                    <Text style={styles.subjectName}>{subject.subject}</Text>
                    <Text style={styles.subjectSchedule}>
                      {getDayName(subject.day)}s at {formatTime(subject.time)}
                    </Text>
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleRemoveSubject(index)}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <PaperButton
              onPress={closeAddStudentModal}
            >
              Cancel
            </PaperButton>
            <PaperButton
              onPress={handleAddStudent}
              mode="contained"
              disabled={newName.trim() === "" || newSubjects.length === 0}
            >
              Add Student
            </PaperButton>
          </View>
        </ScrollView>
      </Modal>

      {/* Add Session Modal */}
      <Modal
        visible={sessionModalVisible}
        onDismiss={() => {
          setSessionModalVisible(false);
          // If adding from edit student modal, reopen it
          if (editingStudent && selectedStudent === editingStudent) {
            setEditStudentModalVisible(true);
          }
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Add New Subject</Text>
        <TextInput
          label="Subject"
          value={newSubject}
          onChangeText={setNewSubject}
          style={styles.input}
        />

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleLabel}>Day:</Text>
          <SegmentedButtons
            value={selectedDay.toString()}
            onValueChange={(value) => setSelectedDay(parseInt(value))}
            buttons={[
              { value: "1", label: "Mon" },
              { value: "2", label: "Tue" },
              { value: "3", label: "Wed" },
              { value: "4", label: "Thu" },
            ]}
            style={styles.dayPicker}
          />
          <SegmentedButtons
            value={selectedDay.toString()}
            onValueChange={(value) => setSelectedDay(parseInt(value))}
            buttons={[
              { value: "5", label: "Fri" },
              { value: "6", label: "Sat" },
              { value: "0", label: "Sun" },
            ]}
            style={styles.dayPicker}
          />
        </View>

        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => setAddSessionTimePickerVisible(true)}
        >
          <Text>Time: {formatTime(selectedTime)}</Text>
        </TouchableOpacity>

        {addSessionTimePickerVisible && (
          <View style={styles.timePickerContainer}>
            <TimePicker
              onChange={(value) => {
                setSelectedTime(value || "00:00");
                setAddSessionTimePickerVisible(false);
              }}
              value={selectedTime}
              disableClock={true}
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <PaperButton onPress={() => {
            setSessionModalVisible(false);
            // If adding from edit student modal, reopen it
            if (editingStudent && selectedStudent === editingStudent) {
              setEditStudentModalVisible(true);
            }
          }}>
            Cancel
          </PaperButton>
          <PaperButton 
            onPress={() => {
              handleAddSessionForStudent();
              // If adding from edit student modal, reopen it
              if (editingStudent && selectedStudent === editingStudent) {
                setTimeout(() => {
                  setEditStudentModalVisible(true);
                }, 300); //
              }
            }} 
            mode="contained"
          >
            Add
          </PaperButton>
        </View>
      </Modal>

      {/* Edit Session Modal */}
      <Modal
        visible={editSessionModalVisible}
        onDismiss={() => {
          setEditSessionModalVisible(false);
          if (editingStudent) {
            setEditStudentModalVisible(true);
          }
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Edit Subject</Text>
        <TextInput
          label="Subject"
          value={editSessionSubject}
          onChangeText={setEditSessionSubject}
          style={styles.input}
        />

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleLabel}>Day:</Text>
          <SegmentedButtons
            value={editSessionDay.toString()}
            onValueChange={(value) => setEditSessionDay(parseInt(value))}
            buttons={[
              { value: "1", label: "Mon" },
              { value: "2", label: "Tue" },
              { value: "3", label: "Wed" },
              { value: "4", label: "Thu" },
            ]}
            style={styles.dayPicker}
          />
          <SegmentedButtons
            value={editSessionDay.toString()}
            onValueChange={(value) => setEditSessionDay(parseInt(value))}
            buttons={[
              { value: "5", label: "Fri" },
              { value: "6", label: "Sat" },
              { value: "0", label: "Sun" },
            ]}
            style={styles.dayPicker}
          />
        </View>

        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => setEditSessionTimePickerVisible(true)}
        >
          <Text>Time: {formatTime(editSessionTime)}</Text>
        </TouchableOpacity>

        {editSessionTimePickerVisible && (
          <View style={styles.timePickerContainer}>
            <TimePicker
              onChange={(value) => {
                setEditSessionTime(value || "00:00");
                setEditSessionTimePickerVisible(false);
              }}
              value={editSessionTime}
              disableClock={true}
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <PaperButton 
            onPress={() => {
              if (editingSession) handleDeleteSession(editingSession.id);
              // Check if we were editing from the edit student modal and reopen it
              if (editingStudent) {
                setTimeout(() => {
                  setEditStudentModalVisible(true);
                }, 300);
              }
            }}
            style={styles.deleteButton}
          >
            Delete
          </PaperButton>
          <View style={styles.rightButtons}>
            <PaperButton 
              onPress={() => {
                setEditSessionModalVisible(false);
                // Check if we were editing from the edit student modal and reopen it
                if (editingStudent) {
                  setEditStudentModalVisible(true);
                }
              }}
            >
              Cancel
            </PaperButton>
            <PaperButton 
              onPress={() => {
                handleEditSession();
                if (editingStudent) {
                  setTimeout(() => {
                    setEditStudentModalVisible(true);
                  }, 300);
                }
              }} 
              mode="contained"
            >
              Save
            </PaperButton>
          </View>
        </View>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        visible={editStudentModalVisible}
        onDismiss={closeEditStudentModal}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>Edit Student</Text>
          <TextInput
            label="Name"
            value={newName}
            onChangeText={setNewName}
            style={styles.input}
          />

          <Divider style={styles.divider} />
          <Text style={styles.sectionTitle}>Subject Schedule</Text>

          {editingStudent &&
            students
              .find((s) => s.id === editingStudent)
              ?.sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.editSessionItem}
                  onPress={() => openEditSessionModal(session)}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={styles.subject}>{session.subject}</Text>
                    <Text style={styles.scheduleText}>
                      {getDayName(session.day_of_week)}s at{" "}
                      {formatTime(session.time)}
                    </Text>
                  </View>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => openEditSessionModal(session)}
                  />
                </TouchableOpacity>
              ))}

          <PaperButton
            mode="outlined"
            onPress={() => {
              if (editingStudent) {
                setSelectedStudent(editingStudent);
                setSessionModalVisible(true);
                setEditStudentModalVisible(false);
              }
            }}
            style={styles.addSubjectButtonInEdit}
            icon="plus"
          >
            Add Subject
          </PaperButton>

          <View style={styles.buttonContainer}>
            <PaperButton onPress={closeEditStudentModal}>
              Cancel
            </PaperButton>
            <PaperButton
              onPress={() => {
                if (editingStudent) {
                  handleEditStudent(editingStudent);
                  setEditStudentModalVisible(false);
                }
              }}
              mode="contained"
            >
              Save Changes
            </PaperButton>
          </View>
        </ScrollView>
      </Modal>

      <Modal
        visible={studentCodePopupVisible}
        onDismiss={() => setStudentCodePopupVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Student Code</Text>
        <Text style={styles.codeText}>{studentCode}</Text>
        <Text style={styles.codeInstructions}>
          Give this code to the student's parents to link the student to their
          account.
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
        onPress={() => {
          setNewName("");
          setNewSubjects([]);
          setSelectedTime("15:00");
          setSelectedDay(1);
          setModalVisible(true);
        }}
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
    backgroundColor: "#f8f9fa",
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#263238",
  },
  subject: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e88e5",
  },
  nextSession: {
    fontSize: 13,
    marginTop: 3,
    color: "#546e7a",
  },
  editInput: {
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
    borderRadius: 8,
  },
  addButton: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 2,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
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
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subjectInputContainer: {
    marginBottom: 16,
  },
  subjectInput: {
    marginBottom: 8,
  },
  scheduleContainer: {
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  dayPicker: {
    marginBottom: 8,
  },
  timePickerButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginBottom: 12,
  },
  addSubjectButton: {
    marginTop: 8,
  },
  subjectListContainer: {
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  subjectListTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subjectListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
    elevation: 1,
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontWeight: "500",
  },
  subjectSchedule: {
    fontSize: 12,
    color: "#666",
  },
  sessionsContainer: {
    marginTop: 12,
    backgroundColor: "#f5f7fa",
    borderRadius: 10,
    padding: 10,
  },
  sessionHeader: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    color: "#455a64",
    paddingHorizontal: 6,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#42a5f5",
  },
  sessionInfo: {
    flex: 1,
  },
  scheduleText: {
    fontSize: 14,
    color: "#546e7a",
    marginTop: 3,
  },
  noSessionsContainer: {
    marginTop: 12,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f7fa",
    borderRadius: 10,
  },
  noSessionsText: {
    marginBottom: 8,
    color: "#78909c",
    fontStyle: "italic",
  },
  deleteButton: {
    backgroundColor: "#ffebee",
  },
  rightButtons: {
    flexDirection: "row",
  },
  editSessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 8,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#42a5f5",
  },
  addSubjectButtonInEdit: {
    marginTop: 16,
    marginBottom: 16,
  },
  totalSubjects: {
    fontSize: 14,
    color: "#607d8b",
    backgroundColor: "#e1f5fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timePickerContainer: {
    marginTop: 10,
    alignItems: "center",
  },
});
