import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Switch } from "react-native";
import { supabase } from "../lib/supabase";
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
      router.push(role === "tutor" ? "/(tabs)" : "/parent/dashboard");
    }
  };

  const toggleRole = () => {
    setRole((prevRole) => (prevRole === "tutor" ? "parent" : "tutor"));
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Image source={require('../assets/images/icon.png')} style={styles.icon} />
        <Text style={styles.title}>Login</Text>
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
          <Text style={styles.roleLabel}>Parent</Text>
        </View>
        <PaperButton mode="contained" onPress={handleLogin} style={styles.loginButton}>Login</PaperButton>
        <PaperButton mode="outlined" onPress={() => router.push("/register")}>Register</PaperButton>
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
    marginHorizontal: 5,
  },
  loginButton: {
    marginBottom: 20,
  },
});