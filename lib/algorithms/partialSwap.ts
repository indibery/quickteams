// 소폭 교체(Partial Swap) 알고리즘
// 기존 팀 구성을 유지하면서 가장 불균형한 팀 간에
// 능력점수가 비슷한 1-2쌍을 교체해 균형을 개선합니다.

export type SwapMember = {
  id: number;
  studentId: number;
  studentName: string;
  gender: string;
  abilityScore: number | null;
  runningRecord: number | null;
  teamName: string; // 소속 팀 이름
};

export type SwapTeam = {
  teamName: string;
  members: SwapMember[];
  averageScore: number;
};

export type SwapResult = {
  teams: SwapTeam[];
  swappedIds: number[]; // 교체된 studentId 목록 (강조 표시용)
  balanceBefore: number;
  balanceAfter: number;
};

/** 팀 평균 계산 */
function teamAverage(members: SwapMember[]): number {
  const scored = members.filter((m) => m.abilityScore != null);
  if (scored.length === 0) return 0;
  return scored.reduce((s, m) => s + m.abilityScore!, 0) / scored.length;
}

/** 균형 점수: 100 - (표준편차 × 50) */
function balanceScore(teams: SwapTeam[]): number {
  const avgs = teams.map((t) => t.averageScore);
  if (avgs.length <= 1) return 100;
  const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const variance = avgs.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / avgs.length;
  const score = Math.round(100 - Math.sqrt(variance) * 50);
  return Math.max(0, Math.min(100, score));
}

/** teams 배열의 깊은 복사 */
function cloneTeams(teams: SwapTeam[]): SwapTeam[] {
  return teams.map((t) => ({
    ...t,
    members: t.members.map((m) => ({ ...m })),
  }));
}

/**
 * 교체를 원본 teams에 반영하는 헬퍼
 */
function applySwap(
  teams: SwapTeam[],
  teamAName: string,
  teamBName: string,
  mA: SwapMember,
  mB: SwapMember,
  swappedIds: number[]
): void {
  const origA = teams.find((t) => t.teamName === teamAName)!;
  const origB = teams.find((t) => t.teamName === teamBName)!;
  const oIdxA = origA.members.findIndex((m) => m.studentId === mA.studentId);
  const oIdxB = origB.members.findIndex((m) => m.studentId === mB.studentId);
  origA.members[oIdxA] = { ...mB, teamName: origA.teamName };
  origB.members[oIdxB] = { ...mA, teamName: origB.teamName };
  origA.averageScore = teamAverage(origA.members);
  origB.averageScore = teamAverage(origB.members);

  if (!swappedIds.includes(mA.studentId)) swappedIds.push(mA.studentId);
  if (!swappedIds.includes(mB.studentId)) swappedIds.push(mB.studentId);
}

/** 균형 점수 하락 허용 범위 (초등 달리기 측정 오차 감안) */
const BALANCE_TOLERANCE = 5;

/**
 * 두 팀 사이에서 멤버 쌍 교체 시도
 * 1) 균형 개선 → 즉시 확정
 * 2) 소폭 하락(BALANCE_TOLERANCE 이내) 또는 동점 → 후보 수집 후 랜덤 선택
 *    (100점이라도 변화 가능, 달리기 측정 오차 감안)
 */
function tryBestSwap(
  teams: SwapTeam[],
  teamA: SwapTeam,
  teamB: SwapTeam,
  swappedIds: number[]
): boolean {
  const scoredA = teamA.members.filter((m) => m.abilityScore != null);
  const scoredB = teamB.members.filter((m) => m.abilityScore != null);

  const before = balanceScore(teams);

  // 모든 교체 후보 생성
  const candidates: { diff: number; mA: SwapMember; mB: SwapMember }[] = [];
  for (const mA of scoredA) {
    for (const mB of scoredB) {
      if (mA.abilityScore === mB.abilityScore) continue;
      const diff = Math.abs(mA.abilityScore! - mB.abilityScore!);
      candidates.push({ diff, mA, mB });
    }
  }
  candidates.sort((a, b) => a.diff - b.diff);

  // 1차: 개선 쌍 탐색, 2차: 허용 범위 내 후보 수집
  const tolerableCandidates: { mA: SwapMember; mB: SwapMember }[] = [];

  for (const { mA, mB } of candidates) {
    const testTeams = cloneTeams(teams);
    const tA = testTeams.find((t) => t.teamName === teamA.teamName)!;
    const tB = testTeams.find((t) => t.teamName === teamB.teamName)!;

    const idxA = tA.members.findIndex((m) => m.studentId === mA.studentId);
    const idxB = tB.members.findIndex((m) => m.studentId === mB.studentId);
    tA.members[idxA] = { ...mB, teamName: tA.teamName };
    tB.members[idxB] = { ...mA, teamName: tB.teamName };

    tA.averageScore = teamAverage(tA.members);
    tB.averageScore = teamAverage(tB.members);

    const after = balanceScore(testTeams);

    if (after > before) {
      applySwap(teams, teamA.teamName, teamB.teamName, mA, mB, swappedIds);
      return true;
    }

    // 동점 또는 소폭 하락(허용 범위 이내) → 후보 수집
    if (before - after <= BALANCE_TOLERANCE) {
      tolerableCandidates.push({ mA, mB });
    }
  }

  // 개선 쌍 없으면 허용 범위 후보 중 랜덤 선택
  if (tolerableCandidates.length > 0) {
    const pick = tolerableCandidates[Math.floor(Math.random() * tolerableCandidates.length)];
    applySwap(teams, teamA.teamName, teamB.teamName, pick.mA, pick.mB, swappedIds);
    return true;
  }

  return false;
}

