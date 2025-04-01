import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ScrollView, useColorScheme, Platform, TouchableOpacity, Image, Modal as RNModal, Dimensions } from "react-native";
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
    Text,
    IconButton,
    Icon,
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
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ImageModal from '../../components/ImageModal';

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

// Add type definitions
type TopicsByChapter = {
    [chapter: string]: Topic[];
};

type EngagementLevel = "Highly Engaged" | "Engaged" | "Neutral" | "Distracted" | "Unattentive";

const engagementLevelMap = {
    'Unattentive': 1,
    'Distracted': 2,
    'Neutral': 3,
    'Engaged': 4,
    'Highly Engaged': 5,
} as const;

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

// Update the datePickerStyles
const datePickerStyles = `
  .react-datepicker-wrapper {
    width: 100%;
    position: relative;
  }
  .react-datepicker-popper {
    position: absolute;
    z-index: 10000 !important;
    width: 100%;
    margin-top: 4px;
    transform: none !important;
    inset: auto auto auto 0 !important;
  }
  .react-datepicker {
    font-size: 0.9em;
    width: 100%;
    border-radius: 8px;
    border: 1px solid #E0E0E0;
    background-color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .react-datepicker__month-container {
    width: 100%;
    float: none;
  }
  .react-datepicker__header {
    padding: 0.8rem 0;
    background-color: #F5F5F5;
    border-bottom: 1px solid #E0E0E0;
  }
  .react-datepicker__month {
    margin: 0;
    padding: 0.4rem;
  }
  .react-datepicker__day-names, .react-datepicker__week {
    display: flex;
    justify-content: space-around;
    white-space: nowrap;
  }
  .react-datepicker__day-name, .react-datepicker__day {
    margin: 0.166rem 0;
    padding: 0.5rem;
    width: 2rem;
    line-height: 1rem;
    text-align: center;
  }
  .react-datepicker__current-month {
    font-size: 1em;
    padding: 0 0 0.8rem 0;
  }
  .react-datepicker__day--selected {
    background-color: #2196F3;
    color: white;
  }
  .react-datepicker__day--keyboard-selected {
    background-color: rgba(33, 150, 243, 0.5);
  }
  .react-datepicker__day:hover {
    background-color: rgba(33, 150, 243, 0.2);
  }
  .react-datepicker__triangle {
    display: none;
  }
`;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F2F8',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 8,
        overflow: 'hidden',
        maxHeight: Platform.OS === 'web' ? '80%' : '90%',
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    modalContainer: {
        height: '100%',
        backgroundColor: 'white',
        flexDirection: 'column' as const,
    },
    modalHeader: {
        backgroundColor: '#FFE4E4',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalHeaderTitle: {
        fontSize: 20,
        fontWeight: '600',
        flex: 1,
    },
    backButton: {
        marginRight: 8,
    },
    modalScroll: {
        padding: 24,
        flex: 1,
    },
    modalScrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
        marginHorizontal: 16,
    },
    formField: {
        marginBottom: 24,
        position: 'relative',
    },
    inputHeader: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        opacity: 0.8,
    },
    inputField: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginTop: 4,
        position: 'relative',
        zIndex: 10000,
        width: '100%',
    },
    datePickerInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 0,
        width: '100%',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 10000,
    },
    dateText: {
        fontSize: 16,
        color: '#000000',
    },
    sliderContainer: {
        marginTop: 8,
        height: 40,
        justifyContent: 'center',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderTrack: {
        height: 4,
        borderRadius: 2,
        top: 18,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        marginTop: 8,
        width: '100%',
    },
    sliderLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    sliderLabelStart: {
        textAlign: 'left',
    },
    sliderLabelEnd: {
        textAlign: 'right',
    },
    imageUploadContainer: {
        width: '48%',
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    },
    publishButton: {
        marginTop: 24,
        marginBottom: 16,
        backgroundColor: '#7E57C2',
        borderRadius: 8,
        height: 48,
    },
    publishButtonLabel: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
    sessionCard: {
        backgroundColor: 'rgba(221, 221, 221, 0.26)',
        borderRadius: 10,
        padding: 12,
        marginVertical: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardContent: {
        flex: 1,
    },
    topicTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
    },
    tutorNotes: {
        fontSize: 14,
        color: '#000000',
        marginBottom: 12,
        lineHeight: 20,
    },
    homeworkSection: {
        marginTop: 8,
        marginBottom: 12,
    },
    homeworkTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    homeworkText: {
        fontSize: 14,
        color: '#666666',
    },
    proficiencyRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    proficiencyLabel: {
        fontSize: 14,
        color: '#666666',
    },
    proficiencyValue: {
        fontSize: 14,
        marginLeft: 4,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
        gap: 8,
    },
    actionButton: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    editButton: {
        backgroundColor: '#E8E8E8',
    },
    deleteButton: {
        backgroundColor: '#FFE8E8',
    },
    editButtonText: {
        color: '#6750A4',
        fontSize: 14,
    },
    deleteButtonText: {
        color: '#FF4B4B',
        fontSize: 14,
    },
    noteImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginLeft: 12,
    },
    addButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#7E57C2',
        borderRadius: 28,
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
    searchResults: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 9999,
        maxHeight: 200,
        marginTop: 4,
        overflow: 'scroll',
    },
    searchResultItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: 'white',
    },
    imagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    imageContainer: {
        width: '48%',
        aspectRatio: 1,
        position: 'relative',
    },
    detailContent: {
        flex: 1,
        padding: 16,
    },
    detailSection: {
        marginBottom: 20,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#666',
    },
    detailValue: {
        fontSize: 16,
        lineHeight: 24,
    },
    attachmentsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    attachmentImage: {
        width: 150,
        height: 150,
        borderRadius: 8,
    },
    detailActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 20,
    },
    imagePreviewModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageScrollView: {
        flex: 1,
        width: '100%',
    },
    imageScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
});

