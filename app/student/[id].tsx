import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ScrollView, useColorScheme } from "react-native";
import {
  Appbar,
  TextInput,
  Button,
  Card,
  Modal,
  Portal,
  Provider as PaperProvider,
  Title,
  Paragraph,
  Snackbar,
  ActivityIndicator,
  Divider,
  List,
  Avatar,
  MD3DarkTheme,
  MD3LightTheme,
  useTheme,
  adaptNavigationTheme,
  Surface,
} from "react-native-paper";
import RNPickerSelect from "react-native-picker-select";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getSessionNotes,
  addSessionNote,
  deleteSessionNote,
  updateSessionNote,
  SessionNote,
} from "../../lib/sessionNotes";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";

type Class = {
  id: string;
  name: string;
  subject: string;
};

type Topic = {
  id: string;
  name: string;
  class_id: string;
};

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

export default function StudentView() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? customDarkTheme : customLightTheme;
  
  const { id } = useLocalSearchParams<{ id: string }>(); // Get student ID from URL
  const router = useRouter();
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState<SessionNote[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);

  // Sorting & Filtering States
  const [sortOrder, setSortOrder] = useState<"Newest" | "Oldest">("Newest");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Form State for New Session Note
  const [sessionDate, setSessionDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [lessonSummary, setLessonSummary] = useState("");
  const [homeworkAssigned, setHomeworkAssigned] = useState("");
  const [engagementLevel, setEngagementLevel] = useState<
    "Highly Engaged" | "Engaged" | "Neutral" | "Distracted"
  >("Engaged");
  const [understandingLevel, setUnderstandingLevel] = useState<
    "Excellent" | "Good" | "Fair" | "Needs Improvement"
  >("Good");
  const [tutorNotes, setTutorNotes] = useState("");
  const [parentFeedback, setParentFeedback] = useState("");

  // Available classes and topics
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Add to your state declarations
  const [showCompletionRate, setShowCompletionRate] = useState(false);
  const [assignmentCompletion, setAssignmentCompletion] = useState<string>('');

  useEffect(() => {
    fetchSessionNotes();
    fetchAvailableClasses();
  }, []);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [sessionNotes, sortOrder, selectedSubject]);

  useEffect(() => {
    // When a class is selected, fetch topics for that class
    if (selectedClass) {
      fetchTopicsForClass(selectedClass);
    } else {
      setAvailableTopics([]);
      setSelectedTopic(null);
    }
  }, [selectedClass]);

  const fetchSessionNotes = async () => {
    if (id) {
      const data = await getSessionNotes(id);
      setSessionNotes(data);
      
      // Fetch all topics referenced in session notes
      const topicIds = data
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
    }
  };

  const fetchAvailableClasses = async () => {
    setLoadingClasses(true);
    try {
      // Define the expected type structure for the join query
      type ClassStudentRow = {
        class_id: string;
        classes: {
          id: string;
          name: string;
          subject: string;
        } | null;
      };

      // Fetch classes that this student is enrolled in via class_students
      const { data: classStudents, error } = await supabase
        .from('class_students')
        .select(`
          class_id,
          classes:classes(id, name, subject)
        `)
        .eq('student_id', id);

      if (error) throw error;

      if (classStudents && classStudents.length > 0) {
        // Cast the data to the expected type
        const typedData = classStudents as unknown as ClassStudentRow[];
        const classes: Class[] = typedData.map(item => ({
          id: item.class_id,
          name: item.classes ? item.classes.name : 'Unknown Class',
          subject: item.classes ? item.classes.subject : 'Unknown Subject'
        }));
        setAvailableClasses(classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchTopicsForClass = async (classId: string) => {
    setLoadingTopics(true);
    try {
      // Fetch topics for the selected class
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, class_id')
        .eq('class_id', classId)
        .order('order_index');

      if (error) throw error;

      setAvailableTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoadingTopics(false);
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

  const handleAddOrUpdateSessionNote = async () => {
    if (!id) return;
    
    // Validate completion rate if provided
    const completionRate = assignmentCompletion ? parseInt(assignmentCompletion, 10) : undefined;
    if (completionRate !== undefined && (isNaN(completionRate) || completionRate < 0 || completionRate > 100)) {
      setSnackbarMessage("Completion rate must be between 0 and 100");
      setSnackbarVisible(true);
      return;
    }

    try {
      if (editingNote) {
        await updateSessionNote({
          ...editingNote,
          session_date: sessionDate.toISOString(),
          class_id: selectedClass,
          topic_id: selectedTopic,
          lesson_summary: lessonSummary,
          homework_assigned: homeworkAssigned,
          engagement_level: engagementLevel,
          understanding_level: understandingLevel,
          tutor_notes: tutorNotes,
          parent_feedback: parentFeedback,
          assignment_completion: showCompletionRate ? completionRate : undefined,
        });
        setSnackbarMessage("Session note updated successfully!");
      } else {
        await addSessionNote({
          student_id: id,
          session_date: sessionDate.toISOString(),
          class_id: selectedClass,
          topic_id: selectedTopic,
          lesson_summary: lessonSummary,
          homework_assigned: homeworkAssigned,
          engagement_level: engagementLevel,
          understanding_level: understandingLevel,
          tutor_notes: tutorNotes,
          parent_feedback: parentFeedback,
          assignment_completion: showCompletionRate ? completionRate : undefined,
        });
        setSnackbarMessage("Session note added successfully!");
      }
      
      await fetchSessionNotes();
      resetForm();
      setModalVisible(false);
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Error saving session note:", error);
      setSnackbarMessage("Error saving session note. Please try again.");
      setSnackbarVisible(true);
    }
  };

  const resetForm = () => {
    setSessionDate(new Date());
    setSelectedClass(null);
    setSelectedTopic(null);
    setLessonSummary("");
    setHomeworkAssigned("");
    setEngagementLevel("Engaged");
    setUnderstandingLevel("Good");
    setTutorNotes("");
    setParentFeedback("");
    setAssignmentCompletion('');
    setShowCompletionRate(false);
    setEditingNote(null);
  };

  const handleDeleteSessionNote = async (noteId: string) => {
    await deleteSessionNote(noteId);
    fetchSessionNotes();
    setSnackbarMessage("Session note deleted successfully!");
    setSnackbarVisible(true);
  };

  const handleEditSessionNote = (note: SessionNote) => {
    setEditingNote(note);
    setSessionDate(new Date(note.session_date));
    setSelectedClass(note.class_id || null);
    setSelectedTopic(note.topic_id || null);
    setLessonSummary(note.lesson_summary || "");
    setHomeworkAssigned(note.homework_assigned || "");
    setEngagementLevel(note.engagement_level as any || "Engaged");
    setUnderstandingLevel(note.understanding_level as any || "Good");
    setTutorNotes(note.tutor_notes || "");
    setParentFeedback(note.parent_feedback || "");
    setAssignmentCompletion(note.assignment_completion?.toString() || '');
    setShowCompletionRate(!!note.assignment_completion);
    setModalVisible(true);
  };

  // Format class name with subject
  const formatClassName = (classItem: Class) => {
    return `${classItem.name} (${classItem.subject})`;
  };

  return (
    <PaperProvider>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.push('/tutor/dashboard')} />
        <Appbar.Content title="Session Notes" />
      </Appbar.Header>

      <View style={styles.container}>
        {/* Sorting Dropdown */}
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            onValueChange={(value: "Newest" | "Oldest") => setSortOrder(value)}
            items={[
              { label: "Newest First", value: "Newest" },
              { label: "Oldest First", value: "Oldest" },
            ]}
            value={sortOrder}
            style={pickerSelectStyles}
            placeholder={{ label: "Sort by...", value: null }}
            useNativeAndroidPickerStyle={false}
          />
        </View>

        {/* Filtering by Subject */}
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            onValueChange={(value) => setSelectedSubject(value)}
            items={[
              { label: "All Subjects", value: null },
              { label: "Math", value: "Math" },
              { label: "Science", value: "Science" },
              { label: "English", value: "English" },
            ]}
            value={selectedSubject}
            style={pickerSelectStyles}
            placeholder={{ label: "Filter by subject...", value: null }}
            useNativeAndroidPickerStyle={false}
          />
        </View>

        {/* Spacing between dropdowns and the first card */}
        <View style={styles.spacer} />

        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <Title>
                  {item.class_id ? 
                    availableClasses.find(c => c.id === item.class_id)?.name || 'Unknown Class' : 
                    item.subject || 'Unknown Subject'}
                </Title>
                <Paragraph>
                  Topic: {
                    item.topic_id ? 
                    availableTopics.find(t => t.id === item.topic_id)?.name : 
                    item.topic || 'N/A'
                  }
                </Paragraph>
                <Paragraph>
                  Date: {format(new Date(item.session_date), "PPPp")}
                </Paragraph>
                <Paragraph>Engagement: {item.engagement_level}</Paragraph>
                <Paragraph>Understanding: {item.understanding_level}</Paragraph>
                {item.homework_assigned && (
                  <>
                    <Paragraph>Homework: {item.homework_assigned}</Paragraph>
                    {item.assignment_completion !== undefined && (
                      <Paragraph>
                        Completion Rate: {item.assignment_completion}%
                      </Paragraph>
                    )}
                  </>
                )}
                <Paragraph>Tutor Notes: {item.tutor_notes}</Paragraph>
                <Paragraph>Parent Feedback: {item.parent_feedback}</Paragraph>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleEditSessionNote(item)}>Edit</Button>
                <Button onPress={() => handleDeleteSessionNote(item.id)}>
                  Delete
                </Button>
              </Card.Actions>
            </Card>
          )}
        />

        {/* ADD SESSION NOTE BUTTON */}
        <Button
          mode="contained"
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
          style={styles.addButton}
        >
          Add Session Note
        </Button>

        {/* MODAL FOR ADDING/EDITING SESSION NOTE */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => {
              setModalVisible(false);
              resetForm();
            }}
            contentContainerStyle={styles.modalContent}
          >
            <ScrollView>
              <Title style={styles.modalTitle}>
                {editingNote ? "Edit Session Note" : "Add Session Note"}
              </Title>

              {/* CLASS SELECTION */}
              <View style={styles.formField}>
                <Title style={styles.fieldLabel}>Class</Title>
                {loadingClasses ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <RNPickerSelect
                    onValueChange={(value) => setSelectedClass(value)}
                    items={availableClasses.map(c => ({
                      label: formatClassName(c),
                      value: c.id
                    }))}
                    value={selectedClass}
                    style={pickerSelectStyles}
                    placeholder={{ label: "Select a class...", value: null }}
                    useNativeAndroidPickerStyle={false}
                  />
                )}
              </View>

              {/* TOPIC SELECTION */}
              {selectedClass && (
                <View style={styles.formField}>
                  <Title style={styles.fieldLabel}>Topic (Optional)</Title>
                  {loadingTopics ? (
                    <ActivityIndicator size="small" />
                  ) : availableTopics.length > 0 ? (
                    <RNPickerSelect
                      onValueChange={(value) => setSelectedTopic(value)}
                      items={availableTopics.map(t => ({
                        label: t.name,
                        value: t.id
                      }))}
                      value={selectedTopic}
                      style={pickerSelectStyles}
                      placeholder={{ label: "Select a topic...", value: null }}
                      useNativeAndroidPickerStyle={false}
                    />
                  ) : (
                    <Paragraph style={styles.noTopicsText}>
                      No topics available for this class
                    </Paragraph>
                  )}
                </View>
              )}

              <Divider style={styles.divider} />

              {/* DATE PICKER */}
              <View style={styles.formField}>
                <Title style={styles.fieldLabel}>Session Date</Title>
                <DateTimePicker
                  value={sessionDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setSessionDate(selectedDate);
                  }}
                />
              </View>

              {/* LESSON SUMMARY */}
              <TextInput
                label="Lesson Summary"
                value={lessonSummary}
                onChangeText={setLessonSummary}
                style={styles.input}
                multiline
              />

              {/* ENGAGEMENT LEVEL */}
              <View style={styles.pickerContainer}>
                <Title style={styles.fieldLabel}>Engagement Level</Title>
                <RNPickerSelect
                  onValueChange={(value: "Highly Engaged" | "Engaged" | "Neutral" | "Distracted") => 
                    setEngagementLevel(value)
                  }
                  items={[
                    { label: "Highly Engaged", value: "Highly Engaged" },
                    { label: "Engaged", value: "Engaged" },
                    { label: "Neutral", value: "Neutral" },
                    { label: "Distracted", value: "Distracted" },
                  ]}
                  value={engagementLevel}
                  style={pickerSelectStyles}
                  placeholder={{ label: "Select engagement level...", value: null }}
                  useNativeAndroidPickerStyle={false}
                />
              </View>

              {/* UNDERSTANDING LEVEL */}
              <View style={styles.pickerContainer}>
                <Title style={styles.fieldLabel}>Understanding Level</Title>
                <RNPickerSelect
                  onValueChange={(value: "Excellent" | "Good" | "Fair" | "Needs Improvement") => 
                    setUnderstandingLevel(value)
                  }
                  items={[
                    { label: "Excellent", value: "Excellent" },
                    { label: "Good", value: "Good" },
                    { label: "Fair", value: "Fair" },
                    { label: "Needs Improvement", value: "Needs Improvement" },
                  ]}
                  value={understandingLevel}
                  style={pickerSelectStyles}
                  placeholder={{ label: "Select understanding level...", value: null }}
                  useNativeAndroidPickerStyle={false}
                />
              </View>

              {/* HOMEWORK */}
              <TextInput
                label="Homework Assigned"
                value={homeworkAssigned}
                onChangeText={setHomeworkAssigned}
                style={styles.input}
              />

              {/* TUTOR NOTES */}
              <TextInput
                label="Tutor Notes"
                value={tutorNotes}
                onChangeText={setTutorNotes}
                style={styles.input}
                multiline
              />

              {/* ASSIGNMENT COMPLETION - Moved to end */}
              {homeworkAssigned && (
                <View style={styles.completionSection}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowCompletionRate(!showCompletionRate)}
                    style={styles.completionButton}
                  >
                    {showCompletionRate ? 'Hide Completion Rate' : 'Add Completion Rate'}
                  </Button>
                  
                  {showCompletionRate && (
                    <View style={styles.completionContainer}>
                      <TextInput
                        label="Completion Rate (%)"
                        value={assignmentCompletion}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          if (numericValue === '' || parseInt(numericValue, 10) <= 100) {
                            setAssignmentCompletion(numericValue);
                          }
                        }}
                        keyboardType="numeric"
                        style={styles.completionInput}
                        placeholder="Enter completion rate (0-100)"
                        maxLength={3}
                      />
                      <Paragraph style={styles.completionHelper}>
                        Enter a value between 0 and 100
                      </Paragraph>
                    </View>
                  )}
                </View>
              )}

              {/* BUTTONS */}
              <Button
                mode="contained"
                onPress={handleAddOrUpdateSessionNote}
                style={styles.modalButton}
                disabled={!selectedClass}
              >
                {editingNote ? "Update Note" : "Add Note"}
              </Button>

              <Button
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
            </ScrollView>
          </Modal>
        </Portal>

        {/* SNACKBAR FOR FEEDBACK */}
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
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  addButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    borderRadius: 28,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    marginBottom: 12,
  },
  modalButton: {
    marginTop: 8,
  },
  pickerContainer: {
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    padding: 8,
  },
  spacer: {
    height: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  noTopicsText: {
    fontStyle: "italic",
    color: "#666",
    padding: 8,
  },
  completionSection: {
    marginVertical: 8,
    padding: 8,
    borderRadius: 8,
  },
  completionButton: {
    marginBottom: 8,
  },
  completionContainer: {
    paddingHorizontal: 8,
    marginTop: 8,
  },
  completionInput: {
    marginBottom: 4,
  },
  completionHelper: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    color: "black",
    paddingRight: 30,
    backgroundColor: "white",
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    color: "black",
    paddingRight: 30,
    backgroundColor: "white",
  },
});

// Dynamic picker styles based on theme
const getPickerSelectStyles = (theme: any) => StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    color: theme.colors.text,
    paddingRight: 30,
    backgroundColor: theme.colors.surface,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 8,
    color: theme.colors.text,
    paddingRight: 30,
    backgroundColor: theme.colors.surface,
  },
  placeholder: {
    color: theme.colors.text + '88',
  },
});