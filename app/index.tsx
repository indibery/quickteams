import { View, Text, Pressable } from "react-native";
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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.bg }}>
      <View className="flex-1 px-6 pt-6">
        {/* 헤더 */}
        <Text
          className="text-xs font-semibold tracking-widest mb-2"
          style={{ color: Colors.text3, letterSpacing: 2 }}
        >
          SPORTS TEAM MAKER
        </Text>
        <Text style={{ fontSize: 36, lineHeight: 44 }} className="font-black mb-2">
          <Text style={{ color: Colors.text1 }}>바로</Text>
          <Text style={{ color: Colors.primary }}>팀</Text>
        </Text>
        <Text className="text-tablet-sm mb-8" style={{ color: Colors.text2 }}>
          달리기 기록으로 공정하게 팀을 만들어요
        </Text>

        {/* 섹션 라벨 */}
        <Text
          className="text-sm font-semibold mb-4"
          style={{ color: Colors.text3, letterSpacing: 1 }}
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
                className="rounded-2xl p-5 active:scale-[0.97]"
                style={{
                  backgroundColor: Colors.card,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  ...accentLine(item.accent),
                }}
                onPress={() => router.push(item.href as any)}
              >
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mb-4"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                </View>
                <Text className="text-tablet-md font-bold" style={{ color: Colors.text1 }}>
                  {item.title}
                </Text>
                <Text className="text-sm mt-1" style={{ color: Colors.text2 }}>
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
            className="rounded-2xl px-5 py-4 flex-row items-center active:scale-[0.97]"
            style={{
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.border,
              ...accentLine(settingsItem.accent),
            }}
            onPress={() => router.push(settingsItem.href as any)}
          >
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
              style={{ backgroundColor: settingsItem.iconBg }}
            >
              <Text style={{ fontSize: 24 }}>{settingsItem.emoji}</Text>
            </View>
            <View>
              <Text className="text-tablet-md font-bold" style={{ color: Colors.text1 }}>
                {settingsItem.title}
              </Text>
              <Text className="text-sm mt-0.5" style={{ color: Colors.text2 }}>
                {settingsItem.subtitle}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