const pickerSelectStyles = {
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        color: '#000000',
        backgroundColor: '#FFFFFF',
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        color: '#000000',
        backgroundColor: '#FFFFFF',
    },
    placeholder: {
        color: '#666666',
    },
};

type SessionStatus = "completed" | "scheduled" | "cancelled";

// Add these types after the existing type definitions
type WeeklyNotes = {
    weekStart: string;
    notes: SessionNote[];
};

type MonthlyNotes = {
    monthStart: string;
    notes: SessionNote[];
};

type ClassNotes = {
    classId: string;
    className: string;
    monthlyNotes: MonthlyNotes[];
};

// Add this function before the component
const organizeNotesByClassAndMonth = (notes: SessionNote[]): ClassNotes[] => {
    // First, group notes by class
    const notesByClass = notes.reduce((acc, note) => {
        const classId = note.class_id || 'unassigned';
        if (!acc[classId]) {
            acc[classId] = [];
        }
        acc[classId].push(note);
        return acc;
    }, {} as Record<string, SessionNote[]>);

    // Then, for each class, group notes by month
    return Object.entries(notesByClass).map(([classId, classNotes]) => {
        // Sort notes by date
        const sortedNotes = [...classNotes].sort((a, b) =>
            new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        );

        // Group by month
        const monthlyNotes = sortedNotes.reduce((acc, note) => {
            const noteDate = new Date(note.session_date);
            // Get start of month
            const monthStart = format(noteDate, "yyyy-MM-01");

            const existingMonth = acc.find(m => m.monthStart === monthStart);
            if (existingMonth) {
                existingMonth.notes.push(note);
            } else {
                acc.push({
                    monthStart,
                    notes: [note]
                });
            }
            return acc;
        }, [] as MonthlyNotes[]);

        return {
            classId,
            className: classId === 'unassigned' ? 'Other' : 'Unknown Class',
            monthlyNotes
        };
    });
};

