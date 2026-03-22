import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState, useCallback, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { useTeamStore } from "@/stores/teamStore";
import { insertGameRecord } from "@/lib/db/repositories/gameRepository";
import { Colors, TEAM_COLORS } from "@/constants/theme";

const SPORT_OPTIONS = ["피구", "티볼", "축구"];

const TIMER_PRESETS = [
  { label: "1분", seconds: 60 },
  { label: "3분", seconds: 180 },
  { label: "5분", seconds: 300 },
  { label: "15분", seconds: 900 },
];

const TIMER_HEIGHT = 250;

export default function ScoreboardScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { currentTeam, currentMembers, loadTeamDetail } = useTeamStore();
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLandscape = width > height;

  const [scores, setScores] = useState<number[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [savedGameId, setSavedGameId] = useState<number | null>(null);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [customSport, setCustomSport] = useState("");
  const [showRoster, setShowRoster] = useState(false);

  // 타이머
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPreset, setTimerPreset] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [currentTeam?.id]);

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

  // --- 타이머 로직 ---
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            Alert.alert("⏰ 시간 종료!", "설정한 타이머가 끝났습니다.");
            setTimerPreset(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerSeconds(seconds);
    setTimerPreset(seconds);
    // 다음 tick에서 running 설정 (effect가 확실히 재실행되도록)
    setTimeout(() => setTimerRunning(true), 0);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (timerSeconds > 0) setTimerRunning(true);
  }, [timerSeconds]);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerPreset(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatTime = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
  const isMany = teamCount >= 5;

  // 점수 폰트 사이즈 (높이 기반 + 팀당 너비 기반 중 작은 값)
  const colsPerRow = isTwo ? 2 : isMany ? 3 : 2;
  const maxByWidth = Math.floor(width / colsPerRow * 0.55);
  const scoreFontSize = isMany ? 80
    : isTablet && isLandscape ? Math.floor(height * 0.5)
    : isLandscape ? Math.floor(height * 0.3)
    : isTablet ? Math.min(Math.floor(height * 0.29), maxByWidth) : Math.min(120, maxByWidth);
  const nameFontSize = isMany ? 28
    : isTablet && isLandscape ? Math.floor(height * 0.07)
    : isLandscape ? Math.floor(height * 0.07)
    : isTablet ? 56 : 48;
  const btnSize = isMany ? (isTablet ? "w-18 h-18" : "w-14 h-14")
    : isTablet ? "w-24 h-24"
    : isLandscape ? "w-14 h-14" : "w-20 h-20";
  const btnTextSize = isMany ? "text-2xl"
    : isTablet ? "text-5xl"
    : isLandscape ? "text-2xl" : "text-4xl";

  // 컨트롤 바 버튼 스타일
  const barBtnStyle = {
    backgroundColor: "rgba(255,255,255,0.08)",
    height: isTablet ? 44 : 40,
    paddingHorizontal: isTablet ? 16 : 12,
    borderRadius: 10,
  };
  const barBtnActiveStyle = {
    ...barBtnStyle,
    backgroundColor: "rgba(16,185,129,0.7)",
  };
  const barFontSize = isTablet ? 16 : 14;

  // 타이머가 활성 상태인지
  const timerActive = timerPreset !== null;
  // 컨트롤 바에 타이머 표시 (가로 모드 + 타이머 활성)
  const showBarTimer = isLandscape && timerActive;

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      {/* ═══ 상단 컨트롤 바 ═══ */}
      {showControls && (
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 8,
            backgroundColor: "rgba(0,0,0,0.75)",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
          }}
          className="px-5"
        >
          <View className="flex-row items-center justify-between">
            {/* 좌측: 기능 버튼 */}
            <View className="flex-row items-center gap-2">
              <Pressable
                className="items-center justify-center active:opacity-70"
                style={barBtnStyle}
                onPress={() => router.back()}
              >
                <Text
                  className="text-white/70 font-semibold"
                  style={{ fontSize: barFontSize }}
                >
                  ← 나가기
                </Text>
              </Pressable>
              <Pressable
                className="items-center justify-center active:opacity-70"
                style={barBtnStyle}
                onPress={resetScores}
              >
                <Text
                  className="text-white/70 font-semibold"
                  style={{ fontSize: barFontSize }}
                >
                  ↻ 초기화
                </Text>
              </Pressable>
              <Pressable
                className="items-center justify-center active:opacity-70"
                style={
                  hasScores && savedGameId == null
                    ? barBtnActiveStyle
                    : { ...barBtnStyle, opacity: hasScores ? 1 : 0.4 }
                }
                onPress={handleSave}
                disabled={!hasScores}
              >
                <Text
                  className="text-white font-semibold"
                  style={{ fontSize: barFontSize }}
                >
                  {savedGameId != null ? "✓ 저장됨" : "💾 저장"}
                </Text>
              </Pressable>
              <Pressable
                className="items-center justify-center active:opacity-70"
                style={barBtnStyle}
                onPress={() => setShowRoster(true)}
              >
                <Text
                  className="text-white/70 font-semibold"
                  style={{ fontSize: barFontSize }}
                >
                  👥 명단
                </Text>
              </Pressable>
            </View>

            {/* 타이머 표시 (가로 모드 + 타이머 활성) */}
            {showBarTimer && (
              <View className="flex-row items-center gap-2">
                <View
                  className="rounded-lg px-4 items-center justify-center"
                  style={{
                    height: 44,
                    backgroundColor:
                      timerSeconds <= 10
                        ? "rgba(239,68,68,0.25)"
                        : "rgba(251,191,36,0.15)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 28,
                      color:
                        timerSeconds <= 10 ? Colors.danger : Colors.warningText,
                      fontVariant: ["tabular-nums"],
                    }}
                    className="font-bold"
                  >
                    ⏱ {formatTime(timerSeconds)}
                  </Text>
                </View>
                {timerRunning ? (
                  <Pressable
                    className="items-center justify-center active:opacity-70"
                    style={barBtnStyle}
                    onPress={pauseTimer}
                  >
                    <Text className="text-white/70 font-semibold" style={{ fontSize: barFontSize }}>
                      ⏸ 정지
                    </Text>
                  </Pressable>
                ) : (
                  timerSeconds > 0 && (
                    <Pressable
                      className="items-center justify-center active:opacity-70"
                      style={{ ...barBtnStyle, backgroundColor: "rgba(16,185,129,0.3)" }}
                      onPress={resumeTimer}
                    >
                      <Text className="font-semibold" style={{ fontSize: barFontSize, color: Colors.success }}>
                        ▶ 계속
                      </Text>
                    </Pressable>
                  )
                )}
                <Pressable
                  className="items-center justify-center active:opacity-70"
                  style={barBtnStyle}
                  onPress={resetTimer}
                >
                  <Text className="text-white/50 font-semibold" style={{ fontSize: barFontSize }}>
                    ✕ 해제
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 우측: 닫기 */}
            <Pressable
              className="items-center justify-center active:opacity-70"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                width: isTablet ? 44 : 40,
                height: isTablet ? 44 : 40,
                borderRadius: 10,
              }}
              onPress={() => setShowControls(false)}
            >
              <Text
                className="text-white/50"
                style={{ fontSize: isTablet ? 20 : 18 }}
              >
                ✕
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ═══ 컨트롤 숨김 시 플로팅 버튼 ═══ */}
      {!showControls && (
        <>
          <Pressable
            className="absolute left-4 z-10 items-center justify-center"
            style={{
              top: insets.top + 8,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
            onPress={() => setShowRoster(true)}
          >
            <Text className="text-white" style={{ fontSize: 20 }}>
              👥
            </Text>
          </Pressable>

          {/* 숨김 모드에서도 타이머 표시 (가로 모드) */}
          {timerActive && isLandscape && (
            <View
              className="absolute z-10 items-center justify-center self-center"
              style={{
                top: insets.top + 8,
                paddingHorizontal: 16,
                height: 48,
                borderRadius: 24,
                backgroundColor:
                  timerSeconds <= 10
                    ? "rgba(239,68,68,0.4)"
                    : "rgba(0,0,0,0.5)",
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  color:
                    timerSeconds <= 10 ? "#fca5a5" : Colors.warningText,
                  fontVariant: ["tabular-nums"],
                }}
                className="font-bold"
              >
                ⏱ {formatTime(timerSeconds)}
              </Text>
            </View>
          )}

          <Pressable
            className="absolute right-4 z-10 items-center justify-center"
            style={{
              top: insets.top + 8,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
            onPress={() => setShowControls(true)}
          >
            <Text className="text-white" style={{ fontSize: 20 }}>
              ☰
            </Text>
          </Pressable>
        </>
      )}

      {/* ═══ 점수판 본체 ═══ */}
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
              {/* 팀 이름 */}
              <Text
                style={{
                  color: color.text,
                  fontSize: nameFontSize,
                  opacity: 0.7,
                  letterSpacing: 2,
                }}
                className="font-bold"
              >
                {name}
              </Text>

              {/* 점수 */}
              <Text
                style={{
                  color: color.text,
                  fontSize: scoreFontSize,
                  lineHeight: scoreFontSize * 1.05,
                  textShadowColor: "rgba(0,0,0,0.3)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 8,
                }}
                className="font-bold"
              >
                {score}
              </Text>

              {/* ±버튼 */}
              {showControls && (
                <View className={`flex-row ${isMany ? "gap-3" : "gap-6"} mt-2`}>
                  <Pressable
                    className={`${btnSize} rounded-full items-center justify-center active:scale-95`}
                    style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
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
                    className={`${btnSize} rounded-full items-center justify-center active:scale-95`}
                    style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
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

      {/* ═══ 카운트다운 타이머 (세로 모드 전용) ═══ */}
      {!isLandscape && (
        <View
          style={{
            height: TIMER_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: "rgba(0,0,0,0.9)",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
          }}
          className="px-5 items-center justify-center"
        >
          {!timerActive ? (
            /* 프리셋 선택 */
            <View className="items-center gap-3">
              <Text
                style={{ color: "rgba(255,255,255,0.3)", fontSize: isTablet ? 16 : 13 }}
                className="font-semibold tracking-widest"
              >
                TIMER
              </Text>
              <View className="flex-row gap-3">
                {TIMER_PRESETS.map((p) => (
                  <Pressable
                    key={p.seconds}
                    className="items-center justify-center active:scale-95"
                    style={{
                      backgroundColor: "rgba(59,130,246,0.15)",
                      borderWidth: 1,
                      borderColor: "rgba(59,130,246,0.3)",
                      borderRadius: 14,
                      paddingHorizontal: isTablet ? 28 : 18,
                      paddingVertical: isTablet ? 16 : 12,
                    }}
                    onPress={() => startTimer(p.seconds)}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color: Colors.primary,
                        fontSize: isTablet ? 22 : 17,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            /* 타이머 활성 */
            <View className="items-center">
              <Text
                style={{
                  fontSize: isTablet ? 100 : 64,
                  color:
                    timerSeconds <= 10 ? Colors.danger : Colors.warningText,
                  fontVariant: ["tabular-nums"],
                  textShadowColor:
                    timerSeconds <= 10
                      ? "rgba(239,68,68,0.4)"
                      : "rgba(251,191,36,0.2)",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 20,
                  letterSpacing: 4,
                }}
                className="font-bold"
              >
                {formatTime(timerSeconds)}
              </Text>
              <View className="flex-row gap-3 mt-3">
                {timerRunning ? (
                  <Pressable
                    className="items-center justify-center active:scale-95"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      paddingHorizontal: isTablet ? 28 : 18,
                      paddingVertical: isTablet ? 14 : 10,
                    }}
                    onPress={pauseTimer}
                  >
                    <Text
                      className="text-white/80 font-bold"
                      style={{ fontSize: isTablet ? 18 : 15 }}
                    >
                      ⏸ 일시정지
                    </Text>
                  </Pressable>
                ) : (
                  timerSeconds > 0 && (
                    <Pressable
                      className="items-center justify-center active:scale-95"
                      style={{
                        backgroundColor: "rgba(16,185,129,0.2)",
                        borderWidth: 1,
                        borderColor: "rgba(16,185,129,0.4)",
                        borderRadius: 12,
                        paddingHorizontal: isTablet ? 28 : 18,
                        paddingVertical: isTablet ? 14 : 10,
                      }}
                      onPress={resumeTimer}
                    >
                      <Text
                        className="font-bold"
                        style={{
                          color: Colors.success,
                          fontSize: isTablet ? 18 : 15,
                        }}
                      >
                        ▶ 계속
                      </Text>
                    </Pressable>
                  )
                )}
                <Pressable
                  className="items-center justify-center active:scale-95"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    paddingHorizontal: isTablet ? 28 : 18,
                    paddingVertical: isTablet ? 14 : 10,
                  }}
                  onPress={resetTimer}
                >
                  <Text
                    className="text-white/50 font-bold"
                    style={{ fontSize: isTablet ? 18 : 15 }}
                  >
                    ✕ 해제
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ═══ 팀 명단 모달 ═══ */}
      <Modal
        visible={showRoster}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoster(false)}
      >
        <View className="flex-1" style={{ backgroundColor: Colors.overlay }}>
          <Pressable
            className="absolute top-0 left-0 right-0 bottom-0"
            onPress={() => setShowRoster(false)}
          />
          <View
            className="flex-1 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.border,
              marginHorizontal: isTablet ? 40 : 16,
              marginTop: insets.top + 16,
              marginBottom: insets.bottom + 16,
            }}
          >
            <View
              className="px-5 py-4 flex-row items-center justify-between"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <Text
                className="font-bold"
                style={{ color: Colors.text1, fontSize: isTablet ? 20 : 16 }}
              >
                👥 팀 명단
              </Text>
              <Pressable onPress={() => setShowRoster(false)}>
                <Text style={{ color: Colors.text2, fontSize: 20 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-4 py-3">
              {teamNames.map((name, i) => {
                const color = TEAM_COLORS[i % TEAM_COLORS.length];
                const members = currentMembers.filter(
                  (m) => m.teamName === name
                );
                const cols = isTablet ? 5 : 4;

                return (
                  <View key={name} className="mb-4">
                    <View
                      className="px-4 py-2.5 rounded-t-xl flex-row items-center justify-between"
                      style={{ backgroundColor: color.bg }}
                    >
                      <Text
                        className="font-bold"
                        style={{
                          color: color.text,
                          fontSize: isTablet ? 18 : 14,
                        }}
                      >
                        {name}
                      </Text>
                      <Text
                        className="opacity-80"
                        style={{
                          color: color.text,
                          fontSize: isTablet ? 14 : 12,
                        }}
                      >
                        {members.length}명
                      </Text>
                    </View>
                    <View
                      className="flex-row flex-wrap px-2 py-2 rounded-b-xl"
                      style={{ backgroundColor: Colors.surface }}
                    >
                      {members.map((m) => (
                        <View
                          key={m.id}
                          style={{
                            width: `${Math.floor(100 / cols)}%` as any,
                          }}
                          className="p-1"
                        >
                          <View
                            className="rounded-lg py-2 px-1 items-center"
                            style={{
                              backgroundColor:
                                m.gender === "M"
                                  ? Colors.male
                                  : Colors.female,
                            }}
                          >
                            <Text
                              className="font-bold"
                              style={{
                                color: Colors.text1,
                                fontSize: isTablet ? 16 : 13,
                              }}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {m.gender === "M" ? "👦" : "👧"}{" "}
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
          </View>
        </View>
      </Modal>

      {/* ═══ 종목 선택 모달 ═══ */}
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
            style={{
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text
              className="text-lg font-bold text-center mb-4"
              style={{ color: Colors.text1 }}
            >
              경기 종목 선택
            </Text>

            {SPORT_OPTIONS.map((sport) => (
              <Pressable
                key={sport}
                className="py-3 px-4 rounded-xl mb-2 active:opacity-80"
                style={{ backgroundColor: Colors.surface }}
                onPress={() => saveGameRecord(sport)}
              >
                <Text
                  className="text-base font-bold text-center"
                  style={{ color: Colors.text1 }}
                >
                  {sport}
                </Text>
              </Pressable>
            ))}

            <View className="flex-row gap-2 mt-2">
              <TextInput
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  backgroundColor: Colors.inputBg,
                  borderWidth: 1,
                  borderColor: Colors.inputBorder,
                  color: Colors.text1,
                }}
                placeholder="직접 입력"
                placeholderTextColor={Colors.placeholder}
                value={customSport}
                onChangeText={setCustomSport}
              />
              <Pressable
                className="px-4 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: customSport.trim()
                    ? Colors.primary
                    : Colors.pillBg,
                }}
                onPress={() => {
                  if (customSport.trim()) saveGameRecord(customSport.trim());
                }}
                disabled={!customSport.trim()}
              >
                <Text
                  className="text-sm font-bold"
                  style={{
                    color: customSport.trim() ? "#fff" : Colors.text3,
                  }}
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
              <Text className="text-center" style={{ color: Colors.text2 }}>
                취소
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
