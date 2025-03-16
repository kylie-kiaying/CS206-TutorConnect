import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import storage from '../lib/storage';

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Not authenticated, redirect to login
      router.replace("/login");
      return;
    }
    
    const userId = session.user.id;
    
    // Check if user is a tutor
    const { data: tutorData, error: tutorError } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (!tutorError && tutorData) {
      // User is a tutor, store ID and redirect to tutor dashboard
      await storage.setItem("tutorId", tutorData.id);
      router.replace("/tutor/dashboard");
      return;
    }
    
    // Check if user is a parent
    const { data: parentData, error: parentError } = await supabase
      .from("parents")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    if (!parentError && parentData) {
      // User is a parent, store ID and redirect to parent dashboard
      await storage.setItem("parentId", parentData.id);
      router.replace("/parent/dashboard");
      return;
    }
    
    // Not identified as either tutor or parent, redirect to login
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0a7ea4" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    color: "#333",
  },
});