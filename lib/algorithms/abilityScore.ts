// 능력 점수 계산 알고리즘 v2
// 공식: runningScore + adjustment × ADJUSTMENT_FACTOR
// 달리기 기록이 기본, 능력 보정으로 교사가 미세 조정

/** 능력 보정 1점당 능력치 영향력 (능력 보정 +5 → 능력 +1.0) */
const ADJUSTMENT_FACTOR = 0.2;

/**
 * 달리기 기록(초) 파싱 — SS.ss 형식 (소수점 둘째자리까지)
 * 예: "12.15" → 12.15초, "9.8" → 9.8초, "8" → 8초
 * 하위호환: 기존 MM:SS 형식도 지원
 */
export function parseRunningRecord(record: string): number | null {
  const trimmed = record.trim();

  // 새 형식: SS 또는 SS.s 또는 SS.ss (예: 12.15, 9.8, 8)
  const secMatch = trimmed.match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (secMatch) {
    const whole = parseInt(secMatch[1], 10);
    const frac = secMatch[2] ? parseInt(secMatch[2].padEnd(2, "0"), 10) : 0;
    return whole + frac / 100;
  }

  // 하위호환: MM:SS 형식 (기존 데이터 지원)
  const minMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    const seconds = parseInt(minMatch[2], 10);
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  return null;
}

/**
 * 달리기 기록(초)을 학생 그룹 내 상대 순위로 1-5점 변환
 * 빠를수록 높은 점수 (1등 = 5점)
 */
export function convertRunningToScore(
  studentSeconds: number,
  allSeconds: number[]
): number {
  if (allSeconds.length <= 1) return 3;

  const sorted = [...allSeconds].sort((a, b) => a - b); // 오름차순 (빠른 순)
  const rank = sorted.indexOf(studentSeconds); // 0-based
  const total = sorted.length;

  // 순위 → 1~5 점수 (등간격)
  const score = 5 - (rank / (total - 1)) * 4;
  return Math.round(score * 10) / 10; // 소수점 1자리
}

/**
 * 개별 학생의 종합 능력 점수 계산 (v2 능력 보정 방식)
 * runningScore + adjustment × ADJUSTMENT_FACTOR
 * 결과는 1.0 ~ 5.0 범위로 클램핑
 */
export function calculateAbilityScore(params: {
  runningScore?: number;
  adjustment?: number;
}): number | null {
  const { runningScore, adjustment = 0 } = params;

  if (runningScore == null) return null;

  const raw = runningScore + adjustment * ADJUSTMENT_FACTOR;
  // 1.0 ~ 5.0 범위로 클램핑
  const clamped = Math.max(1.0, Math.min(5.0, raw));
  return Math.round(clamped * 10) / 10;
}
