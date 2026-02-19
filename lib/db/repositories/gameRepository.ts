import type { SQLiteDatabase } from "expo-sqlite";
import type { GameRecord, IndividualRecord } from "@/lib/types";

function rowToGameRecord(row: any): GameRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    gameType: row.game_type,
    gameDate: row.game_date,
    resultType: row.result_type,
    winnerTeam: row.winner_team,
    scores: row.scores,
    createdAt: row.created_at,
  };
}

function rowToIndividualRecord(row: any): IndividualRecord {
  return {
    id: row.id,
    gameRecordId: row.game_record_id,
    studentId: row.student_id,
    recordType: row.record_type,
    description: row.description,
  };
}

/** 경기 기록 목록 조회 (팀 ID 기준) */
export async function getGameRecordsByTeam(
  db: SQLiteDatabase,
  teamId: number
): Promise<GameRecord[]> {
  const rows = await db.getAllAsync(
    "SELECT * FROM game_records WHERE team_id = ? ORDER BY game_date DESC",
    [teamId]
  );
  return rows.map(rowToGameRecord);
}

/** 전체 경기 기록 조회 (최신순) */
export async function getAllGameRecords(
  db: SQLiteDatabase
): Promise<(GameRecord & { teamName: string })[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT gr.*, t.grade as team_grade, t.class as team_class, t.label as team_label
     FROM game_records gr
     JOIN teams t ON gr.team_id = t.id
     ORDER BY gr.game_date DESC`
  );
  return rows.map((row) => ({
    ...rowToGameRecord(row),
    teamName: row.team_label
      ? `${row.team_grade}학년 ${row.team_class}반 · ${row.team_label}`
      : `${row.team_grade}학년 ${row.team_class}반`,
  }));
}

/** 경기 기록 1개 조회 */
export async function getGameRecordById(
  db: SQLiteDatabase,
  id: number
): Promise<GameRecord | null> {
  const row = await db.getFirstAsync(
    "SELECT * FROM game_records WHERE id = ?",
    [id]
  );
  return row ? rowToGameRecord(row) : null;
}

/** 경기 기록 추가 */
export async function insertGameRecord(
  db: SQLiteDatabase,
  record: {
    teamId: number;
    gameType: string;
    resultType: "winner" | "score";
    winnerTeam?: string;
    scores?: Record<string, number>;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO game_records (team_id, game_type, result_type, winner_team, scores)
     VALUES (?, ?, ?, ?, ?)`,
    [
      record.teamId,
      record.gameType,
      record.resultType,
      record.winnerTeam ?? null,
      record.scores ? JSON.stringify(record.scores) : null,
    ]
  );
  return result.lastInsertRowId;
}

/** 개인 기록 추가 */
export async function insertIndividualRecord(
  db: SQLiteDatabase,
  record: {
    gameRecordId: number;
    studentId: number;
    recordType: "warning" | "note" | "achievement";
    description?: string;
  }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO individual_records (game_record_id, student_id, record_type, description)
     VALUES (?, ?, ?, ?)`,
    [
      record.gameRecordId,
      record.studentId,
      record.recordType,
      record.description ?? null,
    ]
  );
  return result.lastInsertRowId;
}

/** 경기별 개인 기록 조회 (학생 이름 포함) */
export async function getIndividualRecords(
  db: SQLiteDatabase,
  gameRecordId: number
): Promise<(IndividualRecord & { studentName: string })[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT ir.*, s.name as student_name
     FROM individual_records ir
     JOIN students s ON ir.student_id = s.id
     WHERE ir.game_record_id = ?
     ORDER BY ir.record_type, s.name`,
    [gameRecordId]
  );
  return rows.map((row) => ({
    ...rowToIndividualRecord(row),
    studentName: row.student_name,
  }));
}

/** 경기 기록 삭제 (cascade로 개인 기록도 삭제) */
export async function deleteGameRecord(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync("DELETE FROM game_records WHERE id = ?", [id]);
}
