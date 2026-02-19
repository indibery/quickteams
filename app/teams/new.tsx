import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { useStudentStore } from "@/stores/studentStore";
import { useTeamStore } from "@/stores/teamStore";
import type { Team } from "@/lib/types";
import PickerSelect from "@/components/common/PickerSelect";
import {
  assignTeams,
  type AssignmentResult,
  type Student as AlgoStudent,
} from "@/lib/algorithms/zigzagAssignment";
import { recalculateAbilityScores } from "@/lib/db/repositories/studentRepository";
import { getTeamMembers } from "@/lib/db/repositories/teamRepository";
import { partialSwap, type SwapResult } from "@/lib/algorithms/partialSwap";

type MemberWithInfo = {
  id: number;
  teamId: number;
  studentId: number;
  teamName: string;
  studentName: string;
  gender: string;
  abilityScore: number | null;
  runningRecord: number | null;
};

const gradeOptions = Array.from({ length: 6 }, (_, i) => ({
  label: `${i + 1}학년`,
  value: i + 1,
}));
const classOptions = Array.from({ length: 20 }, (_, i) => ({
  label: `${i + 1}반`,
  value: i + 1,
}));
const mixedTeamCountOptions = [
  { label: "2팀", value: 2 },
  { label: "3팀", value: 3 },
  { label: "4팀", value: 4 },
  { label: "5팀", value: 5 },
  { label: "6팀", value: 6 },
];
const separateTeamCountOptions = [
  { label: "1팀", value: 1 },
  { label: "2팀", value: 2 },
  { label: "3팀", value: 3 },
];
const modeOptions = [
  { label: "남녀혼성", value: "mixed" },
  { label: "성별분리", value: "separate" },
];

const DOT_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
const DOT_LIGHT  = ["#DBEAFE", "#FEE2E2", "#D1FAE5", "#FEF3C7", "#EDE9FE", "#FCE7F3"];

/** MemberWithInfo 배열을 team_name 기준으로 그룹핑 */
function groupByTeamName(members: MemberWithInfo[]): { teamName: string; members: MemberWithInfo[] }[] {
  const map = new Map<string, MemberWithInfo[]>();
  for (const m of members) {
    if (!map.has(m.teamName)) map.set(m.teamName, []);
    map.get(m.teamName)!.push(m);
  }
  return Array.from(map.entries()).map(([teamName, members]) => ({ teamName, members }));
}

