import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { Provider as PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PaperProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: "#0a7ea4",
            headerShown: false,
            tabBarStyle: {
              display: 'none',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
            }}
          />
          <Tabs.Screen
            name="login"
            options={{
              title: "Login",
            }}
          />
          <Tabs.Screen
            name="register"
            options={{
              title: "Register",
            }}
          />
          <Tabs.Screen
            name="parent/dashboard"
            options={{
              title: "Parent Dashboard",
            }}
          />
          <Tabs.Screen
            name="student/[id]"
            options={{
              title: "Student",
            }}
          />
        </Tabs>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}