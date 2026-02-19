// 공통 타입 정의

export type Gender = "M" | "F";

export type Student = {
  id: number;
  name: string;
  grade: number;
  class: number;
  studentNumber: number;
  gender: Gender;
  runningRecord: string | null; // 초 단위 (예: "12.15")
  adjustment: number; // -5 ~ +5 능력 보정 (기본 0)
  abilityScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentInput = {
  name: string;
  grade: number;
  class: number;
  studentNumber: number;
  gender: Gender;
  runningRecord?: string | null;
  adjustment?: number; // -5 ~ +5 능력 보정 (기본 0)
};

export type Team = {
  id: number;
  name: string;
  label: string; // 팀 용도 레이블 (예: "체육대회", "수업용")
  grade: number;
  class: number;
  teamType: "mixed" | "separate";
  teamCount: number;
  isActive: boolean;
  createdAt: string;
};

export type TeamMember = {
  id: number;
  teamId: number;
  studentId: number;
  teamName: string;
};

export type GameRecord = {
  id: number;
  teamId: number;
  gameType: string;
  gameDate: string;
  resultType: "winner" | "score";
  winnerTeam: string | null;
  scores: string | null; // JSON
  createdAt: string;
};

export type IndividualRecord = {
  id: number;
  gameRecordId: number;
  studentId: number;
  recordType: "warning" | "note" | "achievement";
  description: string | null;
};
