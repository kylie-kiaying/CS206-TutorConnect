import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { Provider as PaperProvider, Button as PaperButton, TextInput as PaperTextInput } from 'react-native-paper';
import storage from '../lib/storage';

export default function TutorLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      alert(authError.message);
      return;
    }
    
    if (!authData.user) {
      alert("Login failed. Please check your credentials.");
      return;
    }
    
    const userId = authData.user.id;
    
    // Check if user exists in tutors table
    const { data: tutorData, error: tutorError } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (tutorError) {
      alert("Could not verify tutor account. Please try again or register as a tutor.");
      return;
    }
    
    // Store tutor ID in AsyncStorage for use in other parts of the app
    await storage.setItem("tutorId", tutorData.id);
    
    // Navigate to tutor dashboard
    router.push("/tutor/dashboard");
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Image source={require('../assets/images/icon.png')} style={styles.icon} />
        <Text style={styles.title}>Tutor Login</Text>
        <PaperTextInput
          style={styles.input}
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
        />
        <PaperTextInput
          style={styles.input}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
        />
        <PaperButton mode="contained" onPress={handleLogin} style={styles.loginButton}>
          Login
        </PaperButton>
        <PaperButton 
          mode="outlined" 
          onPress={() => router.push("/tutor-register")} 
          style={styles.registerButton}
        >
          Register
        </PaperButton>
        
        {/* Parent link */}
        <View style={styles.parentLinkContainer}>
          <Text style={styles.parentLinkText}>Are you a parent? </Text>
          <PaperButton 
            mode="text" 
            onPress={() => router.push("/login")}
            style={styles.parentButton}
            labelStyle={styles.parentButtonLabel}
          >
            Login here
          </PaperButton>
        </View>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  icon: {
    width: '100%',
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    height: 50,
    marginBottom: 15,
    borderRadius: 10,
  },
  loginButton: {
    marginBottom: 20,
  },
  registerButton: {
    marginBottom: 20,
  },
  parentLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  parentLinkText: {
    fontSize: 14,
  },
  parentButton: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  parentButtonLabel: {
    fontSize: 14,
    marginHorizontal: 0,
  }
}); 