// Add this function before the component
const getClassHeaderColor = (classId: string): string => {
    // Generate a consistent pastel color based on the class ID
    const hash = classId.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Generate pastel colors by keeping high lightness
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 90%)`;
};

// Add this type definition near the top of the file with other interfaces
interface ImagePreviewModalProps {
    visible: boolean;
    imageUrl: string;
    onClose: () => void;
}

const ImagePreviewModal = ({ visible, imageUrl, onClose }: ImagePreviewModalProps) => {
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (imageUrl) {
            Image.getSize(imageUrl, (width, height) => {
                setImageSize({ width, height });
                setIsLoading(false);
            });
        }
    }, [imageUrl]);

    const scale = Math.min(
        (Dimensions.get('window').width - 40) / imageSize.width,
        (Dimensions.get('window').height - 100) / imageSize.height
    );

    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;

    return (
        <RNModal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.imagePreviewModalContainer}>
                <View style={styles.imagePreviewContent}>
                    <TouchableOpacity 
                        style={styles.closeButton} 
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#007AFF" />
                    ) : (
                        <ScrollView 
                            style={styles.imageScrollView}
                            contentContainerStyle={styles.imageScrollContent}
                            maximumZoomScale={3}
                            minimumZoomScale={1}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                        >
                            <Image
                                source={{ uri: imageUrl }}
                                style={[
                                    styles.previewImage,
                                    {
                                        width: scaledWidth,
                                        height: scaledHeight,
                                    }
                                ]}
                                resizeMode="contain"
                            />
                        </ScrollView>
                    )}
                </View>
            </View>
        </RNModal>
    );
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
    const [studentName, setStudentName] = useState<string>("");

    // Sorting & Filtering States
    const [sortOrder, setSortOrder] = useState<"Newest" | "Oldest">("Newest");
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    // Form State for New Session Note
    const [sessionDate, setSessionDate] = useState(new Date());
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [lessonSummary, setLessonSummary] = useState("");
    const [homeworkAssigned, setHomeworkAssigned] = useState("");
    const [engagementLevel, setEngagementLevel] = useState<EngagementLevel>("Engaged");
    const [understandingLevel, setUnderstandingLevel] = useState<
        "Excellent" | "Good" | "Fair" | "Needs Improvement" | "Poor"
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

    // Add this state for handling web date input
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Update state for image handling
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // New state for topic selection
    const [topicSearchQuery, setTopicSearchQuery] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

    // Add state for homework completion
    const [homeworkCompleted, setHomeworkCompleted] = useState(false);

    // Add state for date picker visibility
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    // Add new state variables for additional fields
    const [duration, setDuration] = useState<string>('');
    const [status, setStatus] = useState<SessionStatus>("scheduled");
    const [objectives, setObjectives] = useState<string[]>([]);
    const [nextSession, setNextSession] = useState<Date | null>(null);
    const [showNextSessionPicker, setShowNextSessionPicker] = useState(false);

    // Add this state for collapsed months
    const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

    // New state for class search
    const [classSearchQuery, setClassSearchQuery] = useState('');
    const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
    const [showClassDropdown, setShowClassDropdown] = useState(false);
    const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
    const [showTopicDropdown, setShowTopicDropdown] = useState(false);

    const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    useEffect(() => {
        fetchSessionNotes();
        fetchAvailableClasses();
        fetchStudentName();
    }, []);

    useEffect(() => {
        // Initialize all months as collapsed when session notes change
        if (sessionNotes.length > 0) {
            const initialCollapsedState = organizeNotesByClassAndMonth(sessionNotes).reduce((acc, classGroup) => {
                classGroup.monthlyNotes.forEach(monthGroup => {
                    const monthKey = `${classGroup.classId}-${monthGroup.monthStart}`;
                    acc[monthKey] = true; // Set to true to make collapsed by default
                });
                return acc;
            }, {} as Record<string, boolean>);

            setCollapsedMonths(initialCollapsedState);
        }
    }, [sessionNotes]);

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

    useEffect(() => {
        // Create style element
        const styleEl = document.createElement('style');
        styleEl.innerHTML = datePickerStyles;
        document.head.appendChild(styleEl);

        // Cleanup
        return () => {
            document.head.removeChild(styleEl);
        };
    }, []);

    const fetchSessionNotes = async () => {
        if (!id) {
            console.error("No student ID provided");
            return;
        }

        try {
            const data = await getSessionNotes(id);
            if (!data) {
                console.error("No session notes found for student:", id);
                return;
            }

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
        } catch (error) {
            console.error("Error fetching session notes:", error);
            setSnackbarMessage("Error loading session notes");
            setSnackbarVisible(true);
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

    const fetchStudentName = async () => {
        if (id) {
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('name')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data) {
                    setStudentName(data.name);
                }
            } catch (error) {
                console.error('Error fetching student name:', error);
            }
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
        if (!id || !selectedClass) {
            setSnackbarMessage("Please select a class");
            setSnackbarVisible(true);
            return;
        }

        try {
            const noteData = {
                student_id: id,
                session_date: sessionDate.toISOString(),
                class_id: selectedClass,
                topic_id: selectedTopic,
                lesson_summary: lessonSummary,
                homework_assigned: homeworkAssigned || "",
                engagement_level: engagementLevel,
                understanding_level: understandingLevel,
                tutor_notes: tutorNotes,
                parent_feedback: '',
                file_url: selectedImages[0] || "", // Use first image as thumbnail
                attachments: selectedImages.map((url, index) => ({
                    id: Math.random().toString(36).substring(7),
                    url,
                    type: 'image' as const,
                    name: `Session Image ${index + 1}`
                }))
            };

            if (editingNote) {
                await updateSessionNote({
                    ...editingNote,
                    ...noteData,
                });
                setSnackbarMessage("Session note updated successfully!");
            } else {
                await addSessionNote(noteData);
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
        setSelectedImages([]);
        setTopicSearchQuery('');
        setSelectedTopics([]);
        setCollapsedMonths({});
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
        setEngagementLevel(note.engagement_level as EngagementLevel || "Engaged");
        setUnderstandingLevel(note.understanding_level as any || "Good");
        setTutorNotes(note.tutor_notes || "");
        setParentFeedback(note.parent_feedback || "");
        setAssignmentCompletion(note.assignment_completion?.toString() || '');
        setShowCompletionRate(!!note.assignment_completion);
        setSelectedImages(note.attachments?.map(a => a.url) || []);
        setCollapsedMonths({});
        setModalVisible(true);
    };

    // Format class name with subject
    const formatClassName = (classItem: Class) => {
        return `${classItem.name} (${classItem.subject})`;
    };

    // Update the date picker handling
    const handleDateChange = (
        event: DateTimePickerEvent,
        selectedDate?: Date | undefined
    ) => {
        setDatePickerVisible(false);
        if (selectedDate) {
            setSessionDate(selectedDate);
        }
    };

    // Update image upload function
    const handleImagePick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
                allowsMultipleSelection: true,
                selectionLimit: 5, // Limit to 5 images
            });

            if (!result.canceled) {
                const newImages = result.assets.map(asset => asset.uri);
                setSelectedImages(prev => [...prev, ...newImages]);
            }
        } catch (error) {
            console.error('Error picking images:', error);
            setSnackbarMessage('Error selecting images');
            setSnackbarVisible(true);
        }
    };

    // Add function to remove an image
    const handleRemoveImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    // New function for topic selection
    const toggleTopic = (topicId: string) => {
        if (selectedTopics.includes(topicId)) {
            setSelectedTopics(selectedTopics.filter(id => id !== topicId));
        } else {
            setSelectedTopics([...selectedTopics, topicId]);
        }
    };

    // Update the topics grouping with proper types
    const groupTopicsByChapter = (topics: Topic[]): TopicsByChapter => {
        return topics.reduce((chapters: TopicsByChapter, topic) => {
            const chapterMatch = topic.name.match(/^Chapter (\d+)/);
            const chapter = chapterMatch ? chapterMatch[1] : 'Other';
            if (!chapters[chapter]) {
                chapters[chapter] = [];
            }
            chapters[chapter].push(topic);
            return chapters;
        }, {});
    };

    // Update the homework completion toggle
    const toggleHomeworkCompletion = () => {
        setHomeworkCompleted(!homeworkCompleted);
    };

    // Helper functions for engagement level conversion
    const engagementLevelToNumber = (level: EngagementLevel): number => {
        return engagementLevelMap[level];
    };

    const numberToEngagementLevel = (value: number): EngagementLevel => {
        const levels = Object.entries(engagementLevelMap);
        const closest = levels.reduce((prev, curr) => {
            return Math.abs(curr[1] - value) < Math.abs(prev[1] - value) ? curr : prev;
        });
        return closest[0] as EngagementLevel;
    };

    // Add filtered topics logic
    const getFilteredTopics = () => {
        if (!selectedClass) return [];

        return availableTopics
            .filter(topic =>
                topic.class_id === selectedClass &&
                topic.name.toLowerCase().includes(topicSearchQuery.toLowerCase())
            );
    };

    // Group filtered topics
    const groupedTopics = groupTopicsByChapter(getFilteredTopics());

    // Add this helper function to group notes by month
    const groupNotesByMonth = (notes: SessionNote[]) => {
        const grouped = notes.reduce((acc, note) => {
            const date = new Date(note.session_date);
            const monthYear = format(date, 'MMMM yyyy');
            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(note);
            return acc;
        }, {} as Record<string, SessionNote[]>);

        // Sort months in reverse chronological order
        return Object.entries(grouped).sort((a, b) => {
            const dateA = new Date(a[0]);
            const dateB = new Date(b[0]);
            return dateB.getTime() - dateA.getTime();
        });
    };

    // Add this function inside the component
    const toggleMonth = (monthKey: string) => {
        setCollapsedMonths(prev => ({
            ...prev,
            [monthKey]: !prev[monthKey]
        }));
    };

    // Add this function to handle image press
    const handleImagePress = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setImageModalVisible(true);
    };

    const handleSessionNotePress = async (note: SessionNote) => {
        try {
            console.log(`Fetching attachments for session note ${note.id}`);
            console.log("Note ID type:", typeof note.id);
            
            // First, let's check if we can access the table at all
            const { data: tableInfo, error: tableError } = await supabase
                .from("session_attachments")
                .select("id, file_url, file_type, file_name, session_note_id")
                .limit(1);

            console.log("Table access check:", {
                hasData: !!tableInfo,
                error: tableError,
                tableInfo,
                tableStructure: tableInfo ? Object.keys(tableInfo[0] || {}) : null,
                rawResponse: JSON.stringify({ data: tableInfo, error: tableError }, null, 2)
            });

            // Now let's try to fetch all attachments with more detailed error logging
            const { data: allAttachments, error: allAttachmentsError } = await supabase
                .from("session_attachments")
                .select("*");

            console.log("All attachments query result:", {
                data: allAttachments,
                error: allAttachmentsError,
                count: allAttachments?.length,
                hasError: !!allAttachmentsError,
                firstAttachment: allAttachments?.[0],
                rawResponse: JSON.stringify({ data: allAttachments, error: allAttachmentsError }, null, 2)
            });

            // Now fetch attachments for this specific note with explicit logging
            console.log("Executing query for note ID:", note.id);
            const { data: attachmentsData, error: attachmentsError } = await supabase
                .from("session_attachments")
                .select("id, file_url, file_type, file_name, session_note_id")
                .eq("session_note_id", note.id);

            console.log("Specific note attachments query:", {
                noteId: note.id,
                data: attachmentsData,
                error: attachmentsError,
                count: attachmentsData?.length,
                query: `session_note_id = ${note.id}`,
                rawResponse: JSON.stringify({ data: attachmentsData, error: attachmentsError }, null, 2)
            });

            if (attachmentsError) {
                console.error(`Error fetching attachments for note ${note.id}:`, attachmentsError);
                return;
            }

            // Transform attachments to match the expected format
            const attachments = attachmentsData?.map(attachment => ({
                id: attachment.id,
                url: attachment.file_url,
                type: attachment.file_type as 'image' | 'pdf' | 'document',
                name: attachment.file_name
            })) || [];

            console.log("Transformed attachments:", attachments);

            // Set the note with its attachments
            setSelectedNote({
                ...note,
                attachments
            });
            setDetailModalVisible(true);
        } catch (error) {
            console.error(`Error in handleSessionNotePress for note ${note.id}:`, error);
        }
    };

    return (
        <PaperProvider>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.push('/tutor/dashboard')} />
                <Appbar.Content title="Session Notes" />
            </Appbar.Header>

            <ScrollView style={styles.container}>
                <View style={styles.contentContainer}>
                    {/* Grouped Session Notes */}
                    {organizeNotesByClassAndMonth(sessionNotes).map((classGroup) => (
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

                            {classGroup.monthlyNotes.map((monthGroup) => {
                                const monthKey = `${classGroup.classId}-${monthGroup.monthStart}`;
                                const isCollapsed = collapsedMonths[monthKey];

                                return (
                                    <View key={monthKey} style={styles.monthSection}>
                                        <TouchableOpacity
                                            style={styles.monthHeader}
                                            onPress={() => toggleMonth(monthKey)}
                                        >
                                            <Text style={styles.monthText}>
                                                {format(new Date(monthGroup.monthStart), "MMMM yyyy")}
                                            </Text>
                                            <IconButton
                                                icon={isCollapsed ? "chevron-down" : "chevron-up"}
                                                size={24}
                                            />
                                        </TouchableOpacity>

                                        {!isCollapsed && monthGroup.notes.map((note) => (
                                            <TouchableOpacity
                                                key={note.id}
                                                style={styles.sessionCard}
                                                onPress={() => handleSessionNotePress(note)}
                                            >
                                                <View style={styles.cardHeader}>
                                                    <View style={styles.cardContent}>
                                                        <Text style={styles.topicTitle}>
                                                            {note.topic_id ?
                                                                availableTopics.find(t => t.id === note.topic_id)?.name :
                                                                note.topic || 'Untitled Topic'}
                                                        </Text>
                                                        <Text style={styles.dateText}>
                                                            {format(new Date(note.session_date), "d MMMM yyyy")}
                                                        </Text>
                                                    </View>
                                                    {note.file_url && (
                                                        <TouchableOpacity onPress={() => handleImagePress(note.file_url!)}>
                                                            <Image
                                                                source={{ uri: note.file_url }}
                                                                style={styles.noteImage}
                                                            />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                                <Text>
                                                    {studentName || 'The student'} was <Text style={{
                                                        color: note.engagement_level === 'Highly Engaged' ? '#4CAF50' :
                                                            note.engagement_level === 'Engaged' ? '#FFB700' :
                                                                note.engagement_level === 'Neutral' ? '#808080' : '#FF4B4B'
                                                    }}>{note.engagement_level.toLowerCase()}</Text> this lesson.
                                                </Text>

                                                {note.tutor_notes && (
                                                    <Text style={styles.tutorNotes}>{note.tutor_notes}</Text>
                                                )}

                                                <View style={styles.homeworkSection}>
                                                    <Text style={styles.homeworkTitle}>Homework:</Text>
                                                    <Text style={styles.homeworkText}>
                                                        {note.homework_assigned || 'No homework assigned'}
                                                    </Text>
                                                </View>

                                                <View style={styles.proficiencyRow}>
                                                    <Text style={styles.proficiencyLabel}>Topic Understanding: </Text>
                                                    <Text style={[styles.proficiencyValue, {
                                                        color: note.understanding_level === 'Excellent' ? '#4CAF50' :
                                                            note.understanding_level === 'Good' ? '#FFB700' :
                                                                note.understanding_level === 'Fair' ? '#FFA726' : '#FF4B4B'
                                                    }]}>
                                                        {note.understanding_level}
                                                    </Text>
                                                </View>

                                                <View style={styles.cardActions}>
                                                    <TouchableOpacity
                                                        style={[styles.actionButton, styles.editButton]}
                                                        onPress={() => handleEditSessionNote(note)}
                                                    >
                                                        <Text style={styles.editButtonText}>Edit Note</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.actionButton, styles.deleteButton]}
                                                        onPress={() => handleDeleteSessionNote(note.id)}
                                                    >
                                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </ScrollView>

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

            {/* DETAIL VIEW MODAL */}
            <Portal>
                <Modal
                    visible={detailModalVisible}
                    onDismiss={() => {
                        setDetailModalVisible(false);
                        setSelectedNote(null);
                    }}
                    contentContainerStyle={[styles.modalContent, { padding: 0 }]}
                >
                    <View style={styles.modalContainer}>
                        {/* Pink Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    setDetailModalVisible(false);
                                    setSelectedNote(null);
                                }}
                                style={styles.backButton}
                            >
                                <IconButton icon="chevron-left" size={24} />
                            </TouchableOpacity>
                            <Text style={styles.modalHeaderTitle}>Session Note Details</Text>
                        </View>

                        <ScrollView style={styles.detailContent}>
                            {selectedNote && (
                                <>
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Date</Text>
                                        <Text style={styles.detailValue}>
                                            {format(new Date(selectedNote.session_date), "d MMMM yyyy")}
                                        </Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Topic</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedNote.topic_id ?
                                                availableTopics.find(t => t.id === selectedNote.topic_id)?.name :
                                                selectedNote.topic || 'Untitled Topic'}
                                        </Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Engagement Level</Text>
                                        <Text style={[styles.detailValue, {
                                            color: selectedNote.engagement_level === 'Highly Engaged' ? '#4CAF50' :
                                                selectedNote.engagement_level === 'Engaged' ? '#FFB700' :
                                                    selectedNote.engagement_level === 'Neutral' ? '#808080' : '#FF4B4B'
                                        }]}>
                                            {selectedNote.engagement_level}
                                        </Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Understanding Level</Text>
                                        <Text style={[styles.detailValue, {
                                            color: selectedNote.understanding_level === 'Excellent' ? '#4CAF50' :
                                                selectedNote.understanding_level === 'Good' ? '#FFB700' :
                                                    selectedNote.understanding_level === 'Fair' ? '#FFA726' : '#FF4B4B'
                                        }]}>
                                            {selectedNote.understanding_level}
                                        </Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Lesson Summary</Text>
                                        <Text style={styles.detailValue}>{selectedNote.lesson_summary}</Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Homework Assigned</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedNote.homework_assigned || 'No homework assigned'}
                                        </Text>
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Tutor Notes</Text>
                                        <Text style={styles.detailValue}>{selectedNote.tutor_notes}</Text>
                                    </View>

                                    {/* Images Section */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Images</Text>
                                        <View style={styles.attachmentsGrid}>
                                            {/* Show all attachments including the thumbnail */}
                                            {selectedNote.attachments && selectedNote.attachments.map((attachment, index) => (
                                                <TouchableOpacity
                                                    key={attachment.id || index}
                                                    onPress={() => handleImagePress(attachment.url)}
                                                    style={styles.attachmentImage}
                                                >
                                                    <Image
                                                        source={{ uri: attachment.url }}
                                                        style={styles.attachmentImage}
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                            {/* Show thumbnail if it exists and isn't already in attachments */}
                                            {selectedNote.file_url &&
                                                (!selectedNote.attachments ||
                                                    !selectedNote.attachments.some(a => a.url === selectedNote.file_url)) && (
                                                    <TouchableOpacity
                                                        onPress={() => handleImagePress(selectedNote.file_url!)}
                                                        style={styles.attachmentImage}
                                                    >
                                                        <Image
                                                            source={{ uri: selectedNote.file_url }}
                                                            style={styles.attachmentImage}
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                        </View>
                                    </View>

                                    <View style={styles.detailActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.editButton]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleEditSessionNote(selectedNote);
                                            }}
                                        >
                                            <Text style={styles.editButtonText}>Edit Note</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.deleteButton]}
                                            onPress={() => {
                                                setDetailModalVisible(false);
                                                handleDeleteSessionNote(selectedNote.id);
                                            }}
                                        >
                                            <Text style={styles.deleteButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </Modal>
            </Portal>

            {/* MODAL FOR ADDING/EDITING SESSION NOTE */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => {
                        setModalVisible(false);
                        resetForm();
                    }}
                    contentContainerStyle={[styles.modalContent, { padding: 0 }]}
                >
                    <View style={styles.modalContainer}>
                        {/* Pink Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                                style={styles.backButton}
                            >
                                <IconButton icon="chevron-left" size={24} />
                            </TouchableOpacity>
                            <Text style={styles.modalHeaderTitle}>
                                {selectedClass ?
                                    `New ${availableClasses.find(c => c.id === selectedClass)?.name || ''} Note` :
                                    'New Session Note'
                                }
                            </Text>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Session Date */}
                            <View style={[styles.formField, { zIndex: 10000, position: 'relative' }]}>
                                <Text style={styles.inputHeader}>Session Date</Text>
                                <View style={styles.datePickerContainer}>
                                    <DatePicker
                                        selected={sessionDate}
                                        onChange={(date: Date | null) => {
                                            if (date) {
                                                setSessionDate(date);
                                            }
                                        }}
                                        dateFormat="d MMMM yyyy"
                                        className="date-picker-input"
                                        popperClassName="date-picker-popper"
                                        customInput={
                                            <TextInput
                                                mode="flat"
                                                value={format(sessionDate || new Date(), "d MMMM yyyy")}
                                                style={styles.datePickerInput}
                                                right={
                                                    <TextInput.Icon
                                                        icon="calendar"
                                                        onPress={() => {
                                                            const input = document.querySelector('.date-picker-input') as HTMLElement;
                                                            if (input) input.click();
                                                        }}
                                                    />
                                                }
                                            />
                                        }
                                    />
                                </View>
                            </View>

                            {/* Class Selection */}
                            <View style={[styles.formField, { zIndex: 2000 }]}>
                                <Text style={styles.inputHeader}>Class</Text>
                                <TextInput
                                    placeholder="Search for a class..."
                                    value={classSearchQuery}
                                    onChangeText={(text) => {
                                        setClassSearchQuery(text);
                                        setShowClassDropdown(true);
                                        setFilteredClasses(
                                            availableClasses.filter(c =>
                                                c.name.toLowerCase().includes(text.toLowerCase()) ||
                                                c.subject.toLowerCase().includes(text.toLowerCase())
                                            )
                                        );
                                    }}
                                    mode="outlined"
                                    theme={theme}
                                    right={classSearchQuery ?
                                        <TextInput.Icon
                                            icon="close"
                                            onPress={() => {
                                                setClassSearchQuery('');
                                                setSelectedClass(null);
                                                setShowClassDropdown(false);
                                            }}
                                        /> : null
                                    }
                                />
                                {showClassDropdown && (
                                    <View style={styles.searchResults}>
                                        <ScrollView>
                                            {filteredClasses.length > 0 ? filteredClasses.map(classItem => (
                                                <TouchableOpacity
                                                    key={classItem.id}
                                                    style={styles.searchResultItem}
                                                    onPress={() => {
                                                        setSelectedClass(classItem.id);
                                                        setClassSearchQuery(`${classItem.name} (${classItem.subject})`);
                                                        setShowClassDropdown(false);
                                                    }}
                                                >
                                                    <Text>{classItem.name} ({classItem.subject})</Text>
                                                </TouchableOpacity>
                                            )) : (
                                                <View style={styles.searchResultItem}>
                                                    <Text>No classes found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Topics Covered */}
                            <View style={[styles.formField, { zIndex: 1999 }]}>
                                <Text style={styles.inputHeader}>Topics Covered</Text>
                                <TextInput
                                    placeholder="Search for a topic..."
                                    value={topicSearchQuery}
                                    onChangeText={(text) => {
                                        setTopicSearchQuery(text);
                                        setShowTopicDropdown(true);
                                        setFilteredTopics(
                                            availableTopics.filter(t =>
                                                t.class_id === selectedClass &&
                                                t.name.toLowerCase().includes(text.toLowerCase())
                                            )
                                        );
                                    }}
                                    mode="outlined"
                                    theme={theme}
                                    right={topicSearchQuery ?
                                        <TextInput.Icon
                                            icon="close"
                                            onPress={() => {
                                                setTopicSearchQuery('');
                                                setSelectedTopic(null);
                                                setShowTopicDropdown(false);
                                            }}
                                        /> : null
                                    }
                                />
                                {showTopicDropdown && (
                                    <View style={styles.searchResults}>
                                        <ScrollView>
                                            {filteredTopics.length > 0 ? filteredTopics.map(topic => (
                                                <TouchableOpacity
                                                    key={topic.id}
                                                    style={styles.searchResultItem}
                                                    onPress={() => {
                                                        setSelectedTopic(topic.id);
                                                        setTopicSearchQuery(topic.name);
                                                        setShowTopicDropdown(false);
                                                    }}
                                                >
                                                    <Text>{topic.name}</Text>
                                                </TouchableOpacity>
                                            )) : (
                                                <View style={styles.searchResultItem}>
                                                    <Text>{selectedClass ? 'No topics found' : 'Please select a class first'}</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Lesson Summary */}
                            <View style={[styles.formField, { zIndex: 1 }]}>
                                <Text style={styles.inputHeader}>Lesson Summary</Text>
                                <TextInput
                                    placeholder="Enter the lesson summary..."
                                    style={[styles.inputField, { height: 100 }]}
                                    value={lessonSummary}
                                    onChangeText={setLessonSummary}
                                    multiline={true}
                                    numberOfLines={4}
                                />
                            </View>

                            {/* Homework Assigned */}
                            <View style={[styles.formField, { zIndex: 1 }]}>
                                <Text style={styles.inputHeader}>Homework Assigned (Optional)</Text>
                                <TextInput
                                    placeholder="Enter homework details..."
                                    style={[styles.inputField, { height: 80 }]}
                                    value={homeworkAssigned}
                                    onChangeText={setHomeworkAssigned}
                                    multiline={true}
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Engagement Level Slider */}
                            <View style={styles.formField}>
                                <Text style={styles.inputHeader}>Engagement Level</Text>
                                <View style={styles.sliderContainer}>
                                    <LinearGradient
                                        colors={['#FF4B4B', '#FFB700', '#4CAF50']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.sliderTrack, { position: 'absolute', width: '100%' }]}
                                    />
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={1}
                                        maximumValue={5}
                                        step={1}
                                        value={engagementLevelToNumber(engagementLevel)}
                                        onValueChange={(value: number) => setEngagementLevel(numberToEngagementLevel(value))}
                                        minimumTrackTintColor="transparent"
                                        maximumTrackTintColor="transparent"
                                        thumbTintColor="#2196F3"
                                    />
                                </View>
                                <View style={styles.sliderLabels}>
                                    <Text style={[styles.sliderLabel, styles.sliderLabelStart]}>Unattentive</Text>
                                    <Text style={styles.sliderLabel}>Neutral</Text>
                                    <Text style={[styles.sliderLabel, styles.sliderLabelEnd]}>Highly Engaged</Text>
                                </View>
                            </View>

                            {/* Understanding Level */}
                            <View style={styles.formField}>
                                <Text style={styles.inputHeader}>Understanding Level</Text>
                                <View style={styles.sliderContainer}>
                                    <LinearGradient
                                        colors={['#FF4B4B', '#FFB700', '#4CAF50']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.sliderTrack, { position: 'absolute', width: '100%' }]}
                                    />
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={0}
                                        maximumValue={4}
                                        step={1}
                                        value={
                                            understandingLevel === 'Poor' ? 0 :
                                                understandingLevel === 'Needs Improvement' ? 1 :
                                                    understandingLevel === 'Fair' ? 2 :
                                                        understandingLevel === 'Good' ? 3 : 4
                                        }
                                        onValueChange={(value: number) => {
                                            setUnderstandingLevel(
                                                value === 0 ? 'Poor' :
                                                    value === 1 ? 'Needs Improvement' :
                                                        value === 2 ? 'Fair' :
                                                            value === 3 ? 'Good' : 'Excellent'
                                            );
                                        }}
                                        minimumTrackTintColor="transparent"
                                        maximumTrackTintColor="transparent"
                                        thumbTintColor="#2196F3"
                                    />
                                </View>
                                <View style={styles.sliderLabels}>
                                    <Text style={[styles.sliderLabel, styles.sliderLabelStart]}>Poor</Text>
                                    <Text style={styles.sliderLabel}>Fair</Text>
                                    <Text style={[styles.sliderLabel, styles.sliderLabelEnd]}>Excellent</Text>
                                </View>
                            </View>

                            {/* Image Upload */}
                            <View style={styles.formField}>
                                <Text style={styles.inputHeader}>Upload Images (Optional)</Text>
                                <View style={styles.imagesGrid}>
                                    {selectedImages.map((image, index) => (
                                        <View key={index} style={styles.imageContainer}>
                                            <Image
                                                source={{ uri: image }}
                                                style={styles.uploadedImage}
                                            />
                                            <TouchableOpacity
                                                style={styles.removeImageButton}
                                                onPress={() => handleRemoveImage(index)}
                                            >
                                                <IconButton
                                                    icon="close"
                                                    size={20}
                                                    iconColor="white"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {selectedImages.length < 5 && (
                                        <TouchableOpacity
                                            style={styles.imageUploadContainer}
                                            onPress={handleImagePick}
                                        >
                                            <IconButton icon="image-plus" size={24} />
                                            <Text>Add Image</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Tutor Notes */}
                            <View style={styles.formField}>
                                <Text style={styles.inputHeader}>Tutor Notes</Text>
                                <TextInput
                                    placeholder="Enter your notes about the session..."
                                    style={[styles.inputField, { height: 120 }]}
                                    value={tutorNotes}
                                    onChangeText={setTutorNotes}
                                    multiline={true}
                                    numberOfLines={4}
                                />
                            </View>

                            {/* Publish Note Button */}
                            <Button
                                mode="contained"
                                onPress={handleAddOrUpdateSessionNote}
                                style={styles.publishButton}
                                labelStyle={styles.publishButtonLabel}
                            >
                                Publish Note
                            </Button>
                        </ScrollView>
                    </View>
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

            {/* Add ImageModal at the end of the component, before the closing PaperProvider tag */}
            <ImageModal
                visible={imageModalVisible}
                imageUrl={selectedImage || ''}
                onClose={() => {
                    setImageModalVisible(false);
                    setSelectedImage(null);
                }}
            />
        </PaperProvider>
    );
}