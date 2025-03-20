import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, useColorScheme } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Appbar, 
  Modal, 
  TextInput, 
  IconButton, 
  Menu, 
  Divider, 
  List,
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import storage from '../../../lib/storage';
import { addStudent, Student as LibStudent } from '../../../lib/students';

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

// Extend the Student interface to include all required fields 
interface Student extends LibStudent {
  created_at: string;
}

interface ClassStudent {
  student: Student;
}

interface Topic {
  id: string;
  class_id: string;
  name: string;
  description: string;
  content: string;
  order_index: number;
}

interface Class {
  id: string;
  name: string;
  subject: string;
  description: string;
  tutor_id: string;
}

export default function ClassView() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? customDarkTheme : customLightTheme;
  
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [addTopicModalVisible, setAddTopicModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [studentName, setStudentName] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicContent, setTopicContent] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingExistingStudent, setAddingExistingStudent] = useState(false);
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchClassData();
  }, [id]);

  const fetchClassData = async () => {
    try {
      // Fetch class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (classError) throw classError;
      setClassData(classData);

      // Fetch students in this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('class_students')
        .select('student:students(*)')
        .eq('class_id', id);

      if (studentsError) throw studentsError;
      
      // Type assertion and validation
      const validStudentsData = studentsData as unknown as ClassStudent[];
      const validStudents = validStudentsData
        .filter((item): item is ClassStudent => 
          item.student && 
          typeof item.student.id === 'string' &&
          typeof item.student.name === 'string' &&
          typeof item.student.created_at === 'string'
        )
        .map(item => item.student);
      
      setStudents(validStudents);

      // Fetch topics for this class directly using class_id
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('class_id', id)
        .order('order_index');

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);
    } catch (error) {
      console.error('Error fetching class data:', error);
      Alert.alert('Error', 'Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async () => {
    console.log('handleAddTopic called');
    console.log('topicName:', topicName);
    console.log('classData:', classData);
    
    if (!topicName.trim() || !classData) {
      console.log('Validation failed: Missing topic name or class data');
      Alert.alert('Error', 'Topic name is required');
      return;
    }

    try {
      const newTopic = {
        class_id: id,
        name: topicName.trim(),
        description: topicDescription.trim(),
        content: topicContent.trim(),
        order_index: topics.length,
      };
      
      console.log('Attempting to insert new topic:', newTopic);

      const { data, error } = await supabase
        .from('topics')
        .insert([newTopic])
        .select()
        .single();

      if (error) throw error;

      console.log('Topic added successfully:', data);
      setTopics([...topics, data]);
      setAddTopicModalVisible(false);
      resetTopicForm();
    } catch (error) {
      console.error('Error adding topic:', error);
      Alert.alert('Error', 'Failed to add topic');
    }
  };

  const handleEditTopic = async () => {
    if (!editingTopic || !topicName.trim()) return;

    try {
      const updatedTopic = {
        name: topicName.trim(),
        description: topicDescription.trim(),
        content: topicContent.trim(),
      };

      const { data, error } = await supabase
        .from('topics')
        .update(updatedTopic)
        .eq('id', editingTopic.id)
        .select()
        .single();

      if (error) throw error;

      setTopics(topics.map(t => t.id === editingTopic.id ? data : t));
      setAddTopicModalVisible(false);
      resetTopicForm();
    } catch (error) {
      console.error('Error updating topic:', error);
      Alert.alert('Error', 'Failed to update topic');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      setTopics(topics.filter(topic => topic.id !== topicId));
      setMenuVisible(null);
    } catch (error) {
      console.error('Error deleting topic:', error);
      Alert.alert('Error', 'Failed to delete topic');
    }
  };

  const handleReorderTopics = async ({ data }: { data: Topic[] }) => {
    try {
      // Update local state first
      setTopics(data);

      // Create batch update promises
      const updates = data.map((topic, index) =>
        supabase
          .from('topics')
          .update({ order_index: index })
          .eq('id', topic.id)
      );

      // Execute all updates
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering topics:', error);
      Alert.alert('Error', 'Failed to reorder topics');
    }
  };

  const resetTopicForm = () => {
    setTopicName('');
    setTopicDescription('');
    setTopicContent('');
    setEditingTopic(null);
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;

    try {
      setAddingStudent(true);
      
      // Get the tutor ID from storage (this is the one used in the dashboard)
      const tutorId = await storage.getItem("tutorId");
      
      if (!tutorId) {
        Alert.alert("Error", "Could not find tutor ID. Please log in again.");
        return;
      }
      
      // Use the addStudent function which generates a student code
      const newStudent = await addStudent(
        {
          name: newStudentName.trim(),
          tutor_id: tutorId,
        }, 
        [] // Empty array since we don't use sessions anymore
      );

      if (!newStudent) {
        throw new Error("Failed to create student");
      }

      // Now link the student to the class
      const { error: linkError } = await supabase
        .from('class_students')
        .insert([
          {
            class_id: id,
            student_id: newStudent.id,
          },
        ]);

      if (linkError) throw linkError;

      // Get the full student data including created_at
      const { data: fullStudentData, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', newStudent.id)
        .single();
        
      if (fetchError) {
        console.error('Error fetching complete student data:', fetchError);
        // Still continue with what we have
      }

      // Update the UI with the complete student data
      const studentToAdd: Student = fullStudentData || {
        ...newStudent,
        created_at: new Date().toISOString() // Fallback if fetch fails
      };
      
      setStudents([...students, studentToAdd]);
      setNewStudentName('');
      setAddStudentModalVisible(false);
      resetStudentForm();
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert('Error', 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', id)
        .eq('student_id', studentId);

      if (error) throw error;

      // Refresh the student list
      fetchClassData();
      setMenuVisible(null);
    } catch (error) {
      console.error('Error removing student:', error);
      Alert.alert('Error', 'Failed to remove student');
    }
  };

  const handleViewNotes = (studentId: string) => {
    router.push(`/student/${studentId}`);
    setMenuVisible(null);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Topic>) => (
    <ScaleDecorator>
      <Card 
        style={[
          styles.topicCard,
          isActive && { backgroundColor: '#f0f0f0' }
        ]}
      >
        <Card.Content>
          <View style={styles.topicHeader}>
            <View style={styles.topicTitleContainer}>
              <IconButton
                icon="drag"
                onTouchStart={drag}
              />
              <View>
                <Text style={styles.topicName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.topicDescription}>{item.description}</Text>
                )}
              </View>
            </View>
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
                  setEditingTopic(item);
                  setTopicName(item.name);
                  setTopicDescription(item.description || '');
                  setTopicContent(item.content || '');
                  setAddTopicModalVisible(true);
                  setMenuVisible(null);
                }}
                title="Edit"
                leadingIcon="pencil"
              />
              <Menu.Item
                onPress={() => handleDeleteTopic(item.id)}
                title="Delete"
                leadingIcon="delete"
              />
            </Menu>
          </View>
          {item.content && (
            <Text style={styles.topicContent}>{item.content}</Text>
          )}
        </Card.Content>
      </Card>
    </ScaleDecorator>
  );

  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Get the tutor ID from storage
      const tutorId = await storage.getItem("tutorId");
      
      if (!tutorId) {
        Alert.alert("Error", "Could not find tutor ID. Please log in again.");
        return;
      }

      // Search for students by name that belong to this tutor
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('tutor_id', tutorId)
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      
      // Filter out students already in this class
      const existingStudentIds = students.map(s => s.id);
      const filteredResults = (data || []).filter(
        student => !existingStudentIds.includes(student.id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching students:', error);
      Alert.alert('Error', 'Failed to search for students');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddExistingStudent = async () => {
    if (!selectedExistingStudent) return;
    
    try {
      setAddingStudent(true);
      
      // Link the student to the class
      const { error } = await supabase
        .from('class_students')
        .insert([
          {
            class_id: id,
            student_id: selectedExistingStudent.id,
          },
        ]);

      if (error) throw error;

      // Update the UI
      setStudents([...students, selectedExistingStudent]);
      setAddStudentModalVisible(false);
      resetStudentForm();
    } catch (error) {
      console.error('Error adding existing student to class:', error);
      Alert.alert('Error', 'Failed to add student to class');
    } finally {
      setAddingStudent(false);
    }
  };

  const resetStudentForm = () => {
    setNewStudentName("");
    setSearchStudentQuery("");
    setSearchResults([]);
    setSelectedExistingStudent(null);
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

  return (
    <PaperProvider theme={theme}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={classData?.name || 'Class Details'} />
        </Appbar.Header>

        <ScrollView style={styles.content}>
          <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.subject, { color: theme.colors.primary }]}>{classData?.subject}</Text>
              {classData?.description && (
                <Text style={[styles.description, { color: theme.colors.text + 'cc' }]}>{classData.description}</Text>
              )}
              <Text style={[styles.studentCount, { backgroundColor: theme.colors.secondaryContainer }]}>
                {students.length} student{students.length === 1 ? '' : 's'}
              </Text>
            </Card.Content>
          </Card>

          {/* Topics Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Curriculum Topics</Text>
            <Button 
              mode="contained"
              onPress={() => {
                resetTopicForm();
                setAddTopicModalVisible(true);
              }}
            >
              Add Topic
            </Button>
          </View>

          <DraggableFlatList
            data={topics}
            onDragEnd={({ data }) => handleReorderTopics({ data })}
            keyExtractor={(item) => item.id}
            renderItem={({ item, drag, isActive }) => (
              <ScaleDecorator>
                <Card 
                  style={[
                    styles.topicCard,
                    { backgroundColor: theme.colors.surface },
                    isActive && { backgroundColor: theme.colors.surfaceVariant }
                  ]}
                >
                  <Card.Content>
                    <View style={styles.topicHeader}>
                      <View style={styles.topicTitleContainer}>
                        <IconButton icon="drag" onPress={drag} />
                        <View>
                          <Text style={[styles.topicName, { color: theme.colors.text }]}>{item.name}</Text>
                          {item.description && (
                            <Text style={[styles.topicDescription, { color: theme.colors.text + 'cc' }]}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                      </View>
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
                            setEditingTopic(item);
                            setTopicName(item.name);
                            setTopicDescription(item.description || '');
                            setTopicContent(item.content || '');
                            setAddTopicModalVisible(true);
                            setMenuVisible(null);
                          }}
                          title="Edit"
                          leadingIcon="pencil"
                        />
                        <Menu.Item
                          onPress={() => {
                            handleDeleteTopic(item.id);
                            setMenuVisible(null);
                          }}
                          title="Delete"
                          leadingIcon="delete"
                        />
                      </Menu>
                    </View>
                    {item.content && (
                      <Text style={[styles.topicContent, { color: theme.colors.text, borderTopColor: theme.colors.surfaceVariant }]}>
                        {item.content}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              </ScaleDecorator>
            )}
          />

          <Divider style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />

          {/* Students Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Students</Text>
            <Button 
              mode="contained"
              onPress={() => setAddStudentModalVisible(true)}
            >
              Add Student
            </Button>
          </View>

          {students.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                  No students in this class yet.
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.text + 'aa' }]}>
                  Add students to start managing their progress.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            students.map((student) => (
              <Card key={student.id} style={[styles.studentCard, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <View style={styles.studentHeader}>
                    <Text style={[styles.studentName, { color: theme.colors.text }]}>{student.name}</Text>
                    <Menu
                      visible={menuVisible === student.id}
                      onDismiss={() => setMenuVisible(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          onPress={() => setMenuVisible(student.id)}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => handleViewNotes(student.id)}
                        title="View Notes"
                        leadingIcon="notebook"
                      />
                      <Menu.Item
                        onPress={() => handleRemoveStudent(student.id)}
                        title="Remove from Class"
                        leadingIcon="account-remove"
                      />
                    </Menu>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Add/Edit Topic Modal */}
        <Modal
          visible={addTopicModalVisible}
          onDismiss={() => {
            setAddTopicModalVisible(false);
            resetTopicForm();
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editingTopic ? 'Edit Topic' : 'Add New Topic'}
          </Text>
          <TextInput
            label="Topic Name"
            value={topicName}
            onChangeText={setTopicName}
            style={styles.input}
            mode="outlined"
            theme={theme}
          />
          <TextInput
            label="Description"
            value={topicDescription}
            onChangeText={setTopicDescription}
            style={styles.input}
            multiline
            mode="outlined"
            theme={theme}
          />
          <TextInput
            label="Content"
            value={topicContent}
            onChangeText={setTopicContent}
            style={styles.input}
            multiline
            numberOfLines={4}
            mode="outlined"
            theme={theme}
          />
          <View style={styles.modalButtons}>
            <Button
              onPress={() => {
                setAddTopicModalVisible(false);
                resetTopicForm();
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                console.log('Add button pressed');
                if (editingTopic) {
                  handleEditTopic();
                } else {
                  handleAddTopic();
                }
              }}
              disabled={!topicName.trim()}
            >
              {editingTopic ? 'Save' : 'Add'}
            </Button>
          </View>
        </Modal>

        {/* Add Student Modal */}
        <Modal
          visible={addStudentModalVisible}
          onDismiss={() => {
            setAddStudentModalVisible(false);
            resetStudentForm();
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Student</Text>
          
          {/* Search existing students */}
          <TextInput
            style={styles.input}
            label="Search Existing Students"
            value={searchStudentQuery}
            onChangeText={(text) => {
              setSearchStudentQuery(text);
              searchStudents(text);
            }}
            mode="outlined"
            theme={theme}
            right={
              isSearching ? 
              <TextInput.Icon icon="loading" /> : 
              searchStudentQuery ? 
              <TextInput.Icon icon="close" onPress={() => {
                setSearchStudentQuery("");
                setSearchResults([]);
              }} /> : null
            }
          />
          
          {/* Search results */}
          {searchResults.length > 0 ? (
            <View style={styles.searchResultsContainer}>
              <Text style={[styles.searchResultsTitle, { color: theme.colors.text }]}>Search Results:</Text>
              <ScrollView style={styles.searchResultsList}>
                {searchResults.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.searchResultItem,
                      { borderBottomColor: theme.colors.surfaceVariant },
                      selectedExistingStudent?.id === student.id && 
                      { backgroundColor: theme.colors.secondaryContainer }
                    ]}
                    onPress={() => setSelectedExistingStudent(student)}
                  >
                    <Text style={[styles.searchResultName, { color: theme.colors.text }]}>{student.name}</Text>
                    {selectedExistingStudent?.id === student.id && (
                      <IconButton icon="check" size={16} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Button
                mode="contained"
                onPress={handleAddExistingStudent}
                disabled={!selectedExistingStudent}
                style={styles.addExistingButton}
              >
                Add Selected Student
              </Button>
            </View>
          ) : searchStudentQuery && !isSearching ? (
            <View style={styles.noResultsContainer}>
              <Text style={[styles.noResultsText, { color: theme.colors.text + '88' }]}>No matching students found</Text>
            </View>
          ) : null}
          
          <Divider style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />
          
          {/* Create new student */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Create New Student</Text>
          <TextInput
            label="Student Name"
            value={newStudentName}
            onChangeText={setNewStudentName}
            style={styles.input}
            mode="outlined"
            theme={theme}
          />
          
          <View style={styles.modalButtons}>
            <Button
              onPress={() => {
                setAddStudentModalVisible(false);
                resetStudentForm();
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleAddStudent}
              disabled={!newStudentName.trim() || addingStudent}
              loading={addingStudent}
            >
              Create
            </Button>
          </View>
        </Modal>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    marginBottom: 24,
  },
  subject: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e88e5',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  studentCount: {
    fontSize: 14,
    color: '#607d8b',
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 24,
  },
  emptyCard: {
    backgroundColor: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  studentCard: {
    marginBottom: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  topicCard: {
    marginBottom: 12,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topicTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  topicContent: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  searchResultsContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedSearchResult: {
    backgroundColor: "#e3f2fd",
  },
  searchResultName: {
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 12,
    alignItems: "center",
  },
  noResultsText: {
    color: "#666",
    fontStyle: "italic",
  },
  addExistingButton: {
    marginTop: 8,
  },
}); 