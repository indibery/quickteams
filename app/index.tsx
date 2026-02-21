import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuItem = {
  title: string;
  subtitle: string;
  emoji: string;
  href: string;
  bgColor: string;
  accentColor: string;
};

const menuItems: MenuItem[] = [
  {
    title: "학생 관리",
    subtitle: "학생 데이터 입력 · 편집",
    emoji: "📝",
    href: "/students",
    bgColor: "bg-blue-50",
    accentColor: "bg-blue-100",
  },
  {
    title: "팀 관리",
    subtitle: "생성 · 편집 · 삭제",
    emoji: "👥",
    href: "/teams/new",
    bgColor: "bg-indigo-50",
    accentColor: "bg-indigo-100",
  },
  {
    title: "경기 시작",
    subtitle: "팀 선택하고 점수판",
    emoji: "🏆",
    href: "/teams",
    bgColor: "bg-amber-50",
    accentColor: "bg-amber-100",
  },
  {
    title: "기록 보기",
    subtitle: "경기 기록 · 통계",
    emoji: "📊",
    href: "/records",
    bgColor: "bg-emerald-50",
    accentColor: "bg-emerald-100",
  },
  {
    title: "설정",
    subtitle: "데이터 관리 · 일괄 입력",
    emoji: "⚙️",
    href: "/settings",
    bgColor: "bg-gray-50",
    accentColor: "bg-gray-100",
  },
];

export default function MainScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-tablet-lg font-bold text-secondary mb-1">
          바로팀
        </Text>
        <Text className="text-tablet-sm text-gray-400 mb-8">
          달리기 기록으로 공정하게, <Text className="text-primary font-bold">바로팀</Text>을 빠르게 만들어 보세요.
        </Text>

        <View className="flex-row flex-wrap gap-4">
          {menuItems.map((item) => (
            <Pressable
              key={item.href}
              className={`${item.bgColor} rounded-3xl p-6 min-w-[160px] flex-1 basis-[45%] active:scale-95`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
              onPress={() => router.push(item.href as any)}
            >
              <View
                className={`${item.accentColor} w-14 h-14 rounded-2xl items-center justify-center mb-4`}
              >
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
              </View>
              <Text className="text-tablet-md font-bold text-secondary">
                {item.title}
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
