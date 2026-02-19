import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuItem = {
  title: string;
  subtitle: string;
  emoji: string;
  href: string;
  color: string;
};

const menuItems: MenuItem[] = [
  {
    title: "학생 관리",
    subtitle: "학생 데이터 입력 · 편집",
    emoji: "📝",
    href: "/students",
    color: "bg-sky",
  },
  {
    title: "팀 관리",
    subtitle: "생성 · 편집 · 삭제",
    emoji: "👥",
    href: "/teams/new",
    color: "bg-sky",
  },
  {
    title: "경기 시작",
    subtitle: "팀 선택하고 점수판",
    emoji: "🏆",
    href: "/teams",
    color: "bg-sunny/40",
  },
  {
    title: "기록 보기",
    subtitle: "경기 기록 · 통계",
    emoji: "📊",
    href: "/records",
    color: "bg-sky",
  },
  {
    title: "설정",
    subtitle: "데이터 관리 · 일괄 입력",
    emoji: "⚙️",
    href: "/settings",
    color: "bg-gray-100",
  },
];

export default function MainScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <Text className="text-tablet-lg font-bold text-primary mb-2">
          체육 팀짜기
        </Text>
        <Text className="text-tablet-sm text-gray-500 mb-6">
          달리기 기록으로 공정한 팀을 빠르게 만들어보세요
        </Text>

        <View className="flex-row flex-wrap gap-4">
          {menuItems.map((item) => (
            <Pressable
              key={item.href}
              className={`${item.color} rounded-2xl p-6 min-w-[160px] flex-1 basis-[45%] active:opacity-70`}
              onPress={() => router.push(item.href as any)}
            >
              <Text className="text-4xl mb-3">{item.emoji}</Text>
              <Text className="text-tablet-md font-bold text-secondary">
                {item.title}
              </Text>
              <Text className="text-tablet-sm text-gray-600 mt-1">
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
