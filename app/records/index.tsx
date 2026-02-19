import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import type { GameRecord } from "@/lib/types";

type GameRecordWithTeam = GameRecord & { teamName: string };

export default function RecordsScreen() {
  const db = useSQLiteContext();
  const { records, isLoading, loadAllRecords, removeRecord } = useGameStore();

  useEffect(() => {
    loadAllRecords(db);
  }, []);

  const handleDelete = (record: GameRecordWithTeam) => {
    Alert.alert("기록 삭제", "이 경기 기록을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await removeRecord(db, record.id);
          await loadAllRecords(db);
        },
      },
    ]);
  };

  const renderScores = (record: GameRecordWithTeam) => {
    if (record.resultType === "winner" && record.winnerTeam) {
      return (
        <Text className="text-sm text-primary font-bold">
          🏆 {record.winnerTeam} 승리
        </Text>
      );
    }
    if (record.scores) {
      try {
        const parsed = JSON.parse(record.scores);
        const entries = Object.entries(parsed);
        return (
          <View className="flex-row flex-wrap gap-1.5">
            {entries.map(([team, score], i) => (
              <View key={team} className="flex-row items-center">
                <Text className="text-sm text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">
                  {team} <Text className="font-bold text-primary">{String(score)}</Text>
                </Text>
                {i < entries.length - 1 && (
                  <Text className="text-gray-200 ml-1.5">·</Text>
                )}
              </View>
            ))}
          </View>
        );
      } catch {
        return null;
      }
    }
    return null;
  };

  const getGameEmoji = (gameType: string) => {
    if (gameType.includes("티볼") || gameType.includes("야구")) return "⚾";
    if (gameType.includes("축구")) return "⚽";
    if (gameType.includes("농구")) return "🏀";
    if (gameType.includes("배구")) return "🏐";
    if (gameType.includes("피구")) return "🔴";
    if (gameType.includes("달리기") || gameType.includes("육상")) return "🏃";
    if (gameType.includes("배드민턴")) return "🏸";
    return "🏅";
  };

  const renderRecord = ({ item }: { item: GameRecordWithTeam }) => {
    const dateOnly = item.gameDate.split("T")[0].split(" ")[0];
    return (
      <Pressable
        className="bg-white rounded-2xl px-4 py-3.5 mb-2.5"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}
        onLongPress={() => handleDelete(item)}
      >
        {/* 1행: 이모지 + 종목 + 학년반 + 날짜 */}
        <View className="flex-row items-center gap-2">
          <Text className="text-xl">{getGameEmoji(item.gameType)}</Text>
          <Text className="font-bold text-secondary text-base" numberOfLines={1}>
            {item.gameType}
          </Text>
          <Text className="text-sm text-gray-300 flex-1" numberOfLines={1}>
            {item.teamName}
          </Text>
          <Text className="text-xs text-gray-300 shrink-0">{dateOnly}</Text>
        </View>
        {/* 2행: 점수 */}
        <View className="mt-1.5">{renderScores(item)}</View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <View className="px-6 py-2.5">
        <Text className="text-sm text-gray-400">
          총 {records.length}건의 경기 기록
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : records.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="bg-gray-100 w-20 h-20 rounded-3xl items-center justify-center mb-4">
            <Text style={{ fontSize: 36 }}>📊</Text>
          </View>
          <Text className="text-tablet-sm text-gray-400">
            경기 기록이 없습니다
          </Text>
          <Text className="text-sm text-gray-300 mt-1">
            팀 상세에서 경기를 시작해보세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRecord}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}
