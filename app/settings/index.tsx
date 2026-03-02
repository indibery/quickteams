import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Linking,
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
import { Colors } from "@/constants/theme";

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
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.bg }} edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 pt-4">
        {/* 학생 일괄 입력 */}
        <View
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text className="text-tablet-sm font-bold mb-3" style={{ color: Colors.text1 }}>
            학생 일괄 입력
          </Text>
          <Text className="text-xs mb-3" style={{ color: Colors.text3 }}>
            여러 학생을 한번에 입력합니다. 테스트 데이터 준비에 유용합니다.
          </Text>
          <Pressable
            className="rounded-2xl py-3 px-4 active:opacity-80"
            style={{ backgroundColor: Colors.primarySoft }}
            onPress={() => setShowBatchImport(true)}
          >
            <Text className="text-tablet-sm font-bold" style={{ color: Colors.primary }}>
              📋 일괄 입력 열기
            </Text>
          </Pressable>
        </View>

        {/* 앱 정보 */}
        <View
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text className="text-tablet-md font-bold mb-1" style={{ color: Colors.text1 }}>
            바로팀 v2.1.0
          </Text>
          <Text className="text-sm mb-3" style={{ color: Colors.text3 }}>
            달리기 기록으로 공정하게 팀을 만들어요
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 }}>
            <InfoRow label="데이터 저장" value="로컬 (오프라인)" />
            <Pressable
              className="flex-row justify-between py-1.5 active:opacity-80"
              onPress={() => Linking.openURL("mailto:bery97@gmail.com")}
            >
              <Text className="text-sm" style={{ color: Colors.text2 }}>피드백</Text>
              <Text className="text-sm font-bold" style={{ color: Colors.primary }}>
                bery97@gmail.com
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 능력 점수 공식 */}
        <View
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text className="text-tablet-sm font-bold mb-3" style={{ color: Colors.text1 }}>
            능력 점수 공식
          </Text>
          <InfoRow label="기본" value="달리기 상대 순위 (1~5)" />
          <InfoRow label="능력 보정" value="교사가 ±5 범위로 조정" />
          <InfoRow label="조정계수" value="능력 보정 1당 ±0.2" />
          <Text className="text-xs mt-2" style={{ color: Colors.text3 }}>
            공식: 달리기점수 + 능력 보정 × 0.2 (결과 1.0~5.0)
          </Text>
        </View>

        {/* 데이터 관리 */}
        <View
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text className="text-tablet-sm font-bold mb-3" style={{ color: Colors.text1 }}>
            데이터 관리
          </Text>
          <Pressable
            className="rounded-2xl py-3 px-4 mb-3 active:opacity-80"
            style={{ backgroundColor: Colors.primarySoft }}
            onPress={handleExportCSV}
          >
            <Text className="text-tablet-sm font-bold" style={{ color: Colors.primary }}>
              📤 학생 데이터 CSV 내보내기
            </Text>
          </Pressable>
          <Pressable
            className="rounded-2xl py-3 px-4 active:opacity-80"
            style={{ backgroundColor: Colors.dangerSoft }}
            onPress={handleResetData}
          >
            <Text className="text-tablet-sm font-bold" style={{ color: Colors.dangerText }}>
              🗑️ 전체 데이터 초기화
            </Text>
          </Pressable>
        </View>

        {/* 개인정보 */}
        <View
          className="rounded-2xl p-5 mb-8"
          style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text className="text-tablet-sm font-bold mb-2" style={{ color: Colors.text1 }}>
            개인정보 보호
          </Text>
          <Text className="text-sm leading-5" style={{ color: Colors.text2 }}>
            바로팀은 모든 데이터를 기기 내에만 저장합니다. 외부 서버로
            전송되는 데이터는 없으며, 인터넷 연결 없이 완전히 오프라인으로
            동작합니다.
          </Text>
        </View>
      </ScrollView>

      {/* 일괄 입력 모달 */}
      <Modal visible={showBatchImport} animationType="slide">
        <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
          <View className="px-6 py-4" style={{ backgroundColor: Colors.headerBg, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <Text className="text-xl font-bold" style={{ color: Colors.text1 }}>학생 일괄 입력</Text>
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
                className="rounded-xl px-5 items-center justify-center self-end"
                style={{
                  height: 50,
                  backgroundColor: previewCount > 0 ? Colors.primary : Colors.pillBg,
                }}
                onPress={handleBatchImport}
                disabled={previewCount === 0}
              >
                <Text className="text-tablet-sm font-bold text-white">
                  {previewCount > 0 ? `${previewCount}명 입력` : "입력"}
                </Text>
              </Pressable>
              <Pressable
                className="rounded-xl px-4 items-center justify-center self-end"
                style={{ height: 50, backgroundColor: Colors.surface }}
                onPress={() => {
                  setShowBatchImport(false);
                  setBatchText("");
                }}
              >
                <Text className="text-tablet-sm font-bold" style={{ color: Colors.text2 }}>취소</Text>
              </Pressable>
            </View>

            {/* 안내 */}
            <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: Colors.primarySoft }}>
              <Text className="text-sm font-bold mb-1" style={{ color: Colors.primary }}>
                입력 형식 (한 줄에 한 명)
              </Text>
              <Text className="text-xs leading-5" style={{ color: 'rgba(59,130,246,0.7)' }}>
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
              style={{
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                marginBottom: 16,
                minHeight: 200,
                textAlignVertical: "top",
                backgroundColor: Colors.inputBg,
                borderWidth: 1,
                borderColor: Colors.inputBorder,
                color: Colors.text1,
              }}
              placeholder={"1,김민수,남,12.15\n2,이서연,여,13.42\n3,박지호,남"}
              placeholderTextColor={Colors.placeholder}
              value={batchText}
              onChangeText={setBatchText}
              multiline
              autoCorrect={false}
              keyboardAppearance="dark"
            />

            {/* 미리보기 */}
            {batchText.trim().length > 0 && (
              <View className="rounded-xl p-3 mb-4" style={{ backgroundColor: Colors.surface }}>
                <Text className="text-sm" style={{ color: Colors.text2 }}>
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
      <Text className="text-sm" style={{ color: Colors.text2 }}>{label}</Text>
      <Text className="text-sm font-bold" style={{ color: Colors.text1 }}>{value}</Text>
    </View>
  );
}
