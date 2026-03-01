// 바로팀 v2.1.0 다크 테마 디자인 토큰

export const Colors = {
  // 배경
  bg: '#0d1117',
  card: '#161b22',
  cardElevated: '#1c2129',
  surface: '#21262d',

  // 보더
  border: '#21262d',
  borderLight: '#30363d',

  // 텍스트
  text1: '#e6edf3',
  text2: '#8b949e',
  text3: '#4b5563',
  placeholder: '#484f58',

  // Primary
  primary: '#3b82f6',
  primaryDark: '#2563EB',
  primarySoft: 'rgba(59,130,246,0.15)',

  // Semantic
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.10)',
  dangerText: '#f87171',
  success: '#10b981',
  successSoft: 'rgba(16,185,129,0.10)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.15)',
  warningText: '#fbbf24',

  // 성별
  male: 'rgba(59,130,246,0.15)',
  maleBorder: 'rgba(59,130,246,0.3)',
  female: 'rgba(245,158,11,0.15)',
  femaleBorder: 'rgba(245,158,11,0.3)',

  // 교체 하이라이트
  swapped: 'rgba(249,115,22,0.15)',
  swappedBorder: '#F97316',
  swappedText: '#FB923C',

  // 홈 카드 포인트 라인 (상단 2px)
  accentStudents: '#3b82f6',
  accentTeams: '#8b5cf6',
  accentGame: '#f59e0b',
  accentRecords: '#10b981',
  accentSettings: '#4b5563',

  // 홈 카드 배경 tint
  menuStudents: 'rgba(59,130,246,0.08)',
  menuTeams: 'rgba(139,92,246,0.08)',
  menuGame: 'rgba(245,158,11,0.08)',
  menuRecords: 'rgba(16,185,129,0.08)',
  menuSettings: 'rgba(75,85,99,0.08)',

  // 팀 컬러
  team1: '#3B82F6',
  team2: '#EF4444',
  team3: '#10B981',
  team4: '#F59E0B',
  team5: '#8B5CF6',
  team6: '#EC4899',

  // 팀 배경 (다크)
  team1Light: 'rgba(59,130,246,0.15)',
  team2Light: 'rgba(239,68,68,0.15)',
  team3Light: 'rgba(16,185,129,0.15)',
  team4Light: 'rgba(245,158,11,0.15)',
  team5Light: 'rgba(139,92,246,0.15)',
  team6Light: 'rgba(236,72,153,0.15)',

  // 헤더
  headerBg: '#161b22',
  headerTint: '#e6edf3',

  // Pill 버튼
  pillBg: '#21262d',
  pillText: '#8b949e',
  pillSelectedBg: '#3b82f6',
  pillSelectedText: '#ffffff',

  // Input
  inputBg: '#0d1117',
  inputBorder: '#30363d',

  // 오버레이
  overlay: 'rgba(0,0,0,0.6)',
} as const;

// 카드 기본 스타일
export const cardStyle = {
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 14,
};

// 포인트 라인
export const accentLine = (color: string) => ({
  borderTopWidth: 2,
  borderTopColor: color,
});

// 팀 dot 컬러 배열
export const DOT_COLORS = [
  Colors.team1, Colors.team2, Colors.team3,
  Colors.team4, Colors.team5, Colors.team6,
];

export const DOT_LIGHT = [
  Colors.team1Light, Colors.team2Light, Colors.team3Light,
  Colors.team4Light, Colors.team5Light, Colors.team6Light,
];

// 팀 스타일 (팀 명단용)
export const TEAM_STYLES = [
  { bg: Colors.team1, text: '#FFFFFF', light: Colors.team1Light },
  { bg: Colors.team2, text: '#FFFFFF', light: Colors.team2Light },
  { bg: Colors.team3, text: '#FFFFFF', light: Colors.team3Light },
  { bg: Colors.team4, text: '#FFFFFF', light: Colors.team4Light },
  { bg: Colors.team5, text: '#FFFFFF', light: Colors.team5Light },
  { bg: Colors.team6, text: '#FFFFFF', light: Colors.team6Light },
];

// 팀 컬러 (점수판용)
export const TEAM_COLORS = [
  { bg: Colors.team1, text: '#FFFFFF' },
  { bg: Colors.team2, text: '#FFFFFF' },
  { bg: Colors.team3, text: '#FFFFFF' },
  { bg: Colors.team4, text: '#FFFFFF' },
  { bg: Colors.team5, text: '#FFFFFF' },
  { bg: Colors.team6, text: '#FFFFFF' },
];
