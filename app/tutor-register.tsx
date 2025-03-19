import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  Provider as PaperProvider,
  Button as PaperButton,
  TextInput as PaperTextInput,
} from "react-native-paper";
import { supabase } from "../lib/supabase";

export default function TutorRegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    // Register the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      alert(authError.message);
      return;
    }
    
    if (!authData.user) {
      alert("Registration failed. Please try again.");
      return;
    }
    
    const userId = authData.user.id;
    
    // Create a record in the tutors table
    const { error: tutorError } = await supabase
      .from("tutors")
      .insert([{ user_id: userId, email }]);
      
    if (tutorError) {
      alert(`Error creating tutor profile: ${tutorError.message}`);
      return;
    }
    
    alert("Registration successful!");
    router.push("/login");
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
        />
        <Text style={styles.title}>Tutor Registration</Text>
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
        <PaperButton
          mode="contained"
          onPress={handleRegister}
          style={styles.registerButton}
        >
          Register
        </PaperButton>
        <PaperButton
          mode="outlined"
          onPress={() => router.push("/login")}
          style={styles.backButton}
        >
          Back to Login
        </PaperButton>
        
        {/* Parent link */}
        <View style={styles.parentLinkContainer}>
          <Text style={styles.parentLinkText}>Are you a parent? </Text>
          <PaperButton 
            mode="text" 
            onPress={() => router.push("/register")}
            style={styles.parentButton}
            labelStyle={styles.parentButtonLabel}
          >
            Register here
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
    backgroundColor: "#f5f5f5",
  },
  icon: {
    width: "100%",
    height: 150,
    alignSelf: "center",
    marginBottom: 20,
    resizeMode: "contain",
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
  registerButton: {
    marginBottom: 20,
  },
  backButton: {
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