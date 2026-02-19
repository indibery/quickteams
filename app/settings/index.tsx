import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { File, Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import {
  getAllStudents,
  insertStudentsBatch,
  recalculateAbilityScores,
} from "@/lib/db/repositories/studentRepository";
import PickerSelect from "@/components/common/PickerSelect";
import type { Gender } from "@/lib/types";

const gradeOptions = Array.from({ length: 6 }, (_, i) => ({
  label: `${i + 1}학년`,
  value: i + 1,
}));
const classOptions = Array.from({ length: 20 }, (_, i) => ({
  label: `${i + 1}반`,
  value: i + 1,
}));

/** 한 줄 파싱: "번호,이름,성별,달리기기록(선택)" */
function parseLine(
  line: string
): {
  studentNumber: number;
  name: string;
  gender: Gender;
  runningRecord: string | null;
} | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const parts = trimmed.split(/[,\t]+/).map((s) => s.trim());
  if (parts.length < 3) return null;

  const studentNumber = parseInt(parts[0], 10);
  if (isNaN(studentNumber)) return null;

  const name = parts[1];
  if (!name) return null;

  const genderRaw = parts[2];
  let gender: Gender;
  if (genderRaw === "남" || genderRaw === "M" || genderRaw === "m") {
    gender = "M";
  } else if (genderRaw === "여" || genderRaw === "F" || genderRaw === "f") {
    gender = "F";
  } else {
    return null;
  }

  const runningRecord = parts[3] || null;

  return { studentNumber, name, gender, runningRecord };
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchGrade, setBatchGrade] = useState(1);
  const [batchClass, setBatchClass] = useState(1);
  const [batchText, setBatchText] = useState("");

  const handleExportCSV = async () => {
    const students = await getAllStudents(db);
    if (students.length === 0) {
      Alert.alert("내보내기", "내보낼 학생 데이터가 없습니다.");
      return;
    }

    const header = "이름,학년,반,번호,성별,달리기기록,능력 보정,능력점수\n";
    const rows = students
      .map(
        (s) =>
          `${s.name},${s.grade},${s.class},${s.studentNumber},${s.gender === "M" ? "남" : "여"},${s.runningRecord ?? ""},${s.adjustment},${s.abilityScore ?? ""}`
      )
      .join("\n");

    const csv = header + rows;
    const file = new File(Paths.cache, "quickteams_students.csv");
    file.write(csv);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "학생 데이터 내보내기",
      });
    } else {
      Alert.alert("내보내기", "공유 기능을 사용할 수 없습니다.");
    }
  };

  const handleResetData = () => {
    Alert.alert(
      "데이터 초기화",
      "모든 학생, 팀, 경기 기록이 삭제됩니다. 계속하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            await db.execAsync("DELETE FROM individual_records");
            await db.execAsync("DELETE FROM game_records");
            await db.execAsync("DELETE FROM team_members");
            await db.execAsync("DELETE FROM teams");
            await db.execAsync("DELETE FROM students");
            Alert.alert("완료", "모든 데이터가 초기화되었습니다.");
          },
        },
      ]
    );
  };

  const handleBatchImport = async () => {
    const lines = batchText.split("\n");
    const parsed = lines.map(parseLine).filter(Boolean) as NonNullable<
      ReturnType<typeof parseLine>
    >[];

    if (parsed.length === 0) {
      Alert.alert("오류", "유효한 학생 데이터가 없습니다.\n형식: 번호,이름,성별,달리기기록(초)");
      return;
    }

    try {
      const count = await insertStudentsBatch(db, batchGrade, batchClass, parsed);
      await recalculateAbilityScores(db, batchGrade, batchClass);
      Alert.alert(
        "입력 완료",
        `${batchGrade}학년 ${batchClass}반에 ${count}명이 추가되었습니다.`
      );
      setBatchText("");
      setShowBatchImport(false);
    } catch (e: any) {
      Alert.alert("오류", `입력 실패: ${e.message}`);
    }
  };

  // 미리보기: 유효한 줄 수 계산
  const previewCount = batchText
    .split("\n")
    .filter((line) => parseLine(line) != null).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 pt-4">
        {/* 학생 일괄 입력 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-tablet-sm font-bold text-secondary mb-3">
            학생 일괄 입력
          </Text>
          <Text className="text-xs text-gray-400 mb-3">
            여러 학생을 한번에 입력합니다. 테스트 데이터 준비에 유용합니다.
          </Text>
          <Pressable
            className="bg-sky rounded-xl py-3 px-4"
            onPress={() => setShowBatchImport(true)}
          >
            <Text className="text-tablet-sm text-primary font-bold">
              📋 일괄 입력 열기
            </Text>
          </Pressable>
        </View>

        {/* 앱 정보 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-tablet-md font-bold text-secondary mb-2">
            QuickTeams v2
          </Text>
          <Text className="text-sm text-gray-500">
            체육 팀짜기 · 태블릿 최적화
          </Text>
          <View className="border-t border-gray-100 mt-3 pt-3">
            <InfoRow label="Expo SDK" value="54" />
            <InfoRow label="React Native" value="0.81" />
            <InfoRow label="데이터 저장" value="로컬 SQLite (오프라인)" />
          </View>
        </View>

        {/* 능력 점수 공식 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-tablet-sm font-bold text-secondary mb-3">
            능력 점수 공식
          </Text>
          <InfoRow label="기본" value="달리기 상대 순위 (1~5)" />
          <InfoRow label="능력 보정" value="교사가 ±5 범위로 조정" />
          <InfoRow label="조정계수" value="능력 보정 1당 ±0.2" />
          <Text className="text-xs text-gray-400 mt-2">
            공식: 달리기점수 + 능력 보정 × 0.2 (결과 1.0~5.0)
          </Text>
        </View>

        {/* 데이터 관리 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <Text className="text-tablet-sm font-bold text-secondary mb-3">
            데이터 관리
          </Text>
          <Pressable
            className="bg-sky rounded-xl py-3 px-4 mb-3"
            onPress={handleExportCSV}
          >
            <Text className="text-tablet-sm text-primary font-bold">
              📤 학생 데이터 CSV 내보내기
            </Text>
          </Pressable>
          <Pressable
            className="bg-red-50 rounded-xl py-3 px-4"
            onPress={handleResetData}
          >
            <Text className="text-tablet-sm text-red-500 font-bold">
              🗑️ 전체 데이터 초기화
            </Text>
          </Pressable>
        </View>

        {/* 개인정보 */}
        <View className="bg-white rounded-2xl p-5 mb-8">
          <Text className="text-tablet-sm font-bold text-secondary mb-2">
            개인정보 보호
          </Text>
          <Text className="text-sm text-gray-500 leading-5">
            QuickTeams는 모든 데이터를 기기 내에만 저장합니다. 외부 서버로
            전송되는 데이터는 없으며, 인터넷 연결 없이 완전히 오프라인으로
            동작합니다.
          </Text>
        </View>
      </ScrollView>

      {/* 일괄 입력 모달 */}
      <Modal visible={showBatchImport} animationType="slide">
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          <View className="bg-primary px-6 py-4">
            <Text className="text-xl font-bold text-white">학생 일괄 입력</Text>
          </View>

          <ScrollView className="flex-1 px-6 pt-4">
            {/* 학년/반 선택 + 버튼 */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <PickerSelect
                  label="학년"
                  value={batchGrade}
                  options={gradeOptions}
                  onSelect={(v) => setBatchGrade(v as number)}
                />
              </View>
              <View className="flex-1">
                <PickerSelect
                  label="반"
                  value={batchClass}
                  options={classOptions}
                  onSelect={(v) => setBatchClass(v as number)}
                />
              </View>
              <Pressable
                className={`rounded-xl px-5 items-center justify-center self-end ${
                  previewCount > 0 ? "bg-primary" : "bg-gray-300"
                }`}
                style={{ height: 50 }}
                onPress={handleBatchImport}
                disabled={previewCount === 0}
              >
                <Text className="text-tablet-sm font-bold text-white">
                  {previewCount > 0 ? `${previewCount}명 입력` : "입력"}
                </Text>
              </Pressable>
              <Pressable
                className="bg-gray-200 rounded-xl px-4 items-center justify-center self-end"
                style={{ height: 50 }}
                onPress={() => {
                  setShowBatchImport(false);
                  setBatchText("");
                }}
              >
                <Text className="text-tablet-sm font-bold text-gray-600">취소</Text>
              </Pressable>
            </View>

            {/* 안내 */}
            <View className="bg-sky rounded-xl p-4 mb-4">
              <Text className="text-sm font-bold text-primary mb-1">
                입력 형식 (한 줄에 한 명)
              </Text>
              <Text className="text-xs text-primary/70 leading-5">
                번호,이름,성별,달리기기록(초){"\n"}
                {"\n"}
                예시:{"\n"}
                1,김민수,남,12.15{"\n"}
                2,이서연,여,13.42{"\n"}
                3,박지호,남{"\n"}
                {"\n"}
                * 성별: 남/여 또는 M/F{"\n"}
                * 달리기 기록은 초 단위 (예: 12.15) 선택사항{"\n"}
                * 구분자: 쉼표(,) 또는 탭
              </Text>
            </View>

            {/* 텍스트 입력 */}
            <TextInput
              className="bg-white border border-gray-300 rounded-xl p-4 text-base mb-4"
              style={{ minHeight: 200, textAlignVertical: "top" }}
              placeholder={"1,김민수,남,12.15\n2,이서연,여,13.42\n3,박지호,남"}
              value={batchText}
              onChangeText={setBatchText}
              multiline
              autoCorrect={false}
            />

            {/* 미리보기 */}
            {batchText.trim().length > 0 && (
              <View className="bg-gray-100 rounded-xl p-3 mb-4">
                <Text className="text-sm text-gray-600">
                  인식된 학생: {previewCount}명 /{" "}
                  {batchText.split("\n").filter((l) => l.trim()).length}줄
                </Text>
              </View>
            )}

            {/* 하단 여백 */}
            <View className="mb-10" />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-bold text-secondary">{value}</Text>
    </View>
  );
}
