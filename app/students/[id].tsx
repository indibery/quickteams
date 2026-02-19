import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import * as repo from "@/lib/db/repositories/studentRepository";
import type { Student } from "@/lib/types";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (id) {
      repo.getStudentById(db, parseInt(id, 10)).then(setStudent);
    }
  }, [id]);

  if (!student) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-tablet-sm text-gray-400">로딩 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <View className="bg-white m-6 rounded-2xl p-6">
        <View className="flex-row items-center mb-4">
          <View
            className={`w-14 h-14 rounded-full items-center justify-center mr-4 ${
              student.gender === "M" ? "bg-sky" : "bg-sunny/30"
            }`}
          >
            <Text className="text-2xl">
              {student.gender === "M" ? "♂" : "♀"}
            </Text>
          </View>
          <View>
            <Text className="text-tablet-lg font-bold text-secondary">
              {student.name}
            </Text>
            <Text className="text-tablet-sm text-gray-500">
              {student.grade}학년 {student.class}반 {student.studentNumber}번
            </Text>
          </View>
        </View>

        <View className="border-t border-gray-100 pt-4">
          <InfoRow label="달리기 기록" value={student.runningRecord ? `${student.runningRecord}초` : "-"} />
          <InfoRow
            label="능력 보정"
            value={
              student.adjustment === 0
                ? "없음"
                : student.adjustment > 0
                  ? `+${student.adjustment}`
                  : `${student.adjustment}`
            }
          />
          <InfoRow
            label="능력 점수"
            value={
              student.abilityScore != null
                ? student.abilityScore.toFixed(1)
                : "-"
            }
            highlight
          />
        </View>
      </View>

      <View className="px-6">
        <Pressable
          className="bg-primary rounded-xl py-4 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-tablet-sm font-bold text-white">돌아가기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-tablet-sm text-gray-500">{label}</Text>
      <Text
        className={`text-tablet-sm font-bold ${
          highlight ? "text-primary" : "text-secondary"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
