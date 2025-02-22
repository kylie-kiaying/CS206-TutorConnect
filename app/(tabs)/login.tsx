import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
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
      router.push(role === "tutor" ? "/(tabs)" : "/register");
    }
  };

  return (
    <PaperProvider>
      <Appbar.Header>
        <Appbar.Content title="Login" />
      </Appbar.Header>
      <View style={styles.container}>
        <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
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
          <PaperButton mode="contained" onPress={() => setRole("tutor")}>Tutor</PaperButton>
          <PaperButton mode="contained" onPress={() => setRole("parent")}>Parent</PaperButton>
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
    justifyContent: "space-around",
    marginBottom: 30,
  },
  loginButton: {
    marginBottom: 20,
  },
});