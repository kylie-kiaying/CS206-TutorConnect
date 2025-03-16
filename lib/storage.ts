import { Platform } from 'react-native';

// Cross-platform storage utility that works on both web and mobile
const storage = {
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage on web
      localStorage.setItem(key, value);
      return;
    } else {
      // Use AsyncStorage on mobile
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.error('Error storing data', e);
      }
    }
  },
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage on web
      return localStorage.getItem(key);
    } else {
      // Use AsyncStorage on mobile
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.error('Error retrieving data', e);
        return null;
      }
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      // Use localStorage on web
      localStorage.removeItem(key);
      return;
    } else {
      // Use AsyncStorage on mobile
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error('Error removing data', e);
      }
    }
  }
};

export default storage; 