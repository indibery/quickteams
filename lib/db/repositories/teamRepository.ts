import type { SQLiteDatabase } from "expo-sqlite";
import type { Team, TeamMember } from "@/lib/types";

function rowToTeam(row: any): Team {
  return {
    id: row.id,
    name: row.name,
    label: row.label ?? "",
    grade: row.grade,
    class: row.class,
    teamType: row.team_type,
    teamCount: row.team_count,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

/** 팀 목록 조회 (학년/반 필터) */
export async function getTeamsByClass(
  db: SQLiteDatabase,
  grade: number,
  classNum: number
): Promise<Team[]> {
  const rows = await db.getAllAsync(
    "SELECT * FROM teams WHERE grade = ? AND class = ? ORDER BY created_at DESC",
    [grade, classNum]
  );
  return rows.map(rowToTeam);
}

/** 학년별 팀 목록 조회 (최근 경기 순 정렬) */
export async function getTeamsByGrade(
  db: SQLiteDatabase,
  grade: number
): Promise<Team[]> {
  const rows = await db.getAllAsync(
    `SELECT t.*, MAX(gr.game_date) as last_game_date
     FROM teams t
     LEFT JOIN game_records gr ON t.id = gr.team_id
     WHERE t.grade = ?
     GROUP BY t.id
     ORDER BY last_game_date DESC NULLS LAST, t.created_at DESC`,
    [grade]
  );
  return rows.map(rowToTeam);
}

/** 전체 팀 목록 조회 (팀 관리용, 최신순) */
export async function getAllTeams(db: SQLiteDatabase): Promise<Team[]> {
  const rows = await db.getAllAsync(
    "SELECT * FROM teams ORDER BY created_at DESC"
  );
  return rows.map(rowToTeam);
}

/** 팀 1개 조회 */
export async function getTeamById(
  db: SQLiteDatabase,
  id: number
): Promise<Team | null> {
  const row = await db.getFirstAsync("SELECT * FROM teams WHERE id = ?", [id]);
  return row ? rowToTeam(row) : null;
}

/** 팀 생성 */
export async function insertTeam(
  db: SQLiteDatabase,
  team: {
    name: string;
    label: string;
    grade: number;
    class: number;
    teamType: "mixed" | "separate";
    teamCount: number;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO teams (name, label, grade, class, team_type, team_count) VALUES (?, ?, ?, ?, ?, ?)`,
    [team.name, team.label, team.grade, team.class, team.teamType, team.teamCount]
  );
  return result.lastInsertRowId;
}

/** 팀 레이블 수정 */
export async function updateTeamLabel(
  db: SQLiteDatabase,
  id: number,
  label: string
): Promise<void> {
  await db.runAsync("UPDATE teams SET label = ? WHERE id = ?", [label, id]);
}

/** 팀 멤버 일괄 추가 */
export async function insertTeamMembers(
  db: SQLiteDatabase,
  teamId: number,
  members: { studentId: number; teamName: string }[]
): Promise<void> {
  for (const m of members) {
    await db.runAsync(
      "INSERT INTO team_members (team_id, student_id, team_name) VALUES (?, ?, ?)",
      [teamId, m.studentId, m.teamName]
    );
  }
}

/** 팀 멤버 전체 삭제 (재배정 전 사용) */
export async function deleteTeamMembers(
  db: SQLiteDatabase,
  teamId: number
): Promise<void> {
  await db.runAsync("DELETE FROM team_members WHERE team_id = ?", [teamId]);
}

/** 팀 멤버 조회 (학생 정보 포함) */
export async function getTeamMembers(
  db: SQLiteDatabase,
  teamId: number
): Promise<
  (TeamMember & { studentName: string; gender: string; abilityScore: number | null; runningRecord: number | null })[]
> {
  const rows = await db.getAllAsync<any>(
    `SELECT tm.*, s.name as student_name, s.gender, s.ability_score, s.running_record
     FROM team_members tm
     JOIN students s ON tm.student_id = s.id
     WHERE tm.team_id = ?
     ORDER BY tm.team_name, s.ability_score DESC`,
    [teamId]
  );
  return rows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    studentId: row.student_id,
    teamName: row.team_name,
    studentName: row.student_name,
    gender: row.gender,
    abilityScore: row.ability_score,
    runningRecord: row.running_record,
  }));
}

/** 팀 삭제 (cascade로 멤버도 삭제) */
export async function deleteTeam(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync("DELETE FROM teams WHERE id = ?", [id]);
}
