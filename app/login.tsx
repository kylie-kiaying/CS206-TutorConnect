import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Switch } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { Provider as PaperProvider, Appbar, Button as PaperButton, TextInput as PaperTextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tutor"); // Default role for UI display
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
      await AsyncStorage.setItem("tutorId", tutorData.id);
      
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
      await AsyncStorage.setItem("parentId", parentData.id);
      
      // Navigate to parent dashboard
      router.push("/parent/dashboard");
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