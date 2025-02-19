import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

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
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <View style={styles.roleContainer}>
        <Button title="Tutor" onPress={() => setRole("tutor")} />
        <Button title="Parent" onPress={() => setRole("parent")} />
      </View>
      {role === "parent" && (
        <TextInput
          style={styles.input}
          placeholder="Student Code"
          value={studentCode}
          onChangeText={setStudentCode}
        />
      )}
      <Button title="Register" onPress={handleRegister} />
      <Button title="Back to Login" onPress={() => router.push("/login")} />
    </View>
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
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
});