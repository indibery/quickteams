import "../global.css";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { migrateDbIfNeeded } from "@/lib/db/database";
import { Colors } from "@/constants/theme";

function AppContent() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.headerBg },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontWeight: "bold", fontSize: 20, color: Colors.text1 },
            headerShadowVisible: false,
            headerBackTitle: '바로팀',
            contentStyle: { backgroundColor: Colors.bg },
          }}
        >
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="students/index"
            options={{ title: "학생 관리" }}
          />
          <Stack.Screen
            name="students/[id]"
            options={{ title: "학생 정보" }}
          />
          <Stack.Screen
            name="teams/new"
            options={{ title: "팀 관리" }}
          />
          <Stack.Screen
            name="teams/index"
            options={{ title: "경기 시작" }}
          />
          <Stack.Screen
            name="teams/[id]"
            options={{ title: "팀 명단" }}
          />
          <Stack.Screen
            name="game/scoreboard/[teamId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="records/index"
            options={{ title: "기록 보기" }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ title: "설정" }}
          />
        </Stack>
    </>
  );
}

export default function RootLayout() {
  const content = <AppContent />;

  if (Platform.OS === "web") {
    // expo-sqlite는 웹 미지원 → SQLiteProvider 없이 UI만 렌더링
    return <SafeAreaProvider>{content}</SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="quickteams.db" onInit={migrateDbIfNeeded}>
        {content}
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
