import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ParentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent Dashboard</Text>
      {/* Add components to display session notes and other relevant information */}
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
});