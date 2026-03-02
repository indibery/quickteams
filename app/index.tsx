import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors, accentLine } from "@/constants/theme";

type MenuItem = {
  title: string;
  subtitle: string;
  emoji: string;
  href: string;
  accent: string;
  iconBg: string;
};

const gridItems: MenuItem[] = [
  {
    title: "학생 관리",
    subtitle: "데이터 입력 · 편집",
    emoji: "📝",
    href: "/students",
    accent: Colors.accentStudents,
    iconBg: Colors.primarySoft,
  },
  {
    title: "팀 관리",
    subtitle: "생성 · 편집 · 삭제",
    emoji: "👥",
    href: "/teams/new",
    accent: Colors.accentTeams,
    iconBg: "rgba(139,92,246,0.15)",
  },
  {
    title: "경기 시작",
    subtitle: "팀 선택 · 점수판",
    emoji: "🏆",
    href: "/teams",
    accent: Colors.accentGame,
    iconBg: Colors.warningSoft,
  },
  {
    title: "기록 보기",
    subtitle: "경기 기록 · 통계",
    emoji: "📊",
    href: "/records",
    accent: Colors.accentRecords,
    iconBg: Colors.successSoft,
  },
];

const settingsItem: MenuItem = {
  title: "설정",
  subtitle: "데이터 관리 · 일괄 입력",
  emoji: "⚙️",
  href: "/settings",
  accent: Colors.accentSettings,
  iconBg: "rgba(75,85,99,0.15)",
};

export default function MainScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // iPad: 더 큰 아이콘·폰트·패딩
  const iconSize = isTablet ? 72 : 48;
  const iconFontSize = isTablet ? 36 : 24;
  const iconRadius = isTablet ? 20 : 16;
  const cardPadding = isTablet ? 28 : 20;
  const titleSize = isTablet ? 24 : 20;
  const subtitleSize = isTablet ? 16 : 14;
  const settingsIconMr = isTablet ? 20 : 16;
  const headerSize = isTablet ? 64 : 36;
  const headerLineHeight = isTablet ? 76 : 44;
  const labelSize = isTablet ? 20 : 12;
  const sloganSize = isTablet ? 22 : 14;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.bg }}>
      <View
        className="flex-1 px-6"
        style={{ paddingTop: isTablet ? 48 : 24 }}
      >
        {/* iPad: 중앙 정렬 + maxWidth */}
        <View style={isTablet ? { maxWidth: 600, alignSelf: "center", width: "100%" } : undefined}>
          {/* 헤더 */}
          <Text
            className="font-semibold tracking-widest mb-2"
            style={{ color: Colors.text3, letterSpacing: 2, fontSize: labelSize }}
          >
            SPORTS TEAM MAKER
          </Text>
          <Text style={{ fontSize: headerSize, lineHeight: headerLineHeight }} className="font-black mb-2">
            <Text style={{ color: Colors.text1 }}>바로</Text>
            <Text style={{ color: Colors.primary }}>팀</Text>
          </Text>
          <Text style={{ color: Colors.text2, fontSize: sloganSize, marginBottom: isTablet ? 48 : 32 }}>
            달리기 기록으로 공정하게 팀을 만들어요
          </Text>

          {/* 섹션 라벨 */}
          <Text
            className="font-semibold mb-4"
            style={{ color: Colors.text3, letterSpacing: 1, fontSize: isTablet ? 20 : 14 }}
          >
            빠른 시작
          </Text>

          {/* 2×2 그리드 */}
          <View className="flex-row flex-wrap gap-4 mb-4">
            {gridItems.map((item, index) => (
              <Animated.View
                key={item.href}
                entering={FadeInDown.delay(index * 100).duration(400).springify()}
                className="flex-1 basis-[45%] min-w-[140px]"
              >
                <Pressable
                  className="rounded-2xl active:scale-[0.97]"
                  style={{
                    backgroundColor: Colors.card,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    padding: cardPadding,
                    ...accentLine(item.accent),
                  }}
                  onPress={() => router.push(item.href as any)}
                >
                  <View
                    className="items-center justify-center"
                    style={{
                      width: iconSize,
                      height: iconSize,
                      borderRadius: iconRadius,
                      backgroundColor: item.iconBg,
                      marginBottom: isTablet ? 20 : 16,
                    }}
                  >
                    <Text style={{ fontSize: iconFontSize }}>{item.emoji}</Text>
                  </View>
                  <Text className="font-bold" style={{ color: Colors.text1, fontSize: titleSize }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: Colors.text2, fontSize: subtitleSize, marginTop: 4 }}>
                    {item.subtitle}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {/* 설정 카드 — 가로 레이아웃 */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400).springify()}
          >
            <Pressable
              className="rounded-2xl flex-row items-center active:scale-[0.97]"
              style={{
                backgroundColor: Colors.card,
                borderWidth: 1,
                borderColor: Colors.border,
                paddingHorizontal: cardPadding,
                paddingVertical: isTablet ? 20 : 16,
                ...accentLine(settingsItem.accent),
              }}
              onPress={() => router.push(settingsItem.href as any)}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconRadius,
                  backgroundColor: settingsItem.iconBg,
                  marginRight: settingsIconMr,
                }}
              >
                <Text style={{ fontSize: iconFontSize }}>{settingsItem.emoji}</Text>
              </View>
              <View>
                <Text className="font-bold" style={{ color: Colors.text1, fontSize: titleSize }}>
                  {settingsItem.title}
                </Text>
                <Text style={{ color: Colors.text2, fontSize: subtitleSize, marginTop: 2 }}>
                  {settingsItem.subtitle}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}
