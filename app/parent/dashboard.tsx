import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, FlatList, useColorScheme, Dimensions } from "react-native";
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
import { LineChart, BarChart } from "react-native-chart-kit";

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
  engagement_level: "Highly Engaged" | "Engaged" | "Neutral" | "Distracted";
  understanding_level: "Excellent" | "Good" | "Fair" | "Needs Improvement";
  tutor_notes: string;
  parent_feedback: string;
  class_id?: string;
  topic_id?: string;
  assignment_completion?: number;
};

type Student = {
  id: string;
  name: string;
  code?: string;
};

type AnalyticsData = {
  dates: string[];
  engagement: number[];
  understanding: number[];
  subjects: Record<string, {
    dates: string[];
    engagement: number[];
    understanding: number[];
  }>;
};

// Add these helper types
type WeeklyNotes = {
  weekStart: string;
  notes: SessionNote[];
};

type ClassNotes = {
  classId: string;
  className: string;
  weeklyNotes: WeeklyNotes[];
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

  // Add these to your ParentScreen component state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dates: [],
    engagement: [],
    understanding: [],
    subjects: {},
  });

  // Add this to your state declarations
  const [availableClasses, setAvailableClasses] = useState<Array<{id: string, name: string, subject: string}>>([]);

  // Add these state declarations
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Create theme-dependent styles inside the component
  const themedStyles = {
    studentChipsWrapper: {
      backgroundColor: theme.colors.background,
    },
  };

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
        const classIds = [...new Set(notes
          .filter(note => note.class_id)
          .map(note => note.class_id))];

        if (classIds.length > 0) {
          const { data: classes, error } = await supabase
            .from('classes')
            .select('id, name, subject')
            .eq('id', classIds[0]);

          if (error) {
            console.error('Error fetching classes:', error);
          } else if (classes && classes.length > 0) {
            setAvailableClasses(classes);
            
            const notesWithSubjects = notes.map(note => {
              const classInfo = classes.find(c => c.id === note.class_id);
              return {
                ...note,
                subject: classInfo?.subject || classInfo?.name || 'Unknown Class'
              };
            });

            setSessionNotes(notesWithSubjects);
            processAnalyticsData(notesWithSubjects);
          } else {
            const notesWithSubjects = notes.map(note => ({
              ...note,
              subject: 'Unknown Class'
            }));
            setSessionNotes(notesWithSubjects);
            processAnalyticsData(notesWithSubjects);
          }
        }
      } else {
        setSessionNotes([]);
        setAnalyticsData({
          dates: [],
          engagement: [],
          understanding: [],
          subjects: {}
        });
      }
    } catch (error) {
      console.error("Error in fetchSessionNotes:", error);
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

  // Add this function to process session notes into analytics data
  const processAnalyticsData = (notes: SessionNote[]) => {
    const sortedNotes = [...notes].sort((a, b) => 
      new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
    );

    const engagementMap = {
      'Highly Engaged': 4,
      'Engaged': 3,
      'Neutral': 2,
      'Distracted': 1
    };

    const understandingMap = {
      'Excellent': 4,
      'Good': 3,
      'Fair': 2,
      'Needs Improvement': 1
    };

    const data: AnalyticsData = {
      dates: [],
      engagement: [],
      understanding: [],
      subjects: {},
    };

    sortedNotes.forEach(note => {
      const formattedDate = format(new Date(note.session_date), 'MM/dd');
      const engagementLevel = engagementMap[note.engagement_level] || 0;
      const understandingLevel = understandingMap[note.understanding_level] || 0;

      data.dates.push(formattedDate);
      data.engagement.push(engagementLevel);
      data.understanding.push(understandingLevel);

      if (note.subject) {
        if (!data.subjects[note.subject]) {
          data.subjects[note.subject] = {
            dates: [],
            engagement: [],
            understanding: []
          };
        }
        data.subjects[note.subject].dates.push(formattedDate);
        data.subjects[note.subject].engagement.push(engagementLevel);
        data.subjects[note.subject].understanding.push(understandingLevel);
      }
    });

    setAnalyticsData(data);
  };

  // Update the AnalyticsView component
  const AnalyticsView = ({ data }: { data: AnalyticsData }) => {
    const screenWidth = Dimensions.get('window').width;
    const [selectedSubject, setSelectedSubject] = useState<string>('all');

    return (
      <View style={styles.analyticsContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.analyticsScrollContent}
        >
          {/* Subject Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.subjectFilter}
          >
            <Chip
              selected={selectedSubject === 'all'}
              onPress={() => setSelectedSubject('all')}
              style={styles.subjectChip}
            >
              All Subjects
            </Chip>
            {Object.keys(data.subjects).map(subject => (
              <Chip
                key={subject}
                selected={selectedSubject === subject}
                onPress={() => setSelectedSubject(subject)}
                style={styles.subjectChip}
              >
                {subject}
              </Chip>
            ))}
          </ScrollView>

          {/* Analytics Cards */}
          <Surface style={styles.statsCard}>
            <Title style={styles.statsTitle}>Performance Overview</Title>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average Engagement</Text>
                <Text style={styles.statValue}>
                  {(data.engagement.reduce((a, b) => a + b, 0) / data.engagement.length).toFixed(1)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average Understanding</Text>
                <Text style={styles.statValue}>
                  {(data.understanding.reduce((a, b) => a + b, 0) / data.understanding.length).toFixed(1)}
                </Text>
              </View>
            </View>
          </Surface>

          {/* Engagement Chart */}
          <Surface style={styles.chartCard}>
            <Title style={styles.chartTitle}>Student Engagement</Title>
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: data.dates,
                  datasets: [{ 
                    data: data.engagement,
                    color: (opacity = 1) => theme.colors.primary,
                    strokeWidth: 2,
                  }],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => theme.colors.primary,
                  labelColor: (opacity = 1) => theme.colors.text,
                  strokeWidth: 2,
                  propsForBackgroundLines: {
                    strokeWidth: 1,
                    stroke: theme.colors.text,
                    strokeOpacity: 0.1,
                  },
                  propsForLabels: {
                    display: 'none',
                  },
                }}
                bezier
                style={styles.chart}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
                segments={4}
                withVerticalLabels={false}
                withHorizontalLabels={false}
                formatYLabel={() => ''}
                fromZero={true}
              />
            </View>
          </Surface>

          {/* Understanding Chart */}
          <Surface style={styles.chartCard}>
            <Title style={styles.chartTitle}>Topic Understanding</Title>
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: data.dates,
                  datasets: [{ 
                    data: data.understanding,
                    color: (opacity = 1) => theme.colors.secondary || theme.colors.primary,
                    strokeWidth: 2,
                  }],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => theme.colors.secondary || theme.colors.primary,
                  labelColor: (opacity = 1) => theme.colors.text,
                  strokeWidth: 2,
                  propsForBackgroundLines: {
                    strokeWidth: 1,
                    stroke: theme.colors.text,
                    strokeOpacity: 0.1,
                  },
                  propsForLabels: {
                    display: 'none',
                  },
                }}
                bezier
                style={styles.chart}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
                segments={4}
                withVerticalLabels={false}
                withHorizontalLabels={false}
                formatYLabel={() => ''}
                fromZero={true}
              />
            </View>
          </Surface>
        </ScrollView>
      </View>
    );
  };

  // Add this function
  const handleViewNoteDetails = (note: SessionNote) => {
    setSelectedNote(note);
    setDetailModalVisible(true);
  };

  // Add this function to organize notes by class and week
  const organizeNotesByClassAndWeek = (notes: SessionNote[]): ClassNotes[] => {
    // First, group notes by class
    const notesByClass = notes.reduce((acc, note) => {
      const classId = note.class_id || 'unassigned';
      if (!acc[classId]) {
        acc[classId] = [];
      }
      acc[classId].push(note);
      return acc;
    }, {} as Record<string, SessionNote[]>);

    // Then, for each class, group notes by week
    return Object.entries(notesByClass).map(([classId, classNotes]) => {
      // Sort notes by date
      const sortedNotes = [...classNotes].sort((a, b) => 
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );

      // Group by week
      const weeklyNotes = sortedNotes.reduce((acc, note) => {
        const noteDate = new Date(note.session_date);
        // Get start of week (Sunday)
        const weekStart = new Date(noteDate);
        weekStart.setDate(noteDate.getDate() - noteDate.getDay());
        const weekStartStr = format(weekStart, "yyyy-MM-dd");

        const existingWeek = acc.find(w => w.weekStart === weekStartStr);
        if (existingWeek) {
          existingWeek.notes.push(note);
        } else {
          acc.push({
            weekStart: weekStartStr,
            notes: [note]
          });
        }
        return acc;
      }, [] as WeeklyNotes[]);

      return {
        classId,
        className: classId === 'unassigned' ? 'Other' : 
          availableClasses.find(c => c.id === classId)?.name || 'Unknown Class',
        weeklyNotes
      };
    });
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
            <View style={[
              styles.studentChipsWrapper, 
              themedStyles.studentChipsWrapper
            ]}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.studentChipsContainer,
                  themedStyles.studentChipsWrapper
                ]}
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
            </View>

            {/* Session notes for selected student */}
            {selectedStudent && !loadingNotes && (
              <View style={styles.contentContainer}>
                <View style={styles.tabButtons}>
                  <Button
                    mode={!showAnalytics ? "contained" : "outlined"}
                    onPress={() => setShowAnalytics(false)}
                    style={styles.tabButton}
                  >
                    Session Notes
                  </Button>
                  <Button
                    mode={showAnalytics ? "contained" : "outlined"}
                    onPress={() => setShowAnalytics(true)}
                    style={styles.tabButton}
                  >
                    Analytics
                  </Button>
                </View>
                
                {showAnalytics ? (
                  <AnalyticsView data={analyticsData} />
                ) : (
                  <ScrollView>
                    {organizeNotesByClassAndWeek(sessionNotes).map((classGroup) => (
                      <Surface 
                        key={classGroup.classId}
                        style={[styles.classSection, { backgroundColor: theme.colors.surface }]}
                      >
                        <Title style={[styles.classTitle, { color: theme.colors.primary }]}>
                          {classGroup.className}
                        </Title>
                        
                        {classGroup.weeklyNotes.map((weekGroup) => (
                          <List.Accordion
                            key={weekGroup.weekStart}
                            title={`Week of ${format(new Date(weekGroup.weekStart), "MMMM d, yyyy")}`}
                            style={styles.weekAccordion}
                          >
                            {weekGroup.notes.map((note) => (
                              <Card 
                                key={note.id}
                                style={[styles.noteCard, { backgroundColor: theme.colors.surfaceVariant }]}
                                onPress={() => handleViewNoteDetails(note)}
                              >
                                <Card.Content>
                                  <Paragraph style={{ color: theme.colors.text }}>
                                    Topic: {
                                      note.topic_id ? 
                                      availableTopics.find(t => t.id === note.topic_id)?.name : 
                                      note.topic || 'No Topic'
                                    }
                                  </Paragraph>
                                  <Paragraph style={{ color: theme.colors.text }}>
                                    Date: {format(new Date(note.session_date), "MMMM d, yyyy")}
                                  </Paragraph>
                                  <Paragraph style={{ color: theme.colors.text }}>
                                    Engagement: {note.engagement_level}
                                  </Paragraph>
                                  <Card.Actions>
                                    <Button onPress={() => handleOpenFeedbackModal(note)}>
                                      {note.parent_feedback ? 'Edit Feedback' : 'Add Feedback'}
                                    </Button>
                                  </Card.Actions>
                                </Card.Content>
                              </Card>
                            ))}
                          </List.Accordion>
                        ))}
                      </Surface>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
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

        {/* Add the Detail Modal */}
        <Portal>
          <Modal
            visible={detailModalVisible}
            onDismiss={() => {
              setDetailModalVisible(false);
              setSelectedNote(null);
            }}
            contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            {selectedNote && (
              <ScrollView>
                <Title style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Session Details
                </Title>
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Class</Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {selectedNote.class_id ? 
                      availableClasses.find(c => c.id === selectedNote.class_id)?.name || 'Unknown Class' :
                      selectedNote.subject || 'Unknown Subject'
                    }
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Topic</Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {selectedNote.topic_id ? 
                      availableTopics.find(t => t.id === selectedNote.topic_id)?.name : 
                      selectedNote.topic || 'N/A'
                    }
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Date</Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {format(new Date(selectedNote.session_date), "PPP")}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Engagement Level</Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {selectedNote.engagement_level}
                  </Text>
                </View>

                {selectedNote.homework_assigned && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Homework</Text>
                    <Text style={[styles.detailText, { color: theme.colors.text }]}>
                      {selectedNote.homework_assigned}
                    </Text>
                  </View>
                )}

                {selectedNote.tutor_notes && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Tutor Notes</Text>
                    <Text style={[styles.detailText, { color: theme.colors.text }]}>
                      {selectedNote.tutor_notes}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Parent Feedback</Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {selectedNote.parent_feedback || 'No feedback provided yet.'}
                  </Text>
                </View>

                {selectedNote.assignment_completion !== undefined && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Assignment Completion</Text>
                    <Text style={[styles.detailText, { color: theme.colors.primary }]}>
                      {selectedNote.assignment_completion}%
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <Button
                    mode="contained"
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleOpenFeedbackModal(selectedNote);
                    }}
                  >
                    {selectedNote.parent_feedback ? 'Edit Feedback' : 'Add Feedback'}
                  </Button>
                  <Button
                    onPress={() => {
                      setDetailModalVisible(false);
                      setSelectedNote(null);
                    }}
                    style={styles.closeButton}
                  >
                    Close
                  </Button>
                </View>
              </ScrollView>
            )}
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
    height: 80,
  },
  studentChipsWrapper: {
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
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
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  analyticsContainer: {
    flex: 1,
    width: '100%',
  },
  analyticsScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chartTitle: {
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  subjectFilter: {
    marginBottom: 16,
  },
  subjectChip: {
    marginRight: 8,
  },
  statsCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.7,
  },
  detailText: {
    fontSize: 16,
    lineHeight: 24,
  },
  closeButton: {
    marginTop: 8,
  },
  classSection: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  classTitle: {
    padding: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekAccordion: {
    backgroundColor: 'transparent',
  },
  noteCard: {
    margin: 8,
    marginHorizontal: 16,
    elevation: 1,
  },
});
