// 지그재그(Snake Draft) 팀 배정 알고리즘
// 능력 점수 기준 내림차순 정렬 후
// 1→2→3→4→4→3→2→1→1→2→... 패턴으로 배분

export type Student = {
  id: number;
  name: string;
  gender: "M" | "F";
  abilityScore: number;
};

export type TeamResult = {
  teamName: string;
  members: Student[];
  averageScore: number;
  maleCount: number;
  femaleCount: number;
};

export type AssignmentResult = {
  teams: TeamResult[];
  balanceScore: number;
};

/**
 * 지그재그 알고리즘으로 팀 배정
 * @param students 학생 목록 (능력 점수 필수)
 * @param teamCount 팀 수 (2-4)
 * @param mode 'mixed' = 남녀혼성, 'separate' = 성별분리
 */
export function assignTeams(
  students: Student[],
  teamCount: number,
  mode: "mixed" | "separate"
): AssignmentResult {
  if (mode === "separate") {
    return assignSeparateGender(students, teamCount);
  }
  return assignMixed(students, teamCount);
}

/**
 * 혼성 팀 배정: 전체를 능력순 정렬 후 지그재그 배분
 */
function assignMixed(students: Student[], teamCount: number): AssignmentResult {
  const sorted = [...students].sort(
    (a, b) => b.abilityScore - a.abilityScore
  );
  const buckets: Student[][] = Array.from({ length: teamCount }, () => []);

  zigzagDistribute(sorted, buckets);

  return buildResult(buckets);
}

/**
 * 성별 분리 팀 배정: 남녀 별도 팀으로 분리
 * teamCount=2 → "1팀 남자", "2팀 남자", "1팀 여자", "2팀 여자" (총 4팀)
 * 균형 점수는 같은 성별 그룹끼리만 비교 (남자팀끼리, 여자팀끼리)
 */
function assignSeparateGender(
  students: Student[],
  teamCount: number
): AssignmentResult {
  const males = students
    .filter((s) => s.gender === "M")
    .sort((a, b) => b.abilityScore - a.abilityScore);
  const females = students
    .filter((s) => s.gender === "F")
    .sort((a, b) => b.abilityScore - a.abilityScore);

  // 남녀 별도 버킷
  const maleBuckets: Student[][] = Array.from({ length: teamCount }, () => []);
  const femaleBuckets: Student[][] = Array.from({ length: teamCount }, () => []);

  zigzagDistribute(males, maleBuckets);
  zigzagDistribute(females, femaleBuckets);

  // 남자 팀 이름: "1팀 남자", "2팀 남자", ...
  // 여자 팀 이름: "1팀 여자", "2팀 여자", ...
  const allBuckets = [...maleBuckets, ...femaleBuckets];
  const teamNames = [
    ...maleBuckets.map((_, i) => `${i + 1}팀 남자`),
    ...femaleBuckets.map((_, i) => `${i + 1}팀 여자`),
  ];

  // 같은 성별끼리만 균형 점수 계산
  const maleResult = buildResult(maleBuckets);
  const femaleResult = buildResult(femaleBuckets);
  const combinedBalanceScore = Math.round(
    (maleResult.balanceScore + femaleResult.balanceScore) / 2
  );

  // 전체 팀 결과 생성 (teamNames 포함, 균형 점수는 성별별 평균)
  const fullResult = buildResult(allBuckets, teamNames);
  return { ...fullResult, balanceScore: combinedBalanceScore };
}

/**
 * 지그재그(Snake Draft) 패턴으로 학생을 버킷에 배분
 * 순서: 0→1→2→3→3→2→1→0→0→1→...
 */
function zigzagDistribute(students: Student[], buckets: Student[][]): void {
  const teamCount = buckets.length;
  let index = 0;
  let direction = 1; // 1 = 정방향, -1 = 역방향

  for (const student of students) {
    buckets[index].push(student);

    // 다음 인덱스 계산
    const nextIndex = index + direction;
    if (nextIndex >= teamCount || nextIndex < 0) {
      direction *= -1; // 방향 전환
    } else {
      index = nextIndex;
    }
  }
}

/**
 * 팀 배정 결과 생성 및 균형 점수 계산
 * @param teamNames 팀 이름 배열 (없으면 "1팀", "2팀"... 자동 생성)
 */
function buildResult(buckets: Student[][], teamNames?: string[]): AssignmentResult {
  const teams: TeamResult[] = buckets.map((members, i) => {
    const avgScore =
      members.length > 0
        ? members.reduce((sum, m) => sum + m.abilityScore, 0) / members.length
        : 0;

    return {
      teamName: teamNames?.[i] ?? `${i + 1}팀`,
      members,
      averageScore: Math.round(avgScore * 10) / 10,
      maleCount: members.filter((m) => m.gender === "M").length,
      femaleCount: members.filter((m) => m.gender === "F").length,
    };
  });

  const balanceScore = calculateBalanceScore(
    teams.map((t) => t.averageScore)
  );

  return { teams, balanceScore };
}

/**
 * 균형 점수 계산: 100 - (표준편차 × 50)
 * 점수 범위: 0-100 (높을수록 균형적)
 */
function calculateBalanceScore(averages: number[]): number {
  if (averages.length <= 1) return 100;

  const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
  const variance =
    averages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) /
    averages.length;
  const stdDev = Math.sqrt(variance);

  const score = Math.round(100 - stdDev * 50);
  return Math.max(0, Math.min(100, score));
}
