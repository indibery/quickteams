import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTeamStore } from "@/stores/teamStore";
import type { Team } from "@/lib/types";
import PickerSelect from "@/components/common/PickerSelect";
import { Colors } from "@/constants/theme";
import AnimatedCard from "@/components/common/AnimatedCard";

const gradeOptions = [
  { label: "전체", value: 0 },
  ...Array.from({ length: 6 }, (_, i) => ({
    label: `${i + 1}학년`,
    value: i + 1,
  })),
];

export default function TeamsListScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { teams, isLoading, loadTeamsByGrade, loadAllTeams } = useTeamStore();
  const [grade, setGrade] = useState(0);

  useEffect(() => {
    if (grade === 0) {
      loadAllTeams(db);
    } else {
      loadTeamsByGrade(db, grade);
    }
  }, [grade]);

  const renderTeam = ({ item, index }: { item: Team; index: number }) => (
    <AnimatedCard index={index}>
    <Pressable
      className="rounded-2xl p-5 mb-3 active:scale-[0.98]"
      style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
      onPress={() => router.push(`/teams/${item.id}`)}
    >
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-3 flex-wrap">
          <Text style={{ fontSize: 24, color: Colors.text1 }} className="font-bold">
            {item.grade}학년 {item.class}반
          </Text>
          <View className="px-3 py-1 rounded-xl" style={{ backgroundColor: Colors.primarySoft }}>
            <Text style={{ fontSize: 18, color: Colors.primary }} className="font-bold">
              {item.teamCount}팀 · {item.teamType === "mixed" ? "혼성" : "성별분리"}
            </Text>
          </View>
          {item.label ? (
            <View className="px-2.5 py-0.5 rounded-xl" style={{ backgroundColor: Colors.warningSoft }}>
              <Text style={{ fontSize: 14, color: Colors.warningText }} className="font-bold">
                {item.label}
              </Text>
            </View>
          ) : null}
          <Text className="text-xs" style={{ color: Colors.text3 }}>
            {item.createdAt.split(" ")[0]}
          </Text>
        </View>
        <Text className="text-xl" style={{ color: Colors.text3 }}>›</Text>
      </View>
    </Pressable>
    </AnimatedCard>
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
            value={grade}
            options={gradeOptions}
            onSelect={(v) => setGrade(v as number)}
          />
        </View>
      </View>

      <View className="px-6 py-2.5">
        <Text className="text-sm" style={{ color: Colors.text2 }}>
          {grade === 0 ? "전체" : `${grade}학년`} · {teams.length}개 팀
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : teams.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: Colors.surface }}>
            <Text style={{ fontSize: 36 }}>📋</Text>
          </View>
          <Text className="text-tablet-sm" style={{ color: Colors.text2 }}>
            저장된 팀이 없습니다
          </Text>
          <Pressable
            className="bg-primary rounded-2xl px-6 py-3 mt-4 active:opacity-80"
            onPress={() => router.push("/teams/new")}
          >
            <Text className="text-white font-bold">새 팀 만들기</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTeam}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}
