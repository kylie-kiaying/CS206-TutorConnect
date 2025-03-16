import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Switch } from "react-native";
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
  const [role, setRole] = useState("tutor"); // Default role
  const [studentCode, setStudentCode] = useState(""); // For parents
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
      if (studentCode.trim() === "") {
        alert("Please enter a student code.");
        return;
      }
      
      // Create a record in the parents table
      const { error: parentError } = await supabase
        .from("parents")
        .insert([{ user_id: userId, email }]);
        
      if (parentError) {
        alert(`Error creating parent profile: ${parentError.message}`);
        return;
      }
      
      // Find the student by code
      const { data: codeData, error: codeError } = await supabase
        .from("student_codes")
        .select("student_id")
        .eq("code", studentCode)
        .single();
        
      if (codeError || !codeData) {
        alert("Invalid student code. Please check and try again.");
        return;
      }
      
      // Get the parent_id we just created
      const { data: parentData, error: parentFetchError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", userId)
        .single();
        
      if (parentFetchError || !parentData) {
        alert("Error linking student to parent.");
        return;
      }
      
      // Create relationship in parent_students table
      const { error: relationError } = await supabase
        .from("parent_students")
        .insert([{ 
          parent_id: parentData.id, 
          student_id: codeData.student_id 
        }]);
        
      if (relationError) {
        alert(`Error linking student to parent: ${relationError.message}`);
        return;
      }
    }
    
    alert("Registration successful!");
    router.push("/login");
  };

  const toggleRole = () => {
    setRole((prevRole) => (prevRole === "tutor" ? "parent" : "tutor"));
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
        />
        <Text style={styles.title}>Register</Text>
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
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>I'm a Tutor</Text>
          <Switch
            value={role === "parent"}
            onValueChange={toggleRole}
            trackColor={{ false: "#81b0ff", true: "#81b0ff" }}
            thumbColor={role === "parent" ? "#f5dd4b" : "#f4f3f4"}
            style={styles.switch}
          />
          <Text style={styles.roleLabel}>I'm a Parent</Text>
        </View>
        {role === "parent" && (
          <PaperTextInput
            style={styles.input}
            label="Student Code"
            value={studentCode}
            onChangeText={setStudentCode}
            mode="outlined"
          />
        )}
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
  roleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  roleLabel: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  switch: {
    marginHorizontal: 20,
  },
  registerButton: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 20,
  },
});