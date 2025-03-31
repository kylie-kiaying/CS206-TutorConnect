module.exports = {
  expo: {
    name: "tutortrack",
    slug: "tutortrack",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.anonymous.tutortrack"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#ffffff",
          sounds: ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    notification: {
      icon: "./assets/images/notification-icon.png",
      color: "#ffffff",
      androidMode: "default",
      androidCollapsedTitle: "New Notification"
    },
    extra: {
      eas: {
        projectId: "your-project-id" // You'll need to replace this with your actual project ID
      }
    }
  }
}; 