export default function TeamManagementScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loadStudents, setFilter } = useStudentStore();
  const {
    teams,
    isLoading,
    loadAllTeams,
    createTeam,
    updateLabel,
    reassignMembers,
    removeTeam,
  } = useTeamStore();

  // --- 팀 목록 ---
  const [filterGrade, setFilterGrade] = useState(0); // 0 = 전체

  // --- 생성 모달 ---
  const [showCreate, setShowCreate] = useState(false);
  const [grade, setGrade] = useState(1);
  const [classNum, setClassNum] = useState(1);
  const [teamCount, setTeamCount] = useState(2);
  const [mode, setMode] = useState<"mixed" | "separate">("mixed");
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [createStep, setCreateStep] = useState<"config" | "result">("config");

  // --- 보기 모달 ---
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const [viewMembers, setViewMembers] = useState<MemberWithInfo[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // --- 편집 모달 ---
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editMembers, setEditMembers] = useState<MemberWithInfo[]>([]);
  const [editMembersLoading, setEditMembersLoading] = useState(false);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null); // 소폭 교체 결과

  useEffect(() => {
    loadAllTeams(db);
  }, []);

  const filteredTeams =
    filterGrade === 0 ? teams : teams.filter((t) => t.grade === filterGrade);

  // --- 팀 생성 로직 ---
  const handleAssign = async () => {
    setFilter(grade, classNum);
    await recalculateAbilityScores(db, grade, classNum);
    await loadStudents(db);

    const currentStudents = useStudentStore.getState().students;
    const eligible = currentStudents.filter((s) => s.abilityScore != null);

    if (eligible.length < teamCount) {
      Alert.alert(
        "학생 부족",
        `능력 점수가 있는 학생이 ${eligible.length}명입니다. 최소 ${teamCount}명이 필요합니다.`
      );
      return;
    }

    const algoStudents: AlgoStudent[] = eligible.map((s) => ({
      id: s.id,
      name: s.name,
      gender: s.gender,
      abilityScore: s.abilityScore!,
    }));

    const assignResult = assignTeams(algoStudents, teamCount, mode);
    setResult(assignResult);
    setCreateStep("result");
  };

  const handleSave = async () => {
    if (!result) return;

    const now = new Date().toLocaleDateString("ko-KR");
    const teamName = `${grade}-${classNum} ${now}`;

    const members = result.teams.flatMap((team) =>
      team.members.map((m) => ({
        studentId: m.id,
        teamName: team.teamName,
      }))
    );

    const teamId = await createTeam(
      db,
      { name: teamName, label, grade, class: classNum, teamType: mode, teamCount },
      members
    );

    resetCreateModal();
    await loadAllTeams(db);

    Alert.alert("저장 완료", "팀이 저장되었습니다.", [
      { text: "팀 보기", onPress: () => router.push(`/teams/${teamId}`) },
      { text: "확인" },
    ]);
  };

  const resetCreateModal = () => {
    setShowCreate(false);
    setCreateStep("config");
    setResult(null);
    setLabel("");
    setGrade(1);
    setClassNum(1);
    setTeamCount(2);
    setMode("mixed");
  };

  // --- 보기 로직 ---
  const handleViewOpen = async (team: Team) => {
    setViewTeam(team);
    setViewLoading(true);
    const members = await getTeamMembers(db, team.id);
    setViewMembers(members);
    setViewLoading(false);
  };

  // --- 편집 로직 ---
  const handleEditOpen = async (team: Team) => {
    setEditTeam(team);
    setEditLabel(team.label);
    setSwapResult(null);
    setEditMembersLoading(true);
    const members = await getTeamMembers(db, team.id);
    setEditMembers(members);
    setEditMembersLoading(false);
  };

  const handleEditSave = async () => {
    if (!editTeam) return;
    await updateLabel(db, editTeam.id, editLabel);
    await loadAllTeams(db);
    setEditTeam(null);
    Alert.alert("저장 완료", "팀 이름이 저장되었습니다.");
  };

  const handleReassign = async () => {
    if (!editTeam) return;

    // 현재 팀원 데이터가 없으면 전체 재배정으로 폴백
    if (editMembers.length === 0) {
      Alert.alert("팀원 없음", "현재 팀원 정보가 없어 전체 재배정을 진행합니다.", [
        { text: "취소", style: "cancel" },
        { text: "전체 재배정", onPress: handleFullReassign },
      ]);
      return;
    }

    setEditMembersLoading(true);

    // 현재 팀원을 SwapMember 형식으로 변환
    const grouped = groupByTeamName(editMembers);
    const swapInput = grouped.map((g) => ({
      teamName: g.teamName,
      members: g.members.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        studentName: m.studentName,
        gender: m.gender,
        abilityScore: m.abilityScore,
        runningRecord: m.runningRecord,
        teamName: g.teamName,
      })),
    }));

    const result = partialSwap(swapInput, editTeam.teamCount);
    setSwapResult(result);

    // 교체된 결과를 editMembers에 반영 (UI 즉시 갱신)
    const newMembers: MemberWithInfo[] = result.teams.flatMap((team) =>
      team.members.map((m) => ({
        id: m.id,
        teamId: editTeam.id,
        studentId: m.studentId,
        teamName: team.teamName,
        studentName: m.studentName,
        gender: m.gender,
        abilityScore: m.abilityScore,
        runningRecord: m.runningRecord,
      }))
    );
    setEditMembers(newMembers);
    setEditMembersLoading(false);
  };

  // DB에 소폭 교체 결과 저장
  const handleSaveSwap = async () => {
    if (!editTeam || !swapResult) return;
    const members = swapResult.teams.flatMap((team) =>
      team.members.map((m) => ({ studentId: m.studentId, teamName: team.teamName }))
    );
    await reassignMembers(db, editTeam.id, members);
    if (editLabel !== editTeam.label) {
      await updateLabel(db, editTeam.id, editLabel);
    }
    await loadAllTeams(db);
    setSwapResult(null);
    const savedId = editTeam.id;
    setEditTeam(null);
    Alert.alert(
      "교체 완료",
      `균형 점수: ${swapResult.balanceBefore}점 → ${swapResult.balanceAfter}점`,
      [
        { text: "팀 보기", onPress: () => router.push(`/teams/${savedId}`) },
        { text: "확인" },
      ]
    );
  };

  // 전체 재배정 (팀원 없을 때 폴백)
  const handleFullReassign = async () => {
    if (!editTeam) return;
    setFilter(editTeam.grade, editTeam.class);
    await recalculateAbilityScores(db, editTeam.grade, editTeam.class);
    await loadStudents(db);
    const currentStudents = useStudentStore.getState().students;
    const eligible = currentStudents.filter((s) => s.abilityScore != null);
    if (eligible.length < editTeam.teamCount) {
      Alert.alert("학생 부족", `능력 점수가 있는 학생이 ${eligible.length}명입니다.`);
      return;
    }
    const algoStudents: AlgoStudent[] = eligible.map((s) => ({
      id: s.id, name: s.name, gender: s.gender, abilityScore: s.abilityScore!,
    }));
    const newResult = assignTeams(algoStudents, editTeam.teamCount, editTeam.teamType);
    const members = newResult.teams.flatMap((t) =>
      t.members.map((m) => ({ studentId: m.id, teamName: t.teamName }))
    );
    await reassignMembers(db, editTeam.id, members);
    const freshMembers = await getTeamMembers(db, editTeam.id);
    setEditMembers(freshMembers);
    setSwapResult(null);
    await loadAllTeams(db);
  };

  // --- 삭제 ---
  const handleDelete = (team: Team) => {
    Alert.alert(
      "팀 삭제",
      `${team.grade}학년 ${team.class}반 ${team.teamCount}팀${team.label ? ` (${team.label})` : ""}을 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await removeTeam(db, team.id);
            await loadAllTeams(db);
          },
        },
      ]
    );
  };

  // --- 팀 카드 렌더 ---
  const renderTeam = useCallback(
    ({ item }: { item: Team }) => (
      <View className="bg-white rounded-xl p-5 mb-3 border border-gray-100">
        <View className="flex-row items-center mb-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text style={{ fontSize: 20 }} className="font-bold text-secondary">
                {item.grade}학년 {item.class}반
              </Text>
              <View className="bg-sky px-2.5 py-0.5 rounded-lg">
                <Text className="text-sm font-bold text-primary">
                  {item.teamCount}팀 · {item.teamType === "mixed" ? "혼성" : "성별분리"}
                </Text>
              </View>
              {item.label ? (
                <View className="bg-sunny/40 px-2.5 py-0.5 rounded-lg">
                  <Text className="text-sm font-bold text-secondary">{item.label}</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs text-gray-400 mt-1">
              {item.createdAt.split(" ")[0]}
            </Text>
          </View>
        </View>

        {/* 액션 버튼 */}
        <View className="flex-row gap-2 mt-2">
          <Pressable
            className="flex-1 py-3 rounded-lg bg-sky items-center active:opacity-70"
            onPress={() => handleViewOpen(item)}
          >
            <Text className="text-tablet-sm font-bold text-primary">👀 보기</Text>
          </Pressable>
          <Pressable
            className="flex-1 py-3 rounded-lg bg-gray-100 items-center active:opacity-70"
            onPress={() => handleEditOpen(item)}
          >
            <Text className="text-tablet-sm font-bold text-gray-600">✏️ 편집</Text>
          </Pressable>
          <Pressable
            className="py-3 px-4 rounded-lg bg-red-50 items-center active:opacity-70"
            onPress={() => handleDelete(item)}
          >
            <Text className="text-tablet-sm font-bold text-red-500">🗑️</Text>
          </Pressable>
        </View>
      </View>
    ),
    [router]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      {/* 필터 */}
      <View className="bg-white px-6 py-3 flex-row gap-3 border-b border-gray-100">
        <View className="flex-1">
          <PickerSelect
            label="학년"
            value={filterGrade}
            options={[{ label: "전체", value: 0 }, ...gradeOptions]}
            onSelect={(v) => setFilterGrade(v as number)}
          />
        </View>
        <Pressable
          className="bg-primary rounded-xl px-5 items-center justify-center self-end"
          style={{ height: 50 }}
          onPress={() => setShowCreate(true)}
        >
          <Text className="text-white text-tablet-sm font-bold">+ 새 팀</Text>
        </Pressable>
      </View>

      <View className="px-6 py-2">
        <Text className="text-sm text-gray-500">
          {filterGrade === 0 ? "전체" : `${filterGrade}학년`} · {filteredTeams.length}개 팀
        </Text>
      </View>

      {/* 목록 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredTeams.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">📋</Text>
          <Text className="text-tablet-sm text-gray-400">저장된 팀이 없습니다</Text>
          <Pressable
            className="bg-primary rounded-xl px-6 py-3 mt-4"
            onPress={() => setShowCreate(true)}
          >
            <Text className="text-white font-bold">+ 새 팀 만들기</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredTeams}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTeam}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
        />
      )}

      {/* ========== 생성 모달 ========== */}
      <Modal visible={showCreate} animationType="slide">
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          <View className="bg-primary px-6 py-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">새 팀 만들기</Text>
            <Pressable onPress={resetCreateModal} hitSlop={16} className="p-2">
              <Text className="text-white text-lg">✕</Text>
            </Pressable>
          </View>

          {createStep === "result" && result ? (
            <>
              <ScrollView className="flex-1 px-6 pt-4">
                <View className="bg-white rounded-2xl p-5 mb-4 items-center">
                  <Text className="text-sm text-gray-500 mb-1">균형 점수</Text>
                  <Text
                    className={`text-5xl font-bold ${
                      result.balanceScore >= 80
                        ? "text-primary"
                        : result.balanceScore >= 60
                          ? "text-sunny-dark"
                          : "text-red-500"
                    }`}
                  >
                    {result.balanceScore}
                  </Text>
                  <Text className="text-sm text-gray-400 mt-1">
                    {result.balanceScore >= 80
                      ? "매우 균형적입니다!"
                      : result.balanceScore >= 60
                        ? "적정 수준입니다"
                        : "불균형 - 재배정을 추천합니다"}
                  </Text>
                </View>

                {result.teams.map((team, i) => (
                  <View key={team.teamName} className="bg-white rounded-2xl p-5 mb-3">
                    <View className="flex-row items-center mb-3">
                      <View
                        style={{
                          backgroundColor: DOT_COLORS[i % DOT_COLORS.length],
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          marginRight: 8,
                        }}
                      />
                      <Text className="text-tablet-md font-bold text-secondary flex-1">
                        {team.teamName}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        평균 {team.averageScore.toFixed(1)} · 남{team.maleCount} 여
                        {team.femaleCount}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {team.members.map((m) => (
                        <View
                          key={m.id}
                          className={`px-3 py-1.5 rounded-lg ${
                            m.gender === "M" ? "bg-sky" : "bg-sunny/30"
                          }`}
                        >
                          <Text className="text-sm text-secondary">
                            {m.name}{" "}
                            <Text className="text-xs text-gray-400">
                              ({m.abilityScore.toFixed(1)})
                            </Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View className="flex-row gap-3 px-6 py-4 bg-white border-t border-gray-100">
                <Pressable
                  className="flex-1 py-4 rounded-xl bg-gray-200 items-center"
                  onPress={() => {
                    setResult(null);
                    setCreateStep("config");
                  }}
                >
                  <Text className="text-tablet-sm font-bold text-gray-600">재배정</Text>
                </Pressable>
                <Pressable
                  className="flex-1 py-4 rounded-xl bg-primary items-center"
                  onPress={handleSave}
                >
                  <Text className="text-tablet-sm font-bold text-white">저장</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ScrollView className="flex-1 px-6 pt-4">
                <View className="bg-white rounded-2xl p-5 mb-4">
                  <Text className="text-tablet-sm font-bold text-secondary mb-3">
                    팀 이름 (선택)
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-tablet-sm"
                    placeholder="예: 피구, 체육대회, 수업용"
                    value={label}
                    onChangeText={setLabel}
                  />
                </View>

                <View className="bg-white rounded-2xl p-5 mb-4">
                  <Text className="text-tablet-sm font-bold text-secondary mb-3">
                    학년 · 반
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <PickerSelect
                        label="학년"
                        value={grade}
                        options={gradeOptions}
                        onSelect={(v) => setGrade(v as number)}
                      />
                    </View>
                    <View className="flex-1">
                      <PickerSelect
                        label="반"
                        value={classNum}
                        options={classOptions}
                        onSelect={(v) => setClassNum(v as number)}
                      />
                    </View>
                  </View>
                </View>

                <View className="bg-white rounded-2xl p-5 mb-4">
                  <Text className="text-tablet-sm font-bold text-secondary mb-3">
                    팀 수{mode === "separate" ? ` (실제 ${teamCount * 2}팀: 남${teamCount} + 여${teamCount})` : ""}
                  </Text>
                  <View className="flex-row gap-3">
                    {(mode === "separate" ? separateTeamCountOptions : mixedTeamCountOptions).map((opt) => (
                      <Pressable
                        key={opt.value}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          teamCount === opt.value ? "bg-primary" : "bg-gray-100"
                        }`}
                        onPress={() => setTeamCount(opt.value)}
                      >
                        <Text
                          className={`text-tablet-sm font-bold ${
                            teamCount === opt.value ? "text-white" : "text-gray-600"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View className="bg-white rounded-2xl p-5 mb-4">
                  <Text className="text-tablet-sm font-bold text-secondary mb-3">
                    성별 구성
                  </Text>
                  <View className="flex-row gap-3">
                    {modeOptions.map((opt) => (
                      <Pressable
                        key={opt.value}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          mode === opt.value ? "bg-primary" : "bg-gray-100"
                        }`}
                        onPress={() => {
                          const newMode = opt.value as "mixed" | "separate";
                          setMode(newMode);
                          // 성별분리→혼성: 1이면 2로, 혼성→분리: 4이상이면 3으로
                          if (newMode === "mixed" && teamCount < 2) setTeamCount(2);
                          if (newMode === "separate" && teamCount > 3) setTeamCount(3);
                        }}
                      >
                        <Text
                          className={`text-tablet-sm font-bold ${
                            mode === opt.value ? "text-white" : "text-gray-600"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View className="px-6 py-4 bg-white border-t border-gray-100">
                <Pressable
                  className="bg-primary rounded-xl py-4 items-center"
                  onPress={handleAssign}
                >
                  <Text className="text-tablet-md font-bold text-white">
                    👥 팀 배정하기
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ========== 보기 모달 ========== */}
      <Modal visible={viewTeam != null} animationType="slide">
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          <View className="bg-primary px-6 py-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">팀 보기</Text>
            <Pressable onPress={() => setViewTeam(null)} hitSlop={16} className="p-2">
              <Text className="text-white text-lg">✕</Text>
            </Pressable>
          </View>

          {viewTeam && (
            <ScrollView className="flex-1 px-6 pt-4">
              {/* 팀 정보 */}
              <View className="bg-white rounded-2xl p-5 mb-4">
                <Text className="text-sm text-gray-500 mb-1">팀 정보</Text>
                <Text className="text-tablet-md font-bold text-secondary">
                  {viewTeam.grade}학년 {viewTeam.class}반 · {viewTeam.teamCount}팀 ·{" "}
                  {viewTeam.teamType === "mixed" ? "혼성" : "성별분리"}
                </Text>
                {viewTeam.label ? (
                  <View className="bg-sunny/40 self-start px-2.5 py-0.5 rounded-lg mt-2">
                    <Text className="text-sm font-bold text-secondary">{viewTeam.label}</Text>
                  </View>
                ) : null}
                <Text className="text-xs text-gray-400 mt-2">
                  생성일: {viewTeam.createdAt.split(" ")[0]}
                </Text>
              </View>

              {/* 팀원 목록 */}
              {viewLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : viewMembers.length === 0 ? (
                <View className="bg-white rounded-2xl p-5 mb-3 items-center">
                  <Text className="text-2xl mb-2">👥</Text>
                  <Text className="text-sm text-gray-400 text-center">
                    팀원 정보가 없습니다.{"\n"}편집 → 팀 재배정으로 팀원을 배정해주세요.
                  </Text>
                </View>
              ) : (
                groupByTeamName(viewMembers).map((group, i) => (
                  <View key={group.teamName} className="bg-white rounded-2xl p-5 mb-3">
                    {/* 팀 헤더 */}
                    <View className="flex-row items-center mb-4">
                      <View
                        style={{
                          backgroundColor: DOT_COLORS[i % DOT_COLORS.length],
                          width: 16, height: 16, borderRadius: 8, marginRight: 10,
                        }}
                      />
                      <Text className="text-tablet-md font-bold text-secondary flex-1">
                        {group.teamName}
                      </Text>
                      <Text className="text-tablet-sm text-gray-400">
                        {group.members.filter(m => m.gender === "M").length}남{" "}
                        {group.members.filter(m => m.gender === "F").length}여
                      </Text>
                    </View>
                    {/* 멤버 칩 */}
                    <View className="flex-row flex-wrap gap-2">
                      {group.members.map((m) => (
                        <View
                          key={m.id}
                          style={{ backgroundColor: m.gender === "M" ? "#DBEAFE" : "#FEF3C7" }}
                          className="px-4 py-2 rounded-xl items-center"
                        >
                          <Text className="text-tablet-sm font-bold text-secondary">
                            {m.studentName}
                          </Text>
                          {m.runningRecord != null && (
                            <Text className="text-xs text-gray-400 mt-0.5">
                              🏃 {m.runningRecord}초
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}

              {/* 팀 명단 상세 보기 버튼 */}
              <Pressable
                className="bg-sky rounded-xl py-4 items-center mb-8"
                onPress={() => {
                  setViewTeam(null);
                  router.push(`/teams/${viewTeam.id}`);
                }}
              >
                <Text className="text-tablet-sm font-bold text-primary">📋 명단 전체 보기</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ========== 편집 모달 ========== */}
      <Modal visible={editTeam != null} animationType="slide">
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          <View className="bg-primary px-6 py-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">팀 편집</Text>
            <Pressable onPress={() => setEditTeam(null)} hitSlop={16} className="p-2">
              <Text className="text-white text-lg">✕</Text>
            </Pressable>
          </View>

          {editTeam && (
            <ScrollView className="flex-1 px-6 pt-4">
              {/* 팀 정보 */}
              <View className="bg-white rounded-2xl p-5 mb-4">
                <Text className="text-sm text-gray-500 mb-1">팀 정보</Text>
                <Text className="text-tablet-md font-bold text-secondary">
                  {editTeam.grade}학년 {editTeam.class}반 · {editTeam.teamCount}팀 ·{" "}
                  {editTeam.teamType === "mixed" ? "혼성" : "성별분리"}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  생성일: {editTeam.createdAt.split(" ")[0]}
                </Text>
              </View>

              {/* 팀원 구성 */}
              <View className="bg-white rounded-2xl p-5 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-tablet-sm font-bold text-secondary">
                    {swapResult ? "🔄 교체 미리보기" : "현재 팀원 구성"}
                  </Text>
                  {swapResult && (
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-3 h-3 rounded-sm bg-orange-400" />
                      <Text className="text-xs text-gray-500">교체된 인원</Text>
                    </View>
                  )}
                </View>

                {editMembersLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : editMembers.length === 0 ? (
                  <Text className="text-sm text-gray-400 text-center py-3">
                    팀원 정보가 없습니다. 소폭 교체를 눌러 배정해주세요.
                  </Text>
                ) : (
                  groupByTeamName(editMembers).map((group, i) => (
                    <View key={group.teamName} className="mb-4">
                      {/* 팀 헤더 */}
                      <View className="flex-row items-center mb-3">
                        <View
                          style={{
                            backgroundColor: DOT_COLORS[i % DOT_COLORS.length],
                            width: 14, height: 14, borderRadius: 7, marginRight: 8,
                          }}
                        />
                        <Text className="text-tablet-md font-bold text-secondary flex-1">{group.teamName}</Text>
                        <Text className="text-tablet-sm text-gray-400">
                          {group.members.filter(m => m.gender === "M").length}남{" "}
                          {group.members.filter(m => m.gender === "F").length}여
                          {swapResult && (
                            <>  평균 {swapResult.teams.find(t => t.teamName === group.teamName)?.averageScore.toFixed(1) ?? "-"}</>
                          )}
                        </Text>
                      </View>
                      {/* 멤버 칩 */}
                      <View className="flex-row flex-wrap gap-2">
                        {group.members.map((m) => {
                          const isSwapped = swapResult?.swappedIds.includes(m.studentId) ?? false;
                          return (
                            <View
                              key={m.id}
                              style={{
                                backgroundColor: isSwapped ? "#FFF7ED" : (m.gender === "M" ? "#DBEAFE" : "#FEF3C7"),
                                borderWidth: isSwapped ? 1.5 : 0,
                                borderColor: isSwapped ? "#F97316" : "transparent",
                              }}
                              className="px-4 py-2 rounded-xl items-center"
                            >
                              <Text
                                style={{ color: isSwapped ? "#EA580C" : undefined }}
                                className={`text-tablet-sm font-bold ${isSwapped ? "" : "text-secondary"}`}
                              >
                                {isSwapped ? "★ " : ""}{m.studentName}
                              </Text>
                              {m.runningRecord != null && (
                                <Text className="text-xs text-gray-400 mt-0.5">
                                  🏃 {m.runningRecord}초
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}

                {/* 교체 결과 균형 점수 */}
                {swapResult && (
                  <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center justify-center gap-3">
                    <Text className="text-sm text-gray-500">
                      균형 점수
                    </Text>
                    <Text className="text-sm font-bold text-gray-400">
                      {swapResult.balanceBefore}점
                    </Text>
                    <Text className="text-sm text-gray-400">→</Text>
                    <Text
                      className={`text-lg font-bold ${
                        swapResult.balanceAfter >= swapResult.balanceBefore
                          ? "text-primary"
                          : "text-red-500"
                      }`}
                    >
                      {swapResult.balanceAfter}점
                    </Text>
                    {swapResult.swappedIds.length === 0 && (
                      <Text className="text-xs text-gray-400">(이미 최적)</Text>
                    )}
                  </View>
                )}
              </View>

              {/* 팀 이름 편집 */}
              <View className="bg-white rounded-2xl p-5 mb-4">
                <Text className="text-tablet-sm font-bold text-secondary mb-3">
                  팀 이름
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-tablet-sm"
                  placeholder="예: 피구, 체육대회, 수업용"
                  value={editLabel}
                  onChangeText={setEditLabel}
                />
              </View>

              <View className="gap-3 mb-8">
                {/* 교체 결과 있을 때: 저장 / 다시교체 */}
                {swapResult ? (
                  <>
                    <Pressable
                      className="bg-primary rounded-xl py-4 items-center"
                      onPress={handleSaveSwap}
                    >
                      <Text className="text-tablet-sm font-bold text-white">
                        ✅ 교체 결과 저장
                      </Text>
                    </Pressable>
                    <Pressable
                      className="bg-sunny rounded-xl py-4 items-center"
                      onPress={handleReassign}
                    >
                      <Text className="text-tablet-sm font-bold text-secondary">
                        🔄 다시 교체
                      </Text>
                    </Pressable>
                    <Pressable
                      className="bg-gray-100 rounded-xl py-4 items-center"
                      onPress={async () => {
                        setSwapResult(null);
                        setEditMembersLoading(true);
                        const members = await getTeamMembers(db, editTeam.id);
                        setEditMembers(members);
                        setEditMembersLoading(false);
                      }}
                    >
                      <Text className="text-tablet-sm font-bold text-gray-500">
                        ✕ 취소 (원래대로)
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      className="bg-primary rounded-xl py-4 items-center"
                      onPress={handleEditSave}
                    >
                      <Text className="text-tablet-sm font-bold text-white">
                        💾 팀 이름 저장
                      </Text>
                    </Pressable>
                    <Pressable
                      className="bg-sunny rounded-xl py-4 items-center"
                      onPress={handleReassign}
                      disabled={editMembers.length === 0}
                    >
                      <Text className="text-tablet-sm font-bold text-secondary">
                        🔄 소폭 교체 (1-2명)
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
