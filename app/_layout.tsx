import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { Provider as PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PaperProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="screens/LoginScreen" options={{ title: "Login" }} />
          <Stack.Screen name="screens/RegisterScreen" options={{ title: "Register" }} />
          <Stack.Screen name="screens/ParentScreen" options={{ title: "Parent Dashboard" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
