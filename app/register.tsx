import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  Provider as PaperProvider,
  Appbar,
  Button as PaperButton,
  TextInput as PaperTextInput,
} from "react-native-paper";
import { supabase } from "../lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("parent");
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
    
    // Based on role, create a record in the appropriate table
    if (role === "tutor") {
      // Create a record in the tutors table
      const { error: tutorError } = await supabase
        .from("tutors")
        .insert([{ user_id: userId, email }]);
        
      if (tutorError) {
        alert(`Error creating tutor profile: ${tutorError.message}`);
        return;
      }
    } else if (role === "parent") {
      // Create a record in the parents table
      const { error: parentError } = await supabase
        .from("parents")
        .insert([{ user_id: userId, email }]);
        
      if (parentError) {
        alert(`Error creating parent profile: ${parentError.message}`);
        return;
      }
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
        <Text style={styles.title}>Parent Registration</Text>
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
        
        {/* New Tutor link */}
        <View style={styles.tutorLinkContainer}>
          <Text style={styles.tutorLinkText}>Are you a tutor? </Text>
          <PaperButton 
            mode="text" 
            onPress={() => router.push("/tutor-register")}
            style={styles.tutorButton}
            labelStyle={styles.tutorButtonLabel}
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