/**
 * 팀 이름으로 성별 그룹 판별
 * "N팀 남자" → "남자", "N팀 여자" → "여자", 그 외 → null (혼성)
 */
function getGenderGroup(teamName: string): string | null {
  if (teamName.endsWith("남자")) return "남자";
  if (teamName.endsWith("여자")) return "여자";
  return null;
}

/**
 * 성별분리 팀인지 판별 (하나라도 "남자"/"여자"로 끝나면 성별분리)
 */
function isSeparateGenderTeams(teams: SwapTeam[]): boolean {
  return teams.some((t) => getGenderGroup(t.teamName) != null);
}

/**
 * 팀 그룹 내에서 소폭 교체 수행
 */
function swapWithinGroup(
  group: SwapTeam[],
  maxSwaps: number,
  swappedIds: number[]
): void {
  for (let round = 0; round < maxSwaps; round++) {
    const sorted = [...group].sort((a, b) => b.averageScore - a.averageScore);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    if (strongest.teamName === weakest.teamName) break;

    // balanceScore는 해당 그룹만으로 계산해야 하므로 allTeams 대신 group 사용
    const swapped = tryBestSwap(group, strongest, weakest, swappedIds);
    if (!swapped) break;
  }
}

/**
 * 소폭 교체 메인 함수
 * @param rawTeams 현재 팀 편성 (DB에서 불러온 MemberWithInfo 배열을 팀별로 그룹핑한 것)
 * @param maxSwaps 최대 교체 횟수 (기본 2)
 */
export function partialSwap(
  rawTeams: { teamName: string; members: SwapMember[] }[],
  maxSwaps = 2
): SwapResult {
  // 팀 초기화
  const teams: SwapTeam[] = rawTeams.map((t) => ({
    teamName: t.teamName,
    members: t.members.map((m) => ({ ...m })),
    averageScore: teamAverage(t.members),
  }));

  const swappedIds: number[] = [];

  if (isSeparateGenderTeams(teams)) {
    // 성별분리: 남자팀끼리, 여자팀끼리 각각 교체
    const maleTeams = teams.filter((t) => getGenderGroup(t.teamName) === "남자");
    const femaleTeams = teams.filter((t) => getGenderGroup(t.teamName) === "여자");

    const maleBefore = balanceScore(maleTeams);
    const femaleBefore = balanceScore(femaleTeams);
    const balanceBefore = Math.round((maleBefore + femaleBefore) / 2);

    swapWithinGroup(maleTeams, maxSwaps, swappedIds);
    swapWithinGroup(femaleTeams, maxSwaps, swappedIds);

    const maleAfter = balanceScore(maleTeams);
    const femaleAfter = balanceScore(femaleTeams);
    const balanceAfter = Math.round((maleAfter + femaleAfter) / 2);

    return { teams, swappedIds, balanceBefore, balanceAfter };
  } else {
    // 혼성: 기존 로직 (전체 팀에서 strongest/weakest 교체)
    const balanceBefore = balanceScore(teams);

    for (let round = 0; round < maxSwaps; round++) {
      const sorted = [...teams].sort((a, b) => b.averageScore - a.averageScore);
      const strongest = sorted[0];
      const weakest = sorted[sorted.length - 1];

      if (strongest.teamName === weakest.teamName) break;

      const swapped = tryBestSwap(teams, strongest, weakest, swappedIds);
      if (!swapped) break;
    }

    const balanceAfter = balanceScore(teams);

    return { teams, swappedIds, balanceBefore, balanceAfter };
  }
}
