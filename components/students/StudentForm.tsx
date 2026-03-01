import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import type { StudentInput, Gender, Student } from "@/lib/types";
import PickerSelect from "@/components/common/PickerSelect";
import { Colors } from "@/constants/theme";

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
    <ScrollView className="flex-1 p-6" style={{ backgroundColor: Colors.bg }}>
      {/* 이름 */}
      <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>이름 *</Text>
      <TextInput
        className="rounded-xl px-4 py-3 text-tablet-sm mb-4"
        style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text1 }}
        placeholder="학생 이름"
        placeholderTextColor={Colors.placeholder}
        keyboardAppearance="dark"
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
      <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>번호 *</Text>
      <TextInput
        className="rounded-xl px-4 py-3 text-tablet-sm mb-4"
        style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text1 }}
        placeholder="출석 번호"
        placeholderTextColor={Colors.placeholder}
        keyboardAppearance="dark"
        value={studentNumber}
        onChangeText={setStudentNumber}
        keyboardType="number-pad"
      />

      {/* 성별 */}
      <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>성별 *</Text>
      <View className="flex-row gap-3 mb-4">
        <Pressable
          className={`flex-1 py-3 rounded-xl items-center ${
            gender === "M" ? "bg-primary" : ""
          }`}
          style={gender !== "M" ? { backgroundColor: Colors.pillBg } : undefined}
          onPress={() => setGender("M")}
        >
          <Text
            className="text-tablet-sm font-bold"
            style={{ color: gender === "M" ? "#fff" : Colors.pillText }}
          >
            남
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 rounded-xl items-center ${
            gender === "F" ? "bg-sunny-dark" : ""
          }`}
          style={gender !== "F" ? { backgroundColor: Colors.pillBg } : undefined}
          onPress={() => setGender("F")}
        >
          <Text
            className="text-tablet-sm font-bold"
            style={{ color: gender === "F" ? "#fff" : Colors.pillText }}
          >
            여
          </Text>
        </Pressable>
      </View>

      {/* 구분선 */}
      <View className="my-4" style={{ borderTopWidth: 1, borderTopColor: Colors.border }} />

      {/* 달리기 기록 */}
      <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>달리기 기록 (초)</Text>
      <TextInput
        className="rounded-xl px-4 py-3 text-tablet-sm mb-4"
        style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text1 }}
        placeholder="예: 12.15"
        placeholderTextColor={Colors.placeholder}
        keyboardAppearance="dark"
        value={runningRecord}
        onChangeText={setRunningRecord}
        keyboardType="decimal-pad"
      />

      {/* 능력 보정 */}
      <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>
        능력 보정 ({adjustment > 0 ? `+${adjustment}` : adjustment})
      </Text>
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable
          className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
          style={{ backgroundColor: Colors.surface }}
          onPress={() => setAdjustment((v) => Math.max(-5, v - 1))}
        >
          <Text className="text-xl font-bold" style={{ color: Colors.text2 }}>−</Text>
        </Pressable>
        <View className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: Colors.card }}>
          <Text className="text-tablet-sm font-bold" style={{ color: Colors.text1 }}>
            {adjustment === 0
              ? "보정 없음"
              : adjustment > 0
                ? `+${adjustment} (상향)`
                : `${adjustment} (하향)`}
          </Text>
        </View>
        <Pressable
          className="w-12 h-12 rounded-xl items-center justify-center active:opacity-80"
          style={{ backgroundColor: Colors.surface }}
          onPress={() => setAdjustment((v) => Math.min(5, v + 1))}
        >
          <Text className="text-xl font-bold" style={{ color: Colors.text2 }}>+</Text>
        </Pressable>
      </View>

      {/* 버튼 */}
      <View className="flex-row gap-3 mt-6 mb-10">
        <Pressable
          className="flex-1 py-4 rounded-xl items-center active:opacity-80"
          style={{ backgroundColor: Colors.surface }}
          onPress={onCancel}
        >
          <Text className="text-tablet-sm font-bold" style={{ color: Colors.text2 }}>취소</Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-4 rounded-xl items-center ${
            isValid ? "bg-primary active:scale-[0.97]" : ""
          }`}
          style={!isValid ? { backgroundColor: Colors.pillBg } : undefined}
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
