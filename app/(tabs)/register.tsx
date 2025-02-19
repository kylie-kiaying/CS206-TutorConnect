import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Provider as PaperProvider, Appbar, Button as PaperButton, TextInput as PaperTextInput } from 'react-native-paper';
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tutor"); // Default role
  const [studentCode, setStudentCode] = useState(""); // For parents
  const router = useRouter();

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      if (role === "parent" && studentCode.trim() === "") {
        alert("Please enter a student code.");
        return;
      }
      alert("Registration successful! Please check your email to confirm.");
      router.push("/login");
    }
  };

  return (
    <PaperProvider>
      <Appbar.Header>
        <Appbar.Content title="Register" />
      </Appbar.Header>
      <View style={styles.container}>
        <Text style={styles.title}>Register</Text>
        <PaperTextInput
          style={styles.input}
          label="Email"
          value={email}
          onChangeText={setEmail}
        />
        <PaperTextInput
          style={styles.input}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View style={styles.roleContainer}>
          <PaperButton mode="contained" onPress={() => setRole("tutor")}>Tutor</PaperButton>
          <PaperButton mode="contained" onPress={() => setRole("parent")}>Parent</PaperButton>
        </View>
        {role === "parent" && (
          <PaperTextInput
            style={styles.input}
            label="Student Code"
            value={studentCode}
            onChangeText={setStudentCode}
          />
        )}
        <PaperButton mode="contained" onPress={handleRegister} style={styles.registerButton}>Register</PaperButton>
        <PaperButton mode="outlined" onPress={() => router.push("/login")} style={styles.backButton}>Back to Login</PaperButton>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    marginBottom: 15,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  registerButton: {
    marginBottom: 20,
  },
  backButton: {
    marginTop: 10,
  },
});