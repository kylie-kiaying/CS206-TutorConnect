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

  const toggleRole = () => {
    setRole((prevRole) => (prevRole === "tutor" ? "parent" : "tutor"));
  };

  return (
    <PaperProvider>
      <Appbar.Header>
        <Appbar.Content title="Register" />
      </Appbar.Header>
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