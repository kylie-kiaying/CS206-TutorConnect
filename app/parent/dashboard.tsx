import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, FlatList, useColorScheme, Dimensions, TouchableOpacity, Image } from "react-native";
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
  Icon,
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
import ImageModal from '../../components/ImageModal';

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

export type SessionNote = {
  id: string;
  student_id: string;
  session_date: string;
  date: string; // alias for session_date for compatibility
  subject: string;
  topic: string;
  lesson_summary: string;
  homework_assigned: string;
  homework?: string; // alias for homework_assigned for compatibility
  engagement_level: "Highly Engaged" | "Engaged" | "Neutral" | "Distracted" | "Unattentive";
  understanding_level: "Excellent" | "Good" | "Fair" | "Needs Improvement" | "Poor" ;
  tutor_notes: string;
  notes?: string; // alias for tutor_notes for compatibility
  parent_feedback: string;
  class_id?: string;
  topic_id?: string;
  assignment_completion?: number;
  duration: number;
  status: 'completed' | 'scheduled' | 'cancelled';
  objectives: string[];
  nextSession?: string;
  file_url?: string;
  tutor: {
    name: string;
    subject: string;
  };
};

type Student = {
  id: string;
  name: string;
  code?: string;
};

export type AnalyticsData = {
  dates: string[];
  engagement: number[];
  understanding: number[];
  subjects: Record<string, {
    dates: string[];
    engagement: number[];
    understanding: number[];
  }>;
  totalHours: number;
  averageScore: number;
  improvementRate: number;
  attendanceRate: number;
  recentActivity: SessionNote[];
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
    totalHours: 0,
    averageScore: 0,
    improvementRate: 0,
    attendanceRate: 0,
    recentActivity: []
  });

  const engagementMap = {
    'Unattentive': 1,
    'Distracted': 2,
    'Neutral': 3,
    'Engaged': 4,
    'Highly Engaged': 5
  };

  const understandingMap = {
    'Poor': 1,
    'Needs Improvement': 2,
    'Fair': 3,
    'Good': 4,
    'Excellent': 5
  };

  // Add this to your state declarations
  const [availableClasses, setAvailableClasses] = useState<Array<{id: string, name: string, subject: string}>>([]);

  // Add these state declarations
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Add state for collapsed months
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Add state for selected image
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

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
        // Get all unique class IDs
        const classIds = [...new Set(notes
          .filter(note => note.class_id)
          .map(note => note.class_id))];

        // Get all unique topic IDs
        const topicIds = [...new Set(notes
          .filter(note => note.topic_id)
          .map(note => note.topic_id))];

        if (classIds.length > 0) {
          // Fetch all classes
          const { data: classes, error: classError } = await supabase
            .from('classes')
            .select('id, name, subject')
            .in('id', classIds);

          if (classError) {
            console.error('Error fetching classes:', classError);
          }

          // Fetch all topics
          const { data: topics, error: topicError } = await supabase
            .from('topics')
            .select('id, name, class_id')
            .in('id', topicIds);

          if (topicError) {
            console.error('Error fetching topics:', topicError);
          }

          if (classes && classes.length > 0) {
            setAvailableClasses(classes);
            
            if (topics && topics.length > 0) {
              setAvailableTopics(topics);
            }

            const notesWithSubjects = notes.map(note => {
              const classInfo = classes.find(c => c.id === note.class_id);
              const topicInfo = topics?.find(t => t.id === note.topic_id);
              
              return {
                ...note,
                subject: classInfo?.subject || classInfo?.name || 'Unknown Class',
                topic: topicInfo?.name || note.topic || 'Untitled Topic'
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
          subjects: {},
          totalHours: 0,
          averageScore: 0,
          improvementRate: 0,
          attendanceRate: 0,
          recentActivity: []
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

    const data: AnalyticsData = {
      dates: [],
      engagement: [],
      understanding: [],
      subjects: {},
      totalHours: 0,
      averageScore: 0,
      improvementRate: 0,
      attendanceRate: 0,
      recentActivity: sortedNotes.slice(0, 5) // Get 5 most recent notes
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

    // Calculate metrics
    data.totalHours = sortedNotes.length * 1; // Assuming 1 hour per session
    data.averageScore = data.understanding.reduce((a, b) => a + b, 0) / data.understanding.length;
    
    // Calculate improvement rate (comparing first and last 3 sessions)
    const firstThree = data.understanding.slice(0, 3);
    const lastThree = data.understanding.slice(-3);
    const firstAvg = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;
    const lastAvg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;
    data.improvementRate = ((lastAvg - firstAvg) / firstAvg) * 100;

    // Calculate attendance rate (assuming 2 sessions per week)
    const weeks = Math.ceil((new Date(sortedNotes[sortedNotes.length - 1].session_date).getTime() - 
      new Date(sortedNotes[0].session_date).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const expectedSessions = weeks * 2;
    data.attendanceRate = (sortedNotes.length / expectedSessions) * 100;

    setAnalyticsData(data);
  };

  // Update the getSubjectColor function to return darker colors
  const getSubjectColor = (subject: string, isPastel: boolean = false): string => {
    // Generate a consistent color based on the subject name
    const hash = subject.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const h = Math.abs(hash) % 360;
    
    // Return either pastel or darker color based on the flag
    return isPastel 
      ? `hsl(${h}, 70%, 90%)`  // Pastel for chips
      : `hsl(${h}, 70%, 45%)`; // Darker for charts
  };

  const getScoreColor = (score: number): string => {
    if (score >= 3.5) return '#4CAF50'; // Green
    if (score >= 2.5) return '#2196F3'; // Blue
    if (score >= 1.5) return '#FFB700'; // Yellow
    return '#FF4B4B'; // Red
  };

  // Update the AnalyticsView component
  const AnalyticsView = ({ data }: { data: AnalyticsData }) => {
    const screenWidth = Dimensions.get('window').width;
    const [selectedSubject, setSelectedSubject] = useState<string>('all');

    // Get the data for the selected subject or all subjects
    const getFilteredData = () => {
      if (selectedSubject === 'all') {
        return {
          dates: data.dates,
          engagement: data.engagement,
          understanding: data.understanding
        };
      }
      return {
        dates: data.subjects[selectedSubject]?.dates || [],
        engagement: data.subjects[selectedSubject]?.engagement || [],
        understanding: data.subjects[selectedSubject]?.understanding || []
      };
    };

    const filteredData = getFilteredData();

    // Calculate averages based on filtered data
    const getAverages = () => {
      const engagementAvg = filteredData.engagement.length > 0
        ? (filteredData.engagement.reduce((a, b) => a + b, 0) / filteredData.engagement.length)
        : 0;
      
      const understandingAvg = filteredData.understanding.length > 0
        ? (filteredData.understanding.reduce((a, b) => a + b, 0) / filteredData.understanding.length)
        : 0;

      return {
        engagement: engagementAvg.toFixed(1),
        understanding: understandingAvg.toFixed(1)
      };
    };

    const averages = getAverages();

    // Update chart configuration
    const engagementChartConfig = {
      labels: filteredData.dates,
      datasets: [{
        data: filteredData.engagement,
        color: (opacity = 1) => selectedSubject === 'all' 
          ? `rgba(33, 150, 243, ${opacity})`  // Default blue for 'all'
          : getSubjectColor(selectedSubject),
        strokeWidth: 2
      }],
      options: {
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: (value: number) => {
                const labels = ['', 'Low', '', 'Med', '', 'High'];
                return labels[value] || '';
              }
            }
          }
        }
      }
    };

    const understandingChartConfig = {
      labels: filteredData.dates,
      datasets: [{
        data: filteredData.understanding,
        color: (opacity = 1) => selectedSubject === 'all'
          ? `rgba(76, 175, 80, ${opacity})`  // Default green for 'all'
          : getSubjectColor(selectedSubject),
        strokeWidth: 2
      }],
      options: {
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: (value: number) => {
                const labels = ['', 'Basic', '', 'Good', '', 'Exc'];
                return labels[value] || '';
              }
            }
          }
        }
      }
    };

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
              style={[
                styles.subjectChip,
                { backgroundColor: '#F5F5F5' },
                selectedSubject === 'all' && styles.subjectChipSelected
              ]}
            >
              <Text style={styles.subjectChipText}>All Subjects</Text>
            </Chip>
            {Object.keys(data.subjects).map(subject => (
              <Chip
                key={subject}
                selected={selectedSubject === subject}
                onPress={() => setSelectedSubject(subject)}
                style={[
                  styles.subjectChip,
                  { backgroundColor: getSubjectColor(subject, true) },
                  selectedSubject === subject && [
                    styles.subjectChipSelected,
                    { borderColor: getSubjectColor(subject, false) }
                  ]
                ]}
              >
                <Text style={styles.subjectChipText}>{subject}</Text>
              </Chip>
            ))}
          </ScrollView>

          {/* Analytics Cards */}
          <Surface style={styles.statsCard}>
            <Title style={styles.statsTitle}>
              {selectedSubject === 'all' ? 'Overall Performance' : `${selectedSubject} Performance`}
            </Title>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average Engagement</Text>
                <Text style={[
                  styles.statValue,
                  { color: getScoreColor(parseFloat(averages.engagement)) }
                ]}>
                  {averages.engagement}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average Understanding</Text>
                <Text style={[
                  styles.statValue,
                  { color: getScoreColor(parseFloat(averages.understanding)) }
                ]}>
                  {averages.understanding}
                </Text>
              </View>
            </View>
          </Surface>

          {/* Engagement Chart */}
          <Surface style={[
            styles.chartCard,
            { borderLeftColor: selectedSubject === 'all' ? theme.colors.primary : getSubjectColor(selectedSubject) }
          ]}>
            <Title style={styles.chartTitle}>Student Engagement</Title>
            <View style={styles.chartWrapper}>
              <LineChart
                data={engagementChartConfig}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => selectedSubject === 'all' 
                    ? `rgba(33, 150, 243, ${opacity})`  // Default blue for 'all'
                    : getSubjectColor(selectedSubject),
                  labelColor: (opacity = 1) => theme.colors.text,
                  strokeWidth: 2,
                  propsForBackgroundLines: {
                    strokeWidth: 1,
                    stroke: theme.colors.text,
                    strokeOpacity: 0.1,
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                  formatYLabel: (yLabel: string) => {
                    const value = parseInt(yLabel, 10);
                    const labels = ['', 'Low', '', 'Med', '', 'High'];
                    return labels[value] || '';
                  }
                }}
                bezier
                style={{
                  ...styles.chart,
                  elevation: 0
                }}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
                segments={4}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={true}
                yAxisInterval={1}
              />
            </View>
          </Surface>

          {/* Understanding Chart */}
          <Surface style={[
            styles.chartCard,
            { borderLeftColor: selectedSubject === 'all' ? theme.colors.primary : getSubjectColor(selectedSubject) }
          ]}>
            <Title style={styles.chartTitle}>Topic Understanding</Title>
            <View style={styles.chartWrapper}>
              <LineChart
                data={understandingChartConfig}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => selectedSubject === 'all'
                    ? `rgba(76, 175, 80, ${opacity})`  // Default green for 'all'
                    : getSubjectColor(selectedSubject),
                  labelColor: (opacity = 1) => theme.colors.text,
                  strokeWidth: 2,
                  propsForBackgroundLines: {
                    strokeWidth: 1,
                    stroke: theme.colors.text,
                    strokeOpacity: 0.1,
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                  formatYLabel: (yLabel: string) => {
                    const value = parseInt(yLabel, 10);
                    const labels = ['', 'Basic', '', 'Good', '', 'Exc'];
                    return labels[value] || '';
                  }
                }}
                bezier
                style={{
                  ...styles.chart,
                  elevation: 0
                }}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
                segments={4}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={true}
                yAxisInterval={1}
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

  // Add this function to get engagement style
  const getEngagementStyle = (level: string) => {
    switch (level) {
      case 'Highly Engaged':
        return styles.engagementHigh;
      case 'Engaged':
        return styles.engagementMedium;
      case 'Neutral':
      case 'Distracted':
        return styles.engagementLow;
      default:
        return {};
    }
  };

  // Add toggle function for months
  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Add a function to get class header color based on class ID
  const getClassHeaderColor = (classId: string): string => {
    // Generate a consistent pastel color based on the class ID
    const hash = classId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Generate pastel colors by keeping high lightness
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 90%)`;
  };

  // Add this function to handle image press
  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
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
            {/* Student selector */}
            <View style={styles.studentChipsWrapper}>
              <Text style={styles.studentChipsLabel}>My Children</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentChipsContainer}
              >
                {students.map(student => (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => setSelectedStudent(student)}
                    style={[
                      styles.studentChip,
                      selectedStudent?.id === student.id && styles.studentChipSelected
                    ]}
                  >
                    <Text style={styles.studentChipText}>
                      {student.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Add student row */}
            <TouchableOpacity 
              style={styles.addStudentRow}
              onPress={() => setAddStudentModalVisible(true)}
            >
              <Icon source="account-plus" size={20} color="#A6A6A6" />
              <Text style={styles.addStudentText}>Add a new child account</Text>
            </TouchableOpacity>

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
                  <ScrollView style={styles.listContent}>
                    {organizeNotesByClassAndWeek(sessionNotes).map((classGroup) => (
                      <View key={classGroup.classId} style={styles.classCard}>
                        <View 
                          style={[
                            styles.classHeader,
                            { backgroundColor: getClassHeaderColor(classGroup.classId) }
                          ]}
                        >
                          <Text style={styles.classTitle}>
                            {availableClasses.find(c => c.id === classGroup.classId)?.name || 'Unknown Class'}
                          </Text>
                        </View>
                        {classGroup.weeklyNotes.map((weekGroup) => {
                          const monthKey = `${classGroup.classId}-${weekGroup.weekStart}`;
                          const isCollapsed = collapsedMonths[monthKey];
                          
                          return (
                            <View key={weekGroup.weekStart} style={styles.monthSection}>
                              <TouchableOpacity 
                                style={styles.monthHeader}
                                onPress={() => toggleMonth(monthKey)}
                              >
                                <Text style={styles.monthText}>
                                  {format(new Date(weekGroup.weekStart), "MMMM yyyy")}
                                </Text>
                                <Icon 
                                  source={isCollapsed ? "chevron-right" : "chevron-down"} 
                                  size={14} 
                                  color="#A6A6A6" 
                                />
                              </TouchableOpacity>
                              <View style={styles.divider} />
                              {!isCollapsed && weekGroup.notes.map((note) => (
                                <TouchableOpacity
                                  key={note.id}
                                  style={styles.sessionCard}
                                  onPress={() => handleViewNoteDetails(note)}
                                >
                                  {note.file_url ? (
                                    <TouchableOpacity onPress={() => handleImagePress(note.file_url!)}>
                                      <Image
                                        source={{ uri: note.file_url }}
                                        style={styles.sessionImage}
                                      />
                                    </TouchableOpacity>
                                  ) : (
                                    <View style={[styles.sessionImage, styles.noImagePlaceholder]}>
                                      <Icon source="image-off" size={24} color="#A6A6A6" />
                                    </View>
                                  )}
                                  <View style={styles.sessionContent}>
                                    <Text style={styles.sessionSubject}>
                                      {note.topic || 'Untitled Topic'}
                                    </Text>
                                    <Text style={styles.sessionDate}>
                                      {format(new Date(note.session_date), "d MMMM yyyy")}
                                    </Text>
                                    <Text style={[styles.sessionEngagement, getEngagementStyle(note.engagement_level)]}>
                                      {note.engagement_level}
                                    </Text>
                                    <Text style={styles.sessionNotes} numberOfLines={2}>
                                      {note.tutor_notes}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                          );
                        })}
                      </View>
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

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Topic Understanding</Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {selectedNote.understanding_level}
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

        {/* Add ImageModal at the end of the component, before the closing PaperProvider tag */}
        <ImageModal
          visible={imageModalVisible}
          imageUrl={selectedImage || ''}
          onClose={() => {
            setImageModalVisible(false);
            setSelectedImage(null);
          }}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F2F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentChipsWrapper: {
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 221, 221, 0.87)',
  },
  studentChipsLabel: {
    fontSize: 14,
    color: '#A6A6A6',
    marginLeft: 19,
    marginBottom: 8,
  },
  studentChipsContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  studentChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#DDDDDD',
  },
  studentChipSelected: {
    backgroundColor: 'rgba(31, 156, 255, 0.38)',
    borderColor: '#1F9CFF',
    borderWidth: 0.4,
  },
  studentChipText: {
    fontSize: 16,
    color: '#000000',
  },
  addStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  addStudentText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#A6A6A6',
  },
  classCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  classHeader: {
    height: 59,
    justifyContent: 'center',
    paddingHorizontal: 17,
  },
  noImagePlaceholder: {
    backgroundColor: 'rgba(221, 221, 221, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classTitle: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '600',
  },
  monthSection: {
    paddingHorizontal: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  monthText: {
    fontSize: 14,
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(221, 221, 221, 0.87)',
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
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
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
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  subjectChipSelected: {
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 14,
  },
  statsCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
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
    fontSize: 32,
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
  sessionCard: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 8,
    backgroundColor: 'rgba(221, 221, 221, 0.26)',
    borderRadius: 10,
  },
  sessionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  sessionContent: {
    flex: 1,
  },
  sessionSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: '#A6A6A6',
    marginBottom: 4,
  },
  sessionEngagement: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  sessionNotes: {
    fontSize: 14,
    color: '#666666',
  },
  engagementHigh: {
    color: '#4CAF50',
  },
  engagementMedium: {
    color: '#FFB700',
  },
  engagementLow: {
    color: '#FF4B4B',
  },
});
