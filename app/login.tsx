import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { Provider as PaperProvider, Button as PaperButton, TextInput as PaperTextInput } from 'react-native-paper';
import storage from '../lib/storage';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("parent");
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
    
    if (role === "tutor") {
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
    } else {
      // Check if user exists in parents table
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      if (parentError) {
        alert("Could not verify parent account. Please try again or register as a parent.");
        return;
      }
      
      // Store parent ID in AsyncStorage
      await storage.setItem("parentId", parentData.id);
      
      // Navigate to parent dashboard
      router.push("/parent/dashboard");
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Image source={require('../assets/images/icon.png')} style={styles.icon} />
        <Text style={styles.title}>Parent Login</Text>
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
        <PaperButton mode="outlined" onPress={() => router.push("/register")} style={styles.registerButton}>
          Register
        </PaperButton>
        
        {/* Tutor link */}
        <View style={styles.tutorLinkContainer}>
          <Text style={styles.tutorLinkText}>Are you a tutor? </Text>
          <PaperButton 
            mode="text" 
            onPress={() => {
              setRole("tutor");
              router.push("/tutor-login");
            }}
            style={styles.tutorButton}
            labelStyle={styles.tutorButtonLabel}
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
  tutorLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  tutorLinkText: {
    fontSize: 14,
  },
  tutorButton: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  tutorButtonLabel: {
    fontSize: 14,
    marginHorizontal: 0,
  }
});