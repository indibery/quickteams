import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { useTeamStore } from "@/stores/teamStore";
import { Colors, TEAM_STYLES } from "@/constants/theme";

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

  // 아이패드: 큰 글씨 4열, 아이폰: 3열
  const cols = isTablet ? 4 : 3;
  const colWidth = isTablet ? "25%" : "33%";
  const nameFontSize = isTablet ? 37 : 26;
  const genderFontSize = isTablet ? 18 : 12;
  const headerFontSize = isTablet ? 26 : 16;
  const infoFontSize = isTablet ? 28 : 18;
  const badgeFontSize = isTablet ? 20 : 14;

  if (isLoading || !currentTeam) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.bg }} edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 pt-4">
        {/* 팀 정보 헤더 */}
        <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.primary }}>
          <View className="flex-row items-center gap-3 flex-wrap">
            <Text style={{ fontSize: infoFontSize, color: Colors.text1 }} className="font-bold">
              {currentTeam.grade}학년 {currentTeam.class}반
            </Text>
            <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: Colors.primarySoft }}>
              <Text style={{ fontSize: badgeFontSize, color: Colors.primary }} className="font-bold">
                {currentTeam.teamCount}팀 · {currentTeam.teamType === "mixed" ? "혼성" : "성별분리"}
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: Colors.primarySoft }}>
              <Text style={{ fontSize: badgeFontSize, color: Colors.primary }} className="font-bold">
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
            <View key={group.name} className="rounded-2xl mb-4 overflow-hidden" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}>
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

              {/* 멤버 그리드 — 태블릿 4열 / 폰 3열 */}
              <View className="flex-row flex-wrap px-2 py-3">
                {group.members.map((m) => (
                  <View
                    key={m.id}
                    style={{ width: colWidth as any }}
                    className="p-1"
                  >
                    <View
                      style={{
                        backgroundColor: m.gender === "M" ? `${style.bg}1F` : `${style.bg}40`,
                        minHeight: isTablet ? 64 : 48,
                      }}
                      className="rounded-xl py-2.5 px-2 flex-row items-center justify-center"
                    >
                      <Text style={{ fontSize: nameFontSize * 0.7, marginRight: 4 }}>
                        {m.gender === "M" ? "👦" : "👧"}
                      </Text>
                      <Text
                        style={{ fontSize: nameFontSize, color: Colors.text1 }}
                        className="font-bold"
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
      <View className="px-6 py-4" style={{ backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <Pressable
          className="py-4 rounded-xl items-center active:opacity-80"
          style={{ backgroundColor: Colors.warning }}
          onPress={() => router.push(`/game/scoreboard/${id}`)}
        >
          <Text style={{ fontSize: isTablet ? 20 : 16, color: Colors.bg }} className="font-bold">
            🏆 점수판
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
