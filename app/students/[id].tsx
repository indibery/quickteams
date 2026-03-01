import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import * as repo from "@/lib/db/repositories/studentRepository";
import type { Student } from "@/lib/types";
import { Colors } from "@/constants/theme";

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
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: Colors.bg }}>
        <Text className="text-tablet-sm" style={{ color: Colors.text2 }}>로딩 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.bg }} edges={["bottom"]}>
      <View className="m-6 rounded-2xl p-6" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
        <View className="flex-row items-center mb-4">
          <View
            className="w-14 h-14 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: student.gender === "M" ? Colors.male : Colors.female }}
          >
            <Text className="text-2xl">
              {student.gender === "M" ? "♂" : "♀"}
            </Text>
          </View>
          <View>
            <Text className="text-tablet-lg font-bold" style={{ color: Colors.text1 }}>
              {student.name}
            </Text>
            <Text className="text-tablet-sm" style={{ color: Colors.text2 }}>
              {student.grade}학년 {student.class}반 {student.studentNumber}번
            </Text>
          </View>
        </View>

        <View className="pt-4" style={{ borderTopWidth: 1, borderTopColor: Colors.border }}>
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
          className="bg-primary rounded-xl py-4 items-center active:scale-[0.97]"
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
      <Text className="text-tablet-sm" style={{ color: Colors.text2 }}>{label}</Text>
      <Text
        className="text-tablet-sm font-bold"
        style={{ color: highlight ? Colors.primary : Colors.text1 }}
      >
        {value}
      </Text>
    </View>
  );
}
