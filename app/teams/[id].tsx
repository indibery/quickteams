import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { useTeamStore } from "@/stores/teamStore";

// 팀 색상 6개 (다양한 색상으로 시각적 구분)
const TEAM_STYLES = [
  { bg: "#3B82F6", text: "#FFFFFF", light: "#DBEAFE" }, // 파랑
  { bg: "#EF4444", text: "#FFFFFF", light: "#FEE2E2" }, // 빨강
  { bg: "#10B981", text: "#FFFFFF", light: "#D1FAE5" }, // 초록
  { bg: "#F59E0B", text: "#FFFFFF", light: "#FEF3C7" }, // 앰버
  { bg: "#8B5CF6", text: "#FFFFFF", light: "#EDE9FE" }, // 보라
  { bg: "#EC4899", text: "#FFFFFF", light: "#FCE7F3" }, // 핑크
];

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { currentTeam, currentMembers, isLoading, loadTeamDetail } =
    useTeamStore();

  useEffect(() => {
    if (id) loadTeamDetail(db, parseInt(id, 10));
  }, [id]);

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // 아이패드: 큰 글씨 5열, 아이폰: 작은 글씨 4열
  const cols = isTablet ? 5 : 4;
  const colWidth = `${Math.floor(100 / cols)}%`;
  const nameFontSize = isTablet ? 32 : 18;
  const genderFontSize = isTablet ? 16 : 12;
  const headerFontSize = isTablet ? 22 : 16;
  const infoFontSize = isTablet ? 24 : 18;
  const badgeFontSize = isTablet ? 18 : 14;

  if (isLoading || !currentTeam) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  // 팀별로 멤버 그룹핑
  const teamNames = [...new Set(currentMembers.map((m) => m.teamName))].sort();
  const grouped = teamNames.map((name) => ({
    name,
    members: currentMembers.filter((m) => m.teamName === name),
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 pt-4">
        {/* 팀 정보 헤더 */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-sky">
          <View className="flex-row items-center gap-3 flex-wrap">
            <Text style={{ fontSize: infoFontSize }} className="font-bold text-secondary">
              {currentTeam.grade}학년 {currentTeam.class}반
            </Text>
            <View className="bg-sky px-3 py-1.5 rounded-lg">
              <Text style={{ fontSize: badgeFontSize }} className="font-bold text-primary">
                {currentTeam.teamCount}팀 · {currentTeam.teamType === "mixed" ? "혼성" : "성별분리"}
              </Text>
            </View>
            <View className="bg-sky px-3 py-1.5 rounded-lg">
              <Text style={{ fontSize: badgeFontSize }} className="font-bold text-primary">
                총 {currentMembers.length}명
              </Text>
            </View>
          </View>
        </View>

        {/* 팀별 멤버 — 아이들에게 보여줄 명단 */}
        {grouped.map((group, i) => {
          const style = TEAM_STYLES[i % TEAM_STYLES.length];
          const males = group.members.filter((m) => m.gender === "M").length;
          const females = group.members.filter((m) => m.gender === "F").length;

          return (
            <View key={group.name} className="bg-white rounded-2xl mb-4 overflow-hidden">
              {/* 팀 헤더 — 색상 바 */}
              <View
                style={{ backgroundColor: style.bg }}
                className="px-5 py-4 flex-row items-center justify-between"
              >
                <Text
                  style={{ color: style.text, fontSize: headerFontSize }}
                  className="font-bold"
                >
                  {group.name}
                </Text>
                <View className="flex-row items-center gap-3">
                  <View className="bg-white/25 rounded-full px-3 py-1">
                    <Text style={{ color: style.text, fontSize: genderFontSize }} className="font-bold">
                      👦 {males}명
                    </Text>
                  </View>
                  <View className="bg-white/25 rounded-full px-3 py-1">
                    <Text style={{ color: style.text, fontSize: genderFontSize }} className="font-bold">
                      👧 {females}명
                    </Text>
                  </View>
                  <View className="bg-white/30 rounded-full px-3 py-1">
                    <Text style={{ color: style.text, fontSize: genderFontSize }} className="font-bold">
                      총 {group.members.length}명
                    </Text>
                  </View>
                </View>
              </View>

              {/* 멤버 그리드 — 태블릿 5열 / 폰 4열 */}
              <View className="flex-row flex-wrap px-2 py-3">
                {group.members.map((m) => (
                  <View
                    key={m.id}
                    style={{ width: colWidth as any }}
                    className="p-1"
                  >
                    <View
                      style={{ backgroundColor: style.light }}
                      className="rounded-xl py-3 px-1 items-center"
                    >
                      <Text
                        style={{ fontSize: genderFontSize, color: style.bg }}
                        className="font-bold"
                      >
                        {m.gender === "M" ? "남" : "여"}
                      </Text>
                      <Text
                        style={{ fontSize: nameFontSize }}
                        className="font-bold text-secondary"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {m.studentName}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 하단 버튼 */}
      <View className="px-6 py-4 bg-white border-t border-gray-100">
        <Pressable
          className="py-4 rounded-xl bg-sunny items-center active:opacity-80"
          onPress={() => router.push(`/game/scoreboard/${id}`)}
        >
          <Text style={{ fontSize: isTablet ? 20 : 16 }} className="font-bold text-secondary">
            🏆 점수판
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
