import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import { Provider as PaperProvider, Appbar, Button as PaperButton, TextInput as PaperTextInput } from 'react-native-paper';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tutor"); // Default role
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      if (role === "tutor") {
        router.push("/(tabs)");
      } else {
        router.push("/register");
      }
    }
  };

  return (
    <PaperProvider>
      <Appbar.Header>
        <Appbar.Content title="Login" />
      </Appbar.Header>
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
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
        <PaperButton mode="contained" onPress={handleLogin} style={styles.loginButton}>Login</PaperButton>
        <PaperButton mode="outlined" onPress={() => router.push("/register")} style={styles.registerButton}>Register</PaperButton>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  loginButton: {
    marginBottom: 20,
  },
  registerButton: {
    marginTop: 10,
  },
});