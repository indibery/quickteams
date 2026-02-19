import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import type { StudentInput, Gender, Student } from "@/lib/types";
import PickerSelect from "@/components/common/PickerSelect";

type Props = {
  initial?: Student;
  defaultGrade?: number;
  defaultClass?: number;
  onSubmit: (input: StudentInput) => void;
  onCancel: () => void;
};

const gradeOptions = Array.from({ length: 6 }, (_, i) => ({
  label: `${i + 1}학년`,
  value: i + 1,
}));

const classOptions = Array.from({ length: 20 }, (_, i) => ({
  label: `${i + 1}반`,
  value: i + 1,
}));

export default function StudentForm({ initial, defaultGrade = 1, defaultClass = 1, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [grade, setGrade] = useState(initial?.grade ?? defaultGrade);
  const [classNum, setClassNum] = useState(initial?.class ?? defaultClass);
  const [studentNumber, setStudentNumber] = useState(
    initial?.studentNumber?.toString() ?? ""
  );
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "M");
  const [runningRecord, setRunningRecord] = useState(
    initial?.runningRecord ?? ""
  );
  const [adjustment, setAdjustment] = useState(initial?.adjustment ?? 0);

  const handleSubmit = () => {
    if (!name.trim() || !studentNumber.trim()) return;

    onSubmit({
      name: name.trim(),
      grade,
      class: classNum,
      studentNumber: parseInt(studentNumber, 10),
      gender,
      runningRecord: runningRecord.trim() || null,
      adjustment,
    });
  };

  const isValid = name.trim() !== "" && studentNumber.trim() !== "";

  return (
    <ScrollView className="flex-1 bg-white p-6">
      {/* 이름 */}
      <Text className="text-sm text-gray-500 mb-1">이름 *</Text>
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 text-tablet-sm mb-4"
        placeholder="학생 이름"
        value={name}
        onChangeText={setName}
      />

      {/* 학년/반 */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <PickerSelect
            label="학년 *"
            value={grade}
            options={gradeOptions}
            onSelect={(v) => setGrade(v as number)}
          />
        </View>
        <View className="flex-1">
          <PickerSelect
            label="반 *"
            value={classNum}
            options={classOptions}
            onSelect={(v) => setClassNum(v as number)}
          />
        </View>
      </View>

      {/* 번호 */}
      <Text className="text-sm text-gray-500 mb-1">번호 *</Text>
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 text-tablet-sm mb-4"
        placeholder="출석 번호"
        value={studentNumber}
        onChangeText={setStudentNumber}
        keyboardType="number-pad"
      />

      {/* 성별 */}
      <Text className="text-sm text-gray-500 mb-1">성별 *</Text>
      <View className="flex-row gap-3 mb-4">
        <Pressable
          className={`flex-1 py-3 rounded-xl items-center ${
            gender === "M" ? "bg-primary" : "bg-gray-200"
          }`}
          onPress={() => setGender("M")}
        >
          <Text
            className={`text-tablet-sm font-bold ${
              gender === "M" ? "text-white" : "text-gray-600"
            }`}
          >
            남
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 rounded-xl items-center ${
            gender === "F" ? "bg-sunny-dark" : "bg-gray-200"
          }`}
          onPress={() => setGender("F")}
        >
          <Text
            className={`text-tablet-sm font-bold ${
              gender === "F" ? "text-white" : "text-gray-600"
            }`}
          >
            여
          </Text>
        </Pressable>
      </View>

      {/* 구분선 */}
      <View className="border-t border-gray-200 my-4" />

      {/* 달리기 기록 */}
      <Text className="text-sm text-gray-500 mb-1">달리기 기록 (초)</Text>
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 text-tablet-sm mb-4"
        placeholder="예: 12.15"
        value={runningRecord}
        onChangeText={setRunningRecord}
        keyboardType="decimal-pad"
      />

      {/* 능력 보정 */}
      <Text className="text-sm text-gray-500 mb-1">
        능력 보정 ({adjustment > 0 ? `+${adjustment}` : adjustment})
      </Text>
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable
          className="w-12 h-12 rounded-xl bg-gray-200 items-center justify-center active:bg-gray-300"
          onPress={() => setAdjustment((v) => Math.max(-5, v - 1))}
        >
          <Text className="text-xl font-bold text-gray-600">−</Text>
        </Pressable>
        <View className="flex-1 bg-gray-100 rounded-xl py-3 items-center">
          <Text className="text-tablet-sm font-bold text-secondary">
            {adjustment === 0
              ? "보정 없음"
              : adjustment > 0
                ? `+${adjustment} (상향)`
                : `${adjustment} (하향)`}
          </Text>
        </View>
        <Pressable
          className="w-12 h-12 rounded-xl bg-gray-200 items-center justify-center active:bg-gray-300"
          onPress={() => setAdjustment((v) => Math.min(5, v + 1))}
        >
          <Text className="text-xl font-bold text-gray-600">+</Text>
        </Pressable>
      </View>

      {/* 버튼 */}
      <View className="flex-row gap-3 mt-6 mb-10">
        <Pressable
          className="flex-1 py-4 rounded-xl bg-gray-200 items-center"
          onPress={onCancel}
        >
          <Text className="text-tablet-sm font-bold text-gray-600">취소</Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-4 rounded-xl items-center ${
            isValid ? "bg-primary" : "bg-gray-300"
          }`}
          onPress={handleSubmit}
          disabled={!isValid}
        >
          <Text className="text-tablet-sm font-bold text-white">
            {initial ? "수정" : "추가"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
