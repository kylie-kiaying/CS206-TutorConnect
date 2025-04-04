import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton, Badge, Portal, Modal, List, Text, Button, Surface } from 'react-native-paper';
import { useNotifications } from '../contexts/NotificationsContext';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

export default function NotificationsBell() {
  const [visible, setVisible] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const router = useRouter();

  // Filter to only show unread notifications
  const unreadNotifications = notifications.filter(n => !n.is_read);
  
  // Find weekly reminders specifically
  const weeklyReminders = unreadNotifications.filter(n => n.type === 'weekly_reminder');

  const handleNotificationPress = async (notification: any) => {
    await markAsRead(notification.id);
    
    // Handle navigation based on notification type and recipient type
    if (notification.recipient_type === 'parent') {
      // For parents, always navigate to the parent dashboard
      router.push('/parent/dashboard');
    } else {
      // For tutors, handle different notification types
      switch (notification.type) {
        case 'session_note':
          // Navigate to the class details page
          router.push({
            pathname: '/tutor/classes/[id]',
            params: { id: notification.recipient_id }
          });
          break;
        case 'parent_feedback':
          // Navigate to the student's session notes page
          // The recipient_id in this case is the student_id
          router.push({
            pathname: '/student/[id]',
            params: { id: notification.recipient_id }
          });
          break;
        case 'weekly_reminder':
          // Navigate to the tutor dashboard
          router.push('/tutor/dashboard');
          break;
        default:
          // For any other notification type, go to dashboard
          router.push('/tutor/dashboard');
          break;
      }
    }
    
    setVisible(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session_note':
        return 'note-text';
      case 'parent_feedback':
        return 'message-text';
      case 'weekly_reminder':
        return 'calendar-clock';
      default:
        return 'bell';
    }
  };

  const handleAddSessionNotes = () => {
    // Navigate to the tutor dashboard
    router.push('/tutor/dashboard');
    setVisible(false);
  };

  return (
    <>
      <IconButton
        icon="bell"
        size={24}
        onPress={() => setVisible(true)}
        iconColor="#000"
      />
      {unreadCount > 0 && (
        <Badge
          size={20}
          style={styles.badge}
        >
          {unreadCount}
        </Badge>
      )}

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge">Notifications</Text>
            <Button onPress={() => setVisible(false)}>Close</Button>
          </View>
          
          {/* Weekly Reminders Banner */}
          {weeklyReminders.length > 0 && (
            <Surface style={styles.reminderBanner} elevation={2}>
              <Text style={styles.reminderTitle}>Weekly Session Notes Reminder</Text>
              <Text style={styles.reminderText}>
                Please add your session notes for this week to keep track of student progress.
              </Text>
              <Button 
                mode="contained" 
                onPress={handleAddSessionNotes}
                style={styles.reminderButton}
              >
                Add Session Notes
              </Button>
            </Surface>
          )}
          
          <List.Section>
            {unreadNotifications.length === 0 ? (
              <Text style={styles.emptyText}>No unread notifications</Text>
            ) : (
              unreadNotifications.map((notification) => (
                <List.Item
                  key={notification.id}
                  title={notification.message}
                  description={format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={getNotificationIcon(notification.type)}
                    />
                  )}
                  onPress={() => handleNotificationPress(notification)}
                  style={[
                    styles.notificationItem,
                    notification.type === 'weekly_reminder' && styles.reminderItem
                  ]}
                />
              ))
            )}
          </List.Section>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reminderItem: {
    backgroundColor: '#f0f8ff',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  reminderBanner: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1565c0',
  },
  reminderText: {
    marginBottom: 12,
    lineHeight: 20,
  },
  reminderButton: {
    alignSelf: 'flex-start',
  },
}); 