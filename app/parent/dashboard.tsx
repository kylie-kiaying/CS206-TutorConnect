import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, FlatList, useColorScheme } from "react-native";
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Provider as PaperProvider,
  Snackbar,
  Modal,
  Portal,
  MD3DarkTheme,
  MD3LightTheme,
  Appbar,
  List,
  Divider,
  ActivityIndicator,
  FAB,
  Surface,
  Text,
  Chip,
} from "react-native-paper";
import {
  getSessionNotesByCode,
  updateSessionNote,
} from "../../lib/sessionNotes";
import { supabase } from "../../lib/supabase";
import storage from "../../lib/storage";
import { format } from "date-fns";
import { useRouter } from "expo-router";

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
  class_id?: string;
  topic_id?: string;
};

type Student = {
  id: string;
  name: string;
  code?: string;
};

export default function ParentScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? customDarkTheme : customLightTheme;
  const router = useRouter();
  
  // Student states
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  // Session notes states
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  // Add student modal states
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  
  // Feedback modal states
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState<SessionNote | null>(null);
  const [parentFeedback, setParentFeedback] = useState("");
  
  // Notification states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Add availableTopics state
  const [availableTopics, setAvailableTopics] = useState<Array<{id: string, name: string, class_id?: string}>>([]);

  useEffect(() => {
    loadParentData();
  }, []);
  
  useEffect(() => {
    if (selectedStudent) {
      fetchSessionNotes(selectedStudent.id);
    } else if (students.length > 0) {
      setSelectedStudent(students[0]);
    }
  }, [selectedStudent, students]);

  const loadParentData = async () => {
    setLoadingStudents(true);
    try {
      const parentId = await storage.getItem("parentId");
      
      if (!parentId) {
        console.error("No parent ID found");
        setSnackbarMessage("Error loading your data. Please log in again.");
        setSnackbarVisible(true);
        setLoadingStudents(false);
        return;
      }
      
      // Fetch all students associated with this parent
      const { data, error } = await supabase
        .from('parent_students')
        .select(`
          student_id,
          students:students(id, name)
        `)
        .eq('parent_id', parentId);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const fetchedStudents: Student[] = data.map(item => ({
          id: item.student_id,
          name: item.students ? (item.students as any).name : 'Unknown Student'
        }));
        
        setStudents(fetchedStudents);
        
        // If no student is selected yet, select the first one
        if (!selectedStudent && fetchedStudents.length > 0) {
          setSelectedStudent(fetchedStudents[0]);
        }
      } else {
        // No students found
        setStudents([]);
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error("Error fetching parent data:", error);
      setSnackbarMessage("Error loading student data");
      setSnackbarVisible(true);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchSessionNotes = async (studentId: string) => {
    setLoadingNotes(true);
    try {
      const notes = await getSessionNotesByCode(await getStudentCode(studentId));
      if (notes) {
        setSessionNotes(notes);
        
        // Fetch all topics referenced in session notes
        const topicIds = notes
          .filter(note => note.topic_id)
          .map(note => note.topic_id);
        
        if (topicIds.length > 0) {
          try {
            const { data: topics, error } = await supabase
              .from('topics')
              .select('id, name, class_id')
              .in('id', topicIds);
              
            if (error) throw error;
            
            if (topics && topics.length > 0) {
              setAvailableTopics(prevTopics => {
                // Combine with any existing topics without duplicates
                const allTopics = [...prevTopics];
                topics.forEach(topic => {
                  if (!allTopics.some(t => t.id === topic.id)) {
                    allTopics.push(topic);
                  }
                });
                return allTopics;
              });
            }
          } catch (error) {
            console.error('Error fetching topics for notes:', error);
          }
        }
      } else {
        setSessionNotes([]);
      }
    } catch (error) {
      console.error("Error fetching session notes:", error);
      setSnackbarMessage("Error loading session notes");
      setSnackbarVisible(true);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Helper function to get student code
  const getStudentCode = async (studentId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('student_codes')
        .select('code')
        .eq('student_id', studentId)
        .single();
        
      if (error) throw error;
      
      return data?.code || '';
    } catch (error) {
      console.error('Error fetching student code:', error);
      return '';
    }
  };

  const handleAddStudent = async () => {
    if (!studentCode.trim()) {
      setSnackbarMessage("Please enter a student code");
      setSnackbarVisible(true);
      return;
    }
    
    setAddingStudent(true);
    try {
      const parentId = await storage.getItem("parentId");
      
      if (!parentId) {
        setSnackbarMessage("Error: Parent ID not found");
        setSnackbarVisible(true);
        return;
      }
      
      // Find the student by code
      const { data: codeData, error: codeError } = await supabase
        .from("student_codes")
        .select("student_id")
        .eq("code", studentCode)
        .single();
        
      if (codeError || !codeData) {
        setSnackbarMessage("Invalid student code. Please check and try again.");
        setSnackbarVisible(true);
        return;
      }
      
      // Check if this relationship already exists
      const { data: existingRelation, error: relationCheckError } = await supabase
        .from("parent_students")
        .select("id")
        .eq("parent_id", parentId)
        .eq("student_id", codeData.student_id);
        
      if (relationCheckError) throw relationCheckError;
      
      if (existingRelation && existingRelation.length > 0) {
        setSnackbarMessage("This student is already linked to your account");
        setSnackbarVisible(true);
        return;
      }
      
      // Create relationship in parent_students table
      const { error: relationError } = await supabase
        .from("parent_students")
        .insert([{ 
          parent_id: parentId, 
          student_id: codeData.student_id 
        }]);
        
      if (relationError) throw relationError;
      
      // Re-fetch students to update the list
      await loadParentData();
      
      setAddStudentModalVisible(false);
      setStudentCode("");
      setSnackbarMessage("Student added successfully!");
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Error adding student:", error);
      setSnackbarMessage("Error adding student. Please try again.");
      setSnackbarVisible(true);
    } finally {
      setAddingStudent(false);
    }
  };

  const handleOpenFeedbackModal = (note: SessionNote) => {
    setCurrentNote(note);
    setParentFeedback(note.parent_feedback);
    setFeedbackModalVisible(true);
  };

  const handleSaveFeedback = async () => {
    if (currentNote && selectedStudent) {
      try {
        await updateSessionNote({
          ...currentNote,
          parent_feedback: parentFeedback,
          student_id: currentNote.student_id,
          engagement_level: currentNote.engagement_level as
            | "Highly Engaged"
            | "Engaged"
            | "Neutral"
            | "Distracted",
        });
        
        setFeedbackModalVisible(false);
        setSnackbarMessage("Feedback updated successfully!");
        setSnackbarVisible(true);
        
        // Refresh notes
        fetchSessionNotes(selectedStudent.id);
      } catch (error) {
        console.error("Error updating feedback:", error);
        setSnackbarMessage("Error updating feedback");
        setSnackbarVisible(true);
      }
    }
  };

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="Parent Dashboard" />
        <Appbar.Action icon="logout" onPress={() => router.push('/login')} />
      </Appbar.Header>
      
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {loadingStudents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10, color: theme.colors.text }}>Loading student data...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
              You don't have any students linked to your account yet.
            </Text>
            <Button 
              mode="contained" 
              onPress={() => setAddStudentModalVisible(true)}
              style={styles.addFirstStudentButton}
            >
              Link a Student
            </Button>
          </View>
        ) : (
          <>
            {/* Student selector chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.studentChipsContainer}
            >
              {students.map(student => (
                <Chip
                  key={student.id}
                  selected={selectedStudent?.id === student.id}
                  onPress={() => setSelectedStudent(student)}
                  style={[
                    styles.studentChip,
                    selectedStudent?.id === student.id && { 
                      backgroundColor: theme.colors.primaryContainer 
                    }
                  ]}
                  mode="outlined"
                >
                  {student.name}
                </Chip>
              ))}
            </ScrollView>

            {/* Session notes for selected student */}
            {selectedStudent ? (
              <>
                <Surface style={[styles.studentHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Title style={{ color: theme.colors.text }}>{selectedStudent.name}'s Progress</Title>
                </Surface>
                
                {loadingNotes ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" />
                    <Text style={{ marginTop: 10, color: theme.colors.text }}>Loading notes...</Text>
                  </View>
                ) : sessionNotes.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                      No session notes available for this student yet.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={sessionNotes}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                          <Title style={{ color: theme.colors.text }}>{item.subject}</Title>
                          <Paragraph style={{ color: theme.colors.text }}>
                            Topic: {
                              item.topic_id ? 
                              availableTopics.find(t => t.id === item.topic_id)?.name : 
                              item.topic || 'N/A'
                            }
                          </Paragraph>
                          <Paragraph style={{ color: theme.colors.text }}>
                            Date: {format(new Date(item.session_date), "PPP")}
                          </Paragraph>
                          <Paragraph style={{ color: theme.colors.text }}>
                            Engagement: {item.engagement_level}
                          </Paragraph>
                          {item.homework_assigned && (
                            <Paragraph style={{ color: theme.colors.text }}>
                              Homework: {item.homework_assigned}
                            </Paragraph>
                          )}
                          {item.tutor_notes && (
                            <Paragraph style={{ color: theme.colors.text }}>
                              Tutor Notes: {item.tutor_notes}
                            </Paragraph>
                          )}
                          <Paragraph style={{ color: theme.colors.text }}>
                            Parent Feedback: {item.parent_feedback || 'No feedback provided yet.'}
                          </Paragraph>
                        </Card.Content>
                        <Card.Actions>
                          <Button onPress={() => handleOpenFeedbackModal(item)}>
                            {item.parent_feedback ? 'Edit Feedback' : 'Add Feedback'}
                          </Button>
                        </Card.Actions>
                      </Card>
                    )}
                  />
                )}
              </>
            ) : null}
          </>
        )}
        
        {/* Add Student FAB */}
        <FAB
          icon="account-plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setAddStudentModalVisible(true)}
        />

        {/* Add Student Modal */}
        <Portal>
          <Modal
            visible={addStudentModalVisible}
            onDismiss={() => {
              setAddStudentModalVisible(false);
              setStudentCode("");
            }}
            contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            <Title style={[styles.modalTitle, { color: theme.colors.text }]}>Link a Student</Title>
            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
              Enter the student code provided by your tutor to link a student to your account.
            </Text>
            <TextInput
              label="Student Code"
              value={studentCode}
              onChangeText={setStudentCode}
              mode="outlined"
              theme={theme}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <Button
                onPress={() => {
                  setAddStudentModalVisible(false);
                  setStudentCode("");
                }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAddStudent}
                loading={addingStudent}
                disabled={addingStudent || !studentCode.trim()}
              >
                Link Student
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* Feedback Modal */}
        <Portal>
          <Modal
            visible={feedbackModalVisible}
            onDismiss={() => setFeedbackModalVisible(false)}
            contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            <Title style={[styles.modalTitle, { color: theme.colors.text }]}>Parent Feedback</Title>
            <TextInput
              label="Your Feedback"
              value={parentFeedback}
              onChangeText={setParentFeedback}
              mode="outlined"
              theme={theme}
              multiline
              style={styles.textAreaInput}
            />
            <View style={styles.modalButtons}>
              <Button
                onPress={() => setFeedbackModalVisible(false)}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveFeedback}
              >
                Save Feedback
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* Snackbar for notifications */}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentChipsContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  studentChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  studentHeader: {
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  textAreaInput: {
    marginBottom: 16,
    height: 100,
  },
  modalContent: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 8,
  },
  modalDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  addFirstStudentButton: {
    marginTop: 20,
  },
});
