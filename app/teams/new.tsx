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
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { useStudentStore } from "@/stores/studentStore";
import { useTeamStore } from "@/stores/teamStore";
import { useResponsiveSizes } from "@/hooks/useResponsiveSizes";
import type { Team } from "@/lib/types";
import PickerSelect from "@/components/common/PickerSelect";
import {
  assignTeams,
  type AssignmentResult,
  type Student as AlgoStudent,
} from "@/lib/algorithms/zigzagAssignment";
import { recalculateAbilityScores } from "@/lib/db/repositories/studentRepository";
import { getTeamMembers } from "@/lib/db/repositories/teamRepository";
import { partialSwap, calcBalance, getGenderGroup, type SwapResult } from "@/lib/algorithms/partialSwap";
import { Colors, DOT_COLORS } from "@/constants/theme";

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
  const rs = useResponsiveSizes();
  const { students: storeStudents, loadStudents, setFilter } = useStudentStore();
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

  // --- 수동 교체 ---
  const [manualSwapMode, setManualSwapMode] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState<MemberWithInfo | null>(null);
  const [manualSwappedIds, setManualSwappedIds] = useState<number[]>([]);
  const [manualSwapCount, setManualSwapCount] = useState(0);

  // 결과 화면에서 runningRecord 표시를 위한 학생 lookup map
  const studentMap = useMemo(
    () => new Map(storeStudents.map((s) => [s.id, s])),
    [storeStudents]
  );

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
  const handleViewOpen = useCallback(async (team: Team) => {
    setViewTeam(team);
    setViewLoading(true);
    const members = await getTeamMembers(db, team.id);
    setViewMembers(members);
    setViewLoading(false);
  }, [db]);

  // --- 편집 로직 ---
  const handleEditOpen = useCallback(async (team: Team) => {
    setEditTeam(team);
    setEditLabel(team.label);
    setSwapResult(null);
    setManualSwapMode(false);
    setSelectedForSwap(null);
    setManualSwappedIds([]);
    setManualSwapCount(0);
    setEditMembersLoading(true);
    const members = await getTeamMembers(db, team.id);
    setEditMembers(members);
    setEditMembersLoading(false);
  }, [db]);

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
    if (!editTeam || !swapResult || editMembersLoading) return;
    setEditMembersLoading(true);
    const members = swapResult.teams.flatMap((team) =>
      team.members.map((m) => ({ studentId: m.studentId, teamName: team.teamName }))
    );
    await reassignMembers(db, editTeam.id, members);
    if (editLabel !== editTeam.label) {
      await updateLabel(db, editTeam.id, editLabel);
    }
    await loadAllTeams(db);
    setSwapResult(null);
    const freshMembers = await getTeamMembers(db, editTeam.id);
    setEditMembers(freshMembers);
    setEditMembersLoading(false);
  };

  // --- 수동 교체 로직 ---
  const handleManualSwapSelect = (member: MemberWithInfo) => {
    if (!selectedForSwap) {
      setSelectedForSwap(member);
      return;
    }
    // 같은 학생 다시 탭 → 선택 해제
    if (selectedForSwap.studentId === member.studentId) {
      setSelectedForSwap(null);
      return;
    }
    // 같은 팀 → 선택 전환
    if (selectedForSwap.teamName === member.teamName) {
      setSelectedForSwap(member);
      return;
    }
    // 성별분리 팀: 다른 성별 그룹 차단
    const groupA = getGenderGroup(selectedForSwap.teamName);
    const groupB = getGenderGroup(member.teamName);
    if (groupA && groupB && groupA !== groupB) {
      Alert.alert("교체 불가", "성별분리 팀에서는 같은 성별 팀끼리만 교체할 수 있습니다.");
      return;
    }
    // 교체 실행: teamName 교환
    const newMembers = editMembers.map((m) => {
      if (m.studentId === selectedForSwap.studentId) return { ...m, teamName: member.teamName };
      if (m.studentId === member.studentId) return { ...m, teamName: selectedForSwap.teamName };
      return m;
    });
    setEditMembers(newMembers);
    setManualSwappedIds((prev) => [
      ...prev.filter((id) => id !== selectedForSwap.studentId && id !== member.studentId),
      selectedForSwap.studentId,
      member.studentId,
    ]);
    setManualSwapCount((prev) => prev + 1);
    setSelectedForSwap(null);
  };

  const handleManualSwapSave = async () => {
    if (!editTeam || editMembersLoading) return;
    setEditMembersLoading(true);
    const members = editMembers.map((m) => ({
      studentId: m.studentId,
      teamName: m.teamName,
    }));
    await reassignMembers(db, editTeam.id, members);
    if (editLabel !== editTeam.label) {
      await updateLabel(db, editTeam.id, editLabel);
    }
    await loadAllTeams(db);
    setManualSwapMode(false);
    setSelectedForSwap(null);
    setManualSwappedIds([]);
    setManualSwapCount(0);
    const freshMembers = await getTeamMembers(db, editTeam.id);
    setEditMembers(freshMembers);
    setEditMembersLoading(false);
  };

  const exitManualSwapMode = async () => {
    setManualSwapMode(false);
    setSelectedForSwap(null);
    setManualSwappedIds([]);
    setManualSwapCount(0);
    // 원래 데이터로 복원
    if (editTeam) {
      setEditMembersLoading(true);
      const members = await getTeamMembers(db, editTeam.id);
      setEditMembers(members);
      setEditMembersLoading(false);
    }
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
  const handleDelete = useCallback((team: Team) => {
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
  }, [db, removeTeam, loadAllTeams]);

  // --- 팀 카드 렌더 ---
  const renderTeam = useCallback(
    ({ item }: { item: Team }) => (
      <View
        className="rounded-2xl p-5 mb-3"
        style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
      >
        <View className="flex-row items-center mb-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text style={{ fontSize: 20, color: Colors.text1 }} className="font-bold">
                {item.grade}학년 {item.class}반
              </Text>
              <View className="px-2.5 py-0.5 rounded-xl" style={{ backgroundColor: Colors.primarySoft }}>
                <Text className="text-sm font-bold" style={{ color: Colors.primary }}>
                  {item.teamCount}팀 · {item.teamType === "mixed" ? "혼성" : "성별분리"}
                </Text>
              </View>
              {item.label ? (
                <View className="px-2.5 py-0.5 rounded-xl" style={{ backgroundColor: Colors.warningSoft }}>
                  <Text className="text-sm font-bold" style={{ color: Colors.warningText }}>{item.label}</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs mt-1" style={{ color: Colors.text3 }}>
              {item.createdAt.split(" ")[0]}
            </Text>
          </View>
        </View>

        {/* 액션 버튼 */}
        <View className="flex-row gap-2 mt-2">
          <Pressable
            className="flex-1 py-3 rounded-xl items-center active:opacity-80"
            style={{ backgroundColor: Colors.primarySoft }}
            onPress={() => handleViewOpen(item)}
          >
            <Text className="font-bold" style={{ color: Colors.primary, fontSize: rs.sm }}>👀 보기</Text>
          </Pressable>
          <Pressable
            className="flex-1 py-3 rounded-xl items-center active:opacity-80"
            style={{ backgroundColor: Colors.surface }}
            onPress={() => handleEditOpen(item)}
          >
            <Text className="font-bold" style={{ color: Colors.text2, fontSize: rs.sm }}>✏️ 편집</Text>
          </Pressable>
          <Pressable
            className="py-3 px-4 rounded-xl items-center active:opacity-80"
            style={{ backgroundColor: Colors.dangerSoft }}
            onPress={() => handleDelete(item)}
          >
            <Text className="font-bold" style={{ color: Colors.dangerText, fontSize: rs.sm }}>🗑️</Text>
          </Pressable>
        </View>
      </View>
    ),
    [router, rs, handleViewOpen, handleEditOpen, handleDelete]
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.bg }} edges={["bottom"]}>
      {/* 필터 */}
      <View
        className="px-6 py-3 flex-row gap-3"
        style={{ backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}
      >
        <View className="flex-1">
          <PickerSelect
            label="학년"
            value={filterGrade}
            options={[{ label: "전체", value: 0 }, ...gradeOptions]}
            onSelect={(v) => setFilterGrade(v as number)}
          />
        </View>
        <Pressable
          className="bg-primary rounded-2xl px-5 items-center justify-center self-end active:opacity-80"
          style={{ height: rs.buttonH }}
          onPress={() => setShowCreate(true)}
        >
          <Text className="text-white font-bold" style={{ fontSize: rs.sm }}>+ 새 팀</Text>
        </Pressable>
      </View>

      <View className="px-6 py-2.5">
        <Text className="text-sm" style={{ color: Colors.text2 }}>
          {filterGrade === 0 ? "전체" : `${filterGrade}학년`} · {filteredTeams.length}개 팀
        </Text>
      </View>

      {/* 목록 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredTeams.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: Colors.surface }}>
            <Text style={{ fontSize: 36 }}>📋</Text>
          </View>
          <Text style={{ color: Colors.text2, fontSize: rs.sm }}>저장된 팀이 없습니다</Text>
          <Pressable
            className="bg-primary rounded-2xl px-6 py-3 mt-4 active:opacity-80"
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
        <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
          <View className="px-6 py-4 flex-row items-center justify-between" style={{ backgroundColor: Colors.headerBg, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <Text className="text-xl font-bold" style={{ color: Colors.text1 }}>새 팀 만들기</Text>
            <Pressable onPress={resetCreateModal} hitSlop={16} className="p-2">
              <Text className="text-lg" style={{ color: Colors.text2 }}>✕</Text>
            </Pressable>
          </View>

          {createStep === "result" && result ? (
            <>
              <ScrollView className="flex-1 px-6 pt-4">
                <View className="rounded-2xl p-5 mb-4 items-center" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                  <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>균형 점수</Text>
                  <Text
                    className="text-5xl font-bold"
                    style={{
                      color: result.balanceScore >= 80
                        ? Colors.primary
                        : result.balanceScore >= 60
                          ? Colors.warning
                          : Colors.danger,
                    }}
                  >
                    {result.balanceScore}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: Colors.text3 }}>
                    {result.balanceScore >= 80
                      ? "매우 균형적입니다!"
                      : result.balanceScore >= 60
                        ? "적정 수준입니다"
                        : "불균형 - 재배정을 추천합니다"}
                  </Text>
                </View>

                {result.teams.map((team, i) => (
                  <View key={team.teamName} className="rounded-2xl p-5 mb-3" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
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
                      <Text className="font-bold flex-1" style={{ color: Colors.text1, fontSize: rs.md }}>
                        {team.teamName}
                      </Text>
                      <Text className="text-sm" style={{ color: Colors.text2 }}>
                        평균 {team.averageScore.toFixed(1)} · 남{team.maleCount} 여
                        {team.femaleCount}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {team.members.map((m) => {
                        const full = studentMap.get(m.id);
                        return (
                          <View
                            key={m.id}
                            style={{ backgroundColor: m.gender === "M" ? Colors.male : Colors.female }}
                            className={`rounded-xl items-center ${rs.isTablet ? "px-3 py-2" : "px-2.5 py-1.5"}`}
                          >
                            <Text
                              className="font-bold"
                              style={{ color: Colors.text1, fontSize: rs.md }}
                            >
                              {m.name}
                            </Text>
                            {full?.runningRecord != null && (
                              <Text
                                className={`mt-0.5 ${rs.isTablet ? "text-sm" : "text-xs"}`}
                                style={{ color: Colors.text2 }}
                              >
                                🏃 {full.runningRecord}초
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View
                className="flex-row gap-3 px-6 py-4"
                style={{
                  backgroundColor: Colors.card,
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  paddingBottom: Platform.OS === "android" ? insets.bottom + 16 : undefined,
                }}
              >
                <Pressable
                  className="flex-1 py-4 rounded-xl items-center"
                  style={{ backgroundColor: Colors.surface }}
                  onPress={() => {
                    setResult(null);
                    setCreateStep("config");
                  }}
                >
                  <Text className="font-bold" style={{ color: Colors.text2, fontSize: rs.sm }}>재배정</Text>
                </Pressable>
                <Pressable
                  className="flex-1 py-4 rounded-xl bg-primary items-center"
                  onPress={handleSave}
                >
                  <Text className="font-bold text-white" style={{ fontSize: rs.sm }}>저장</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ScrollView className="flex-1 px-6 pt-4">
                <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                  <Text className="font-bold mb-3" style={{ color: Colors.text1, fontSize: rs.sm }}>
                    팀 이름 (선택)
                  </Text>
                  <TextInput
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: rs.inputFs,
                      backgroundColor: Colors.inputBg,
                      borderWidth: 1,
                      borderColor: Colors.inputBorder,
                      color: Colors.text1,
                    }}
                    placeholder="예: 피구, 체육대회, 수업용"
                    placeholderTextColor={Colors.placeholder}
                    value={label}
                    onChangeText={setLabel}
                  />
                </View>

                <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                  <Text className="font-bold mb-3" style={{ color: Colors.text1, fontSize: rs.sm }}>
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

                <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                  <Text className="font-bold mb-3" style={{ color: Colors.text1, fontSize: rs.sm }}>
                    팀 수{mode === "separate" ? ` (실제 ${teamCount * 2}팀: 남${teamCount} + 여${teamCount})` : ""}
                  </Text>
                  <View className="flex-row gap-3">
                    {(mode === "separate" ? separateTeamCountOptions : mixedTeamCountOptions).map((opt) => (
                      <Pressable
                        key={opt.value}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          teamCount === opt.value ? "bg-primary" : ""
                        }`}
                        style={teamCount !== opt.value ? { backgroundColor: Colors.pillBg } : undefined}
                        onPress={() => setTeamCount(opt.value)}
                      >
                        <Text
                          className="font-bold"
                          style={{ color: teamCount === opt.value ? '#fff' : Colors.pillText, fontSize: rs.sm }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                  <Text className="font-bold mb-3" style={{ color: Colors.text1, fontSize: rs.sm }}>
                    성별 구성
                  </Text>
                  <View className="flex-row gap-3">
                    {modeOptions.map((opt) => (
                      <Pressable
                        key={opt.value}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          mode === opt.value ? "bg-primary" : ""
                        }`}
                        style={mode !== opt.value ? { backgroundColor: Colors.pillBg } : undefined}
                        onPress={() => {
                          const newMode = opt.value as "mixed" | "separate";
                          setMode(newMode);
                          if (newMode === "mixed" && teamCount < 2) setTeamCount(2);
                          if (newMode === "separate" && teamCount > 3) setTeamCount(3);
                        }}
                      >
                        <Text
                          className="font-bold"
                          style={{ color: mode === opt.value ? '#fff' : Colors.pillText, fontSize: rs.sm }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View
                className="px-6 py-4"
                style={{
                  backgroundColor: Colors.card,
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                  paddingBottom: Platform.OS === "android" ? insets.bottom + 16 : undefined,
                }}
              >
                <Pressable
                  className="bg-primary rounded-xl py-4 items-center active:scale-[0.97]"
                  onPress={handleAssign}
                >
                  <Text className="font-bold text-white" style={{ fontSize: rs.md }}>
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
        <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
          <View className="px-6 py-4 flex-row items-center justify-between" style={{ backgroundColor: Colors.headerBg, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <Text className="text-xl font-bold" style={{ color: Colors.text1 }}>팀 보기</Text>
            <Pressable onPress={() => setViewTeam(null)} hitSlop={16} className="p-2">
              <Text className="text-lg" style={{ color: Colors.text2 }}>✕</Text>
            </Pressable>
          </View>

          {viewTeam && (
            <ScrollView
              className="flex-1 px-6 pt-4"
              contentContainerStyle={Platform.OS === "android" ? { paddingBottom: insets.bottom + 16 } : undefined}
            >
              {/* 팀 정보 */}
              <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>팀 정보</Text>
                <Text className="font-bold" style={{ color: Colors.text1, fontSize: rs.md }}>
                  {viewTeam.grade}학년 {viewTeam.class}반 · {viewTeam.teamCount}팀 ·{" "}
                  {viewTeam.teamType === "mixed" ? "혼성" : "성별분리"}
                </Text>
                {viewTeam.label ? (
                  <View className="self-start px-2.5 py-0.5 rounded-lg mt-2" style={{ backgroundColor: Colors.warningSoft }}>
                    <Text className="text-sm font-bold" style={{ color: Colors.warningText }}>{viewTeam.label}</Text>
                  </View>
                ) : null}
                <Text className="text-xs mt-2" style={{ color: Colors.text3 }}>
                  생성일: {viewTeam.createdAt.split(" ")[0]}
                </Text>
              </View>

              {/* 팀원 목록 */}
              {viewLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : viewMembers.length === 0 ? (
                <View className="rounded-2xl p-5 mb-3 items-center" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                  <Text className="text-2xl mb-2">👥</Text>
                  <Text className="text-sm text-center" style={{ color: Colors.text2 }}>
                    팀원 정보가 없습니다.{"\n"}편집 → 팀 재배정으로 팀원을 배정해주세요.
                  </Text>
                </View>
              ) : (
                groupByTeamName(viewMembers).map((group, i) => (
                  <View key={group.teamName} className="rounded-2xl p-5 mb-3" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                    {/* 팀 헤더 */}
                    <View className="flex-row items-center mb-4">
                      <View
                        style={{
                          backgroundColor: DOT_COLORS[i % DOT_COLORS.length],
                          width: 16, height: 16, borderRadius: 8, marginRight: 10,
                        }}
                      />
                      <Text className="font-bold flex-1" style={{ color: Colors.text1, fontSize: rs.md }}>
                        {group.teamName}
                      </Text>
                      <Text style={{ color: Colors.text2, fontSize: rs.sm }}>
                        {group.members.filter(m => m.gender === "M").length}남{" "}
                        {group.members.filter(m => m.gender === "F").length}여
                      </Text>
                    </View>
                    {/* 멤버 칩 */}
                    <View className="flex-row flex-wrap gap-2">
                      {group.members.map((m) => (
                        <View
                          key={m.id}
                          style={{ backgroundColor: m.gender === "M" ? Colors.male : Colors.female }}
                          className={`rounded-xl items-center ${rs.isTablet ? "px-3 py-2" : "px-2.5 py-1.5"}`}
                        >
                          <Text
                            className="font-bold"
                            style={{ color: Colors.text1, fontSize: rs.md }}
                          >
                            {m.studentName}
                          </Text>
                          {m.runningRecord != null && (
                            <Text
                              className={`mt-0.5 ${rs.isTablet ? "text-sm" : "text-xs"}`}
                              style={{ color: Colors.text2 }}
                            >
                              {m.runningRecord}초
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
                className="rounded-xl py-4 items-center mb-8"
                style={{ backgroundColor: Colors.primarySoft }}
                onPress={() => {
                  setViewTeam(null);
                  router.push(`/teams/${viewTeam.id}`);
                }}
              >
                <Text className="font-bold" style={{ color: Colors.primary, fontSize: rs.sm }}>📋 경기용 명단 보기</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ========== 편집 모달 ========== */}
      <Modal visible={editTeam != null} animationType="slide">
        <View className="flex-1" style={{ backgroundColor: Colors.bg, paddingTop: insets.top }}>
          <View className="px-6 py-4 flex-row items-center justify-between" style={{ backgroundColor: Colors.headerBg, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <Text className="text-xl font-bold" style={{ color: Colors.text1 }}>팀 편집</Text>
            <Pressable
              onPress={() => {
                if (manualSwappedIds.length > 0 || swapResult) {
                  Alert.alert("편집 취소", "저장하지 않은 교체가 있습니다. 나가시겠습니까?", [
                    { text: "계속 편집", style: "cancel" },
                    { text: "나가기", style: "destructive", onPress: () => {
                      setManualSwapMode(false);
                      setSelectedForSwap(null);
                      setManualSwappedIds([]);
                      setManualSwapCount(0);
                      setSwapResult(null);
                      setEditTeam(null);
                    }},
                  ]);
                } else {
                  setEditTeam(null);
                }
              }}
              hitSlop={16}
              className="p-2"
            >
              <Text className="text-lg" style={{ color: Colors.text2 }}>✕</Text>
            </Pressable>
          </View>

          {editTeam && (
            <ScrollView
              className="flex-1 px-6 pt-4"
              contentContainerStyle={Platform.OS === "android" ? { paddingBottom: insets.bottom + 16 } : undefined}
            >
              {/* 팀 정보 */}
              <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                <Text className="text-sm mb-1" style={{ color: Colors.text2 }}>팀 정보</Text>
                <Text className="font-bold" style={{ color: Colors.text1, fontSize: rs.md }}>
                  {editTeam.grade}학년 {editTeam.class}반 · {editTeam.teamCount}팀 ·{" "}
                  {editTeam.teamType === "mixed" ? "혼성" : "성별분리"}
                </Text>
                <Text className="text-xs mt-1" style={{ color: Colors.text3 }}>
                  생성일: {editTeam.createdAt.split(" ")[0]}
                </Text>
              </View>

              {/* 팀원 구성 */}
              <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold" style={{ color: Colors.text1, fontSize: rs.sm }}>
                    {manualSwapMode ? "👆 수동 교체 모드" : swapResult ? "🔄 교체 미리보기" : "현재 팀원 구성"}
                  </Text>
                  {(swapResult || manualSwappedIds.length > 0) && (
                    <View className="flex-row items-center gap-1.5">
                      <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: Colors.swappedBorder }} />
                      <Text className="text-xs" style={{ color: Colors.text2 }}>교체된 인원</Text>
                    </View>
                  )}
                </View>

                {/* 수동 교체 안내 */}
                {manualSwapMode && (
                  <View className="rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: Colors.primarySoft }}>
                    <Text className="text-sm font-bold" style={{ color: Colors.primary }}>
                      {selectedForSwap
                        ? `✓ ${selectedForSwap.studentName} 선택됨 — 다른 팀 학생을 탭하세요`
                        : "교체할 첫 번째 학생을 탭하세요"}
                    </Text>
                    {manualSwappedIds.length > 0 && (
                      <Text className="text-xs mt-1" style={{ color: Colors.text2 }}>
                        균형 점수: {calcBalance(editMembers)}점 · {manualSwapCount}회 교체
                      </Text>
                    )}
                  </View>
                )}

                {editMembersLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : editMembers.length === 0 ? (
                  <Text className="text-sm text-center py-3" style={{ color: Colors.text2 }}>
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
                        <Text className="font-bold flex-1" style={{ color: Colors.text1, fontSize: rs.md }}>{group.teamName}</Text>
                        <Text style={{ color: Colors.text2, fontSize: rs.sm }}>
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
                          const isSwapped = (swapResult?.swappedIds.includes(m.studentId) ?? false)
                            || manualSwappedIds.includes(m.studentId);
                          const isSelected = manualSwapMode && selectedForSwap?.studentId === m.studentId;

                          const chipContent = (
                            <View
                              style={{
                                backgroundColor: isSelected
                                  ? Colors.successSoft
                                  : isSwapped
                                    ? Colors.swapped
                                    : m.gender === "M" ? Colors.male : Colors.female,
                                borderWidth: isSelected ? 2 : isSwapped ? 1.5 : 0,
                                borderColor: isSelected
                                  ? Colors.success
                                  : isSwapped
                                    ? Colors.swappedBorder
                                    : "transparent",
                              }}
                              className={`rounded-xl items-center ${rs.isTablet ? "px-3 py-2" : "px-2.5 py-1.5"}`}
                            >
                              <Text
                                className="font-bold"
                                style={{
                                  color: isSelected ? Colors.success : isSwapped ? Colors.swappedText : Colors.text1,
                                  fontSize: rs.md,
                                }}
                              >
                                {isSwapped && !isSelected ? "★ " : ""}{m.studentName}
                              </Text>
                              {m.runningRecord != null && (
                                <Text
                                  className={`mt-0.5 ${rs.isTablet ? "text-sm" : "text-xs"}`}
                                  style={{ color: Colors.text2 }}
                                >
                                  {m.runningRecord}초
                                </Text>
                              )}
                            </View>
                          );

                          return manualSwapMode ? (
                            <Pressable
                              key={m.id}
                              onPress={() => handleManualSwapSelect(m)}
                            >
                              {chipContent}
                            </Pressable>
                          ) : (
                            <View key={m.id}>{chipContent}</View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}

                {/* 교체 결과 균형 점수 */}
                {swapResult && (
                  <View className="mt-3 pt-3 flex-row items-center justify-center gap-3" style={{ borderTopWidth: 1, borderTopColor: Colors.border }}>
                    <Text className="text-sm" style={{ color: Colors.text2 }}>
                      균형 점수
                    </Text>
                    <Text className="text-sm font-bold" style={{ color: Colors.text3 }}>
                      {swapResult.balanceBefore}점
                    </Text>
                    <Text className="text-sm" style={{ color: Colors.text3 }}>→</Text>
                    <Text
                      className="text-lg font-bold"
                      style={{
                        color: swapResult.balanceAfter >= swapResult.balanceBefore
                          ? Colors.primary
                          : Colors.danger,
                      }}
                    >
                      {swapResult.balanceAfter}점
                    </Text>
                    {swapResult.swappedIds.length === 0 && (
                      <Text className="text-xs" style={{ color: Colors.text3 }}>(이미 최적)</Text>
                    )}
                  </View>
                )}

                {/* 교체 버튼 영역 */}
                <View className="mt-4 pt-4 gap-3" style={{ borderTopWidth: 1, borderTopColor: Colors.border }}>
                  {manualSwapMode ? (
                    <>
                      <Pressable
                        className="bg-primary rounded-xl py-3.5 items-center active:scale-[0.97]"
                        onPress={handleManualSwapSave}
                        disabled={manualSwappedIds.length === 0}
                        style={manualSwappedIds.length === 0 ? { opacity: 0.5 } : undefined}
                      >
                        <Text className="font-bold text-white" style={{ fontSize: rs.sm }}>
                          ✅ 수동 교체 저장
                        </Text>
                      </Pressable>
                      <Pressable
                        className="rounded-xl py-3.5 items-center active:opacity-80"
                        style={{ backgroundColor: Colors.surface }}
                        onPress={exitManualSwapMode}
                      >
                        <Text className="font-bold" style={{ color: Colors.text2, fontSize: rs.sm }}>
                          ✕ 취소 (원래대로)
                        </Text>
                      </Pressable>
                    </>
                  ) : swapResult ? (
                    <>
                      <Pressable
                        className="bg-primary rounded-xl py-3.5 items-center active:scale-[0.97]"
                        onPress={handleSaveSwap}
                      >
                        <Text className="font-bold text-white" style={{ fontSize: rs.sm }}>
                          ✅ 교체 결과 저장
                        </Text>
                      </Pressable>
                      <View className="flex-row gap-3">
                        <Pressable
                          className="flex-1 rounded-xl py-3.5 items-center active:scale-[0.97]"
                          style={{ backgroundColor: Colors.warning }}
                          onPress={handleReassign}
                        >
                          <Text className="font-bold" style={{ color: Colors.bg, fontSize: rs.sm }}>
                            🔄 다시 교체
                          </Text>
                        </Pressable>
                        <Pressable
                          className="flex-1 rounded-xl py-3.5 items-center active:opacity-80"
                          style={{ backgroundColor: Colors.surface }}
                          onPress={async () => {
                            setSwapResult(null);
                            setEditMembersLoading(true);
                            const members = await getTeamMembers(db, editTeam.id);
                            setEditMembers(members);
                            setEditMembersLoading(false);
                          }}
                        >
                          <Text className="font-bold" style={{ color: Colors.text2, fontSize: rs.sm }}>
                            ✕ 취소
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <View className="flex-row gap-3">
                      <Pressable
                        className="flex-1 rounded-xl py-3.5 items-center active:scale-[0.97]"
                        style={{ backgroundColor: Colors.warning }}
                        onPress={handleReassign}
                        disabled={editMembers.length === 0}
                      >
                        <Text className="font-bold" style={{ color: Colors.bg, fontSize: rs.sm }}>
                          🔄 임의교체
                        </Text>
                      </Pressable>
                      <Pressable
                        className="flex-1 rounded-xl py-3.5 items-center active:scale-[0.97]"
                        style={{ backgroundColor: Colors.surface }}
                        onPress={() => setManualSwapMode(true)}
                        disabled={editMembers.length === 0}
                      >
                        <Text className="font-bold" style={{ color: Colors.text1, fontSize: rs.sm }}>
                          👆 수동 교체
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              {/* 팀 이름 편집 */}
              <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
                <Text className="font-bold mb-3" style={{ color: Colors.text1, fontSize: rs.sm }}>
                  팀 이름
                </Text>
                <TextInput
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: rs.inputFs,
                    backgroundColor: Colors.inputBg,
                    borderWidth: 1,
                    borderColor: Colors.inputBorder,
                    color: Colors.text1,
                  }}
                  placeholder="예: 피구, 체육대회, 수업용"
                  placeholderTextColor={Colors.placeholder}
                  value={editLabel}
                  onChangeText={setEditLabel}
                />
                <Pressable
                  className="bg-primary rounded-xl py-3.5 items-center active:scale-[0.97] mt-4"
                  onPress={handleEditSave}
                >
                  <Text className="font-bold text-white" style={{ fontSize: rs.sm }}>
                    💾 팀 이름 저장
                  </Text>
                </Pressable>
              </View>

              <View className="mb-8" />
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
