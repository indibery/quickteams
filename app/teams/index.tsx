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

  const renderTeam = ({ item }: { item: Team }) => (
    <Pressable
      className="bg-white rounded-xl p-5 mb-3 border border-gray-100"
      onPress={() => router.push(`/teams/${item.id}`)}
    >
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-3 flex-wrap">
          <Text style={{ fontSize: 24 }} className="font-bold text-secondary">
            {item.grade}학년 {item.class}반
          </Text>
          <View className="bg-sky px-3 py-1 rounded-lg">
            <Text style={{ fontSize: 18 }} className="font-bold text-primary">
              {item.teamCount}팀 · {item.teamType === "mixed" ? "혼성" : "성별분리"}
            </Text>
          </View>
          {item.label ? (
            <View className="bg-sunny/40 px-2.5 py-0.5 rounded-lg">
              <Text style={{ fontSize: 14 }} className="font-bold text-secondary">
                {item.label}
              </Text>
            </View>
          ) : null}
          <Text className="text-xs text-gray-400">
            {item.createdAt.split(" ")[0]}
          </Text>
        </View>
        <Text className="text-gray-300 text-xl">›</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      {/* 필터 */}
      <View className="bg-white px-6 py-3 flex-row gap-3 border-b border-gray-100">
        <View className="flex-1">
          <PickerSelect
            label="학년"
            value={grade}
            options={gradeOptions}
            onSelect={(v) => setGrade(v as number)}
          />
        </View>
      </View>

      <View className="px-6 py-2">
        <Text className="text-sm text-gray-500">
          {grade === 0 ? "전체" : `${grade}학년`} · {teams.length}개 팀
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : teams.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">📋</Text>
          <Text className="text-tablet-sm text-gray-400">
            저장된 팀이 없습니다
          </Text>
          <Pressable
            className="bg-primary rounded-xl px-6 py-3 mt-4"
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
