import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { useTeamStore } from "@/stores/teamStore";
import { insertGameRecord } from "@/lib/db/repositories/gameRepository";
import { Colors, TEAM_COLORS } from "@/constants/theme";

const SPORT_OPTIONS = ["피구", "티볼", "축구"];

export default function ScoreboardScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { currentTeam, currentMembers, loadTeamDetail } = useTeamStore();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [scores, setScores] = useState<number[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [savedGameId, setSavedGameId] = useState<number | null>(null);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [customSport, setCustomSport] = useState("");

  useEffect(() => {
    if (teamId) loadTeamDetail(db, parseInt(teamId, 10));
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, [teamId]);

  const teamNames = [
    ...new Set(currentMembers.map((m) => m.teamName)),
  ].sort();

  useEffect(() => {
    if (teamNames.length > 0) {
      setScores(new Array(teamNames.length).fill(0));
    }
  }, [currentMembers.length]);

  const updateScore = useCallback((teamIndex: number, delta: number) => {
    setScores((prev) => {
      const next = [...prev];
      next[teamIndex] = Math.max(0, next[teamIndex] + delta);
      return next;
    });
  }, []);

  const resetScores = () => {
    setScores((prev) => prev.map(() => 0));
    setSavedGameId(null);
  };

  const hasScores = scores.some((s) => s > 0);

  const saveGameRecord = async (gameType: string) => {
    if (!currentTeam || !hasScores) return;

    const scoreMap: Record<string, number> = {};
    teamNames.forEach((name, i) => {
      scoreMap[name] = scores[i] ?? 0;
    });

    try {
      const id = await insertGameRecord(db, {
        teamId: currentTeam.id,
        gameType,
        resultType: "score",
        scores: scoreMap,
      });
      setSavedGameId(id);
      setShowSportPicker(false);
      setCustomSport("");
      Alert.alert("저장 완료", `${gameType} 경기 결과가 저장되었습니다.`);
    } catch {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  const handleSave = () => {
    if (savedGameId != null) {
      Alert.alert(
        "이미 저장됨",
        "이 경기는 이미 저장되었습니다.\n초기화 후 새 경기를 시작하세요."
      );
      return;
    }
    setShowSportPicker(true);
  };

  if (!currentTeam || scores.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar hidden />
        <Text className="text-white text-tablet-md">로딩 중...</Text>
      </View>
    );
  }

  const teamCount = teamNames.length;
  const isTwo = teamCount === 2;
  const isMany = teamCount >= 5; // 5~6팀: 3열×2행

  // iPad: 점수 폰트 더 크게
  const scoreFontSize = isMany ? 80 : isTablet ? 200 : 140;
  const nameFontSize = isMany ? 28 : isTablet ? 56 : 48;
  const btnSize = isMany ? (isTablet ? "w-18 h-18" : "w-14 h-14") : (isTablet ? "w-24 h-24" : "w-20 h-20");
  const btnTextSize = isMany ? "text-2xl" : (isTablet ? "text-5xl" : "text-4xl");

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      {/* 상단 컨트롤 바 */}
      {showControls && (
        <View
          className="bg-black/80 px-4 pb-2 flex-row items-center justify-between"
          style={{ paddingTop: insets.top + 4 }}
        >
          <View className="flex-row gap-3">
            <Pressable
              className="rounded-xl items-center justify-center active:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', height: isTablet ? 48 : 44, paddingHorizontal: isTablet ? 20 : 16 }}
              onPress={() => router.back()}
            >
              <Text className="text-white font-semibold" style={{ fontSize: isTablet ? 18 : 16 }}>← 나가기</Text>
            </Pressable>
            <Pressable
              className="rounded-xl items-center justify-center active:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', height: isTablet ? 48 : 44, paddingHorizontal: isTablet ? 20 : 16 }}
              onPress={resetScores}
            >
              <Text className="text-white font-semibold" style={{ fontSize: isTablet ? 18 : 16 }}>↻ 초기화</Text>
            </Pressable>
            <Pressable
              className="rounded-xl items-center justify-center active:opacity-80"
              style={{
                backgroundColor: hasScores && savedGameId == null
                  ? 'rgba(16,185,129,0.8)'
                  : 'rgba(255,255,255,0.08)',
                height: isTablet ? 48 : 44,
                paddingHorizontal: isTablet ? 20 : 16,
              }}
              onPress={handleSave}
              disabled={!hasScores}
            >
              <Text
                className={`font-semibold ${
                  hasScores && savedGameId == null
                    ? "text-white"
                    : "text-white/40"
                }`}
                style={{ fontSize: isTablet ? 18 : 16 }}
              >
                {savedGameId != null ? "✓ 저장됨" : "💾 저장"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            className="rounded-xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', width: isTablet ? 48 : 44, height: isTablet ? 48 : 44 }}
            onPress={() => setShowControls(false)}
          >
            <Text className="text-white" style={{ fontSize: isTablet ? 22 : 20 }}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* 컨트롤 숨김 시 토글 버튼 */}
      {!showControls && (
        <Pressable
          className="absolute right-4 z-10 w-12 h-12 rounded-full bg-black/40 items-center justify-center"
          style={{ top: insets.top + 8 }}
          onPress={() => setShowControls(true)}
        >
          <Text className="text-white text-xl">☰</Text>
        </Pressable>
      )}

      {/* 점수판 본체 */}
      <View className={`flex-1 ${isTwo ? "flex-row" : "flex-row flex-wrap"}`}>
        {teamNames.map((name, i) => {
          const color = TEAM_COLORS[i % TEAM_COLORS.length];
          const score = scores[i] ?? 0;

          return (
            <View
              key={name}
              style={{ backgroundColor: color.bg }}
              className={`items-center justify-center ${
                isTwo ? "flex-1" : isMany ? "w-1/3 h-1/2" : "w-1/2 h-1/2"
              }`}
            >
              <Text
                style={{ color: color.text, fontSize: nameFontSize }}
                className="font-bold opacity-80"
              >
                {name}
              </Text>
              <Text
                style={{ color: color.text, fontSize: scoreFontSize }}
                className="font-bold my-2"
              >
                {score}
              </Text>
              {showControls && (
                <View className={`flex-row ${isMany ? "gap-3" : "gap-6"}`}>
                  <Pressable
                    className={`${btnSize} rounded-full bg-black/20 items-center justify-center active:bg-black/40`}
                    onPress={() => updateScore(i, -1)}
                  >
                    <Text
                      style={{ color: color.text }}
                      className={`${btnTextSize} font-bold`}
                    >
                      −
                    </Text>
                  </Pressable>
                  <Pressable
                    className={`${btnSize} rounded-full bg-white/30 items-center justify-center active:bg-white/50`}
                    onPress={() => updateScore(i, 1)}
                  >
                    <Text
                      style={{ color: color.text }}
                      className={`${btnTextSize} font-bold`}
                    >
                      +
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 종목 선택 모달 */}
      <Modal
        visible={showSportPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSportPicker(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: Colors.overlay }}
          onPress={() => setShowSportPicker(false)}
        >
          <Pressable
            className="rounded-2xl p-6 w-80"
            style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }}
          >
            <Text className="text-lg font-bold text-center mb-4" style={{ color: Colors.text1 }}>
              경기 종목 선택
            </Text>

            {SPORT_OPTIONS.map((sport) => (
              <Pressable
                key={sport}
                className="py-3 px-4 rounded-xl mb-2 active:opacity-80"
                style={{ backgroundColor: Colors.surface }}
                onPress={() => saveGameRecord(sport)}
              >
                <Text className="text-base font-bold text-center" style={{ color: Colors.text1 }}>
                  {sport}
                </Text>
              </Pressable>
            ))}

            {/* 직접 입력 */}
            <View className="flex-row gap-2 mt-2">
              <TextInput
                className="flex-1 rounded-xl px-3 py-2.5 text-base"
                style={{ backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text1 }}
                placeholder="직접 입력"
                placeholderTextColor={Colors.placeholder}
                keyboardAppearance="dark"
                value={customSport}
                onChangeText={setCustomSport}
              />
              <Pressable
                className="px-4 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: customSport.trim() ? Colors.primary : Colors.pillBg,
                }}
                onPress={() => {
                  if (customSport.trim()) saveGameRecord(customSport.trim());
                }}
                disabled={!customSport.trim()}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: customSport.trim() ? '#fff' : Colors.text3 }}
                >
                  저장
                </Text>
              </Pressable>
            </View>

            <Pressable
              className="mt-3 py-2"
              onPress={() => {
                setShowSportPicker(false);
                setCustomSport("");
              }}
            >
              <Text className="text-center" style={{ color: Colors.text2 }}>취소</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
