import type { SQLiteDatabase } from "expo-sqlite";
import { SCHEMA_VERSION, CREATE_TABLES_SQL } from "./schema";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // WAL 모드 활성화 (성능 향상)
  await db.execAsync("PRAGMA journal_mode = WAL");
  // 외래 키 활성화
  await db.execAsync("PRAGMA foreign_keys = ON");

  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  // 버전 0 → 1: 초기 스키마 생성
  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      for (const sql of CREATE_TABLES_SQL) {
        await db.execAsync(sql);
      }
    });
  }

  // 버전 1 → 2: self_rating/teacher_rating → adjustment (능력 보정)
  if (currentVersion >= 1 && currentVersion < 2) {
    await db.withTransactionAsync(async () => {
      // adjustment 컬럼 추가
      await db.execAsync(
        "ALTER TABLE students ADD COLUMN adjustment INTEGER NOT NULL DEFAULT 0"
      );
      // 기존 데이터 변환: (self + teacher) / 2 - 3 → -2 ~ +2 범위
      await db.execAsync(
        `UPDATE students SET adjustment = CASE
          WHEN self_rating IS NOT NULL AND teacher_rating IS NOT NULL
            THEN ROUND((self_rating + teacher_rating) / 2.0 - 3)
          WHEN teacher_rating IS NOT NULL THEN ROUND(teacher_rating - 3)
          WHEN self_rating IS NOT NULL THEN ROUND(self_rating - 3)
          ELSE 0
        END`
      );
    });
  }

  // 버전 2 → 3: team_count 제한 2~4 → 2~6 확장 + FK 참조 수정
  if (currentVersion >= 1 && currentVersion < 3) {
    // 외래 키 임시 비활성화 (테이블 재생성 시 필요)
    await db.execAsync("PRAGMA foreign_keys = OFF");
    await db.withTransactionAsync(async () => {
      // --- teams 테이블 재생성 ---
      await db.execAsync("ALTER TABLE teams RENAME TO teams_old");
      await db.execAsync(`CREATE TABLE teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade INTEGER NOT NULL,
        class INTEGER NOT NULL,
        team_type TEXT NOT NULL CHECK(team_type IN ('mixed', 'separate')),
        team_count INTEGER NOT NULL CHECK(team_count BETWEEN 2 AND 6),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      )`);
      await db.execAsync("INSERT INTO teams SELECT * FROM teams_old");
      await db.execAsync("DROP TABLE teams_old");

      // --- team_members FK 참조 수정 ---
      await db.execAsync("ALTER TABLE team_members RENAME TO team_members_old");
      await db.execAsync(`CREATE TABLE team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        team_name TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`);
      await db.execAsync("INSERT INTO team_members SELECT * FROM team_members_old");
      await db.execAsync("DROP TABLE team_members_old");
      await db.execAsync("CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)");

      // --- game_records FK 참조 수정 ---
      await db.execAsync("ALTER TABLE game_records RENAME TO game_records_old");
      await db.execAsync(`CREATE TABLE game_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        game_type TEXT NOT NULL,
        game_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        result_type TEXT NOT NULL CHECK(result_type IN ('winner', 'score')),
        winner_team TEXT,
        scores TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )`);
      await db.execAsync("INSERT INTO game_records SELECT * FROM game_records_old");
      await db.execAsync("DROP TABLE game_records_old");
      await db.execAsync("CREATE INDEX IF NOT EXISTS idx_game_records_team ON game_records(team_id)");
    });
    // 외래 키 다시 활성화
    await db.execAsync("PRAGMA foreign_keys = ON");
  }

  // 버전 3 → 4: v3 마이그레이션에서 깨진 FK 참조 수정
  if (currentVersion === 3) {
    await db.execAsync("PRAGMA foreign_keys = OFF");
    await db.withTransactionAsync(async () => {
      // team_members FK: teams_old → teams
      await db.execAsync("ALTER TABLE team_members RENAME TO team_members_old");
      await db.execAsync(`CREATE TABLE team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        team_name TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`);
      await db.execAsync("INSERT INTO team_members SELECT * FROM team_members_old");
      await db.execAsync("DROP TABLE team_members_old");
      await db.execAsync("CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)");

      // game_records FK: teams_old → teams
      await db.execAsync("ALTER TABLE game_records RENAME TO game_records_old");
      await db.execAsync(`CREATE TABLE game_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        game_type TEXT NOT NULL,
        game_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        result_type TEXT NOT NULL CHECK(result_type IN ('winner', 'score')),
        winner_team TEXT,
        scores TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )`);
      await db.execAsync("INSERT INTO game_records SELECT * FROM game_records_old");
      await db.execAsync("DROP TABLE game_records_old");
      await db.execAsync("CREATE INDEX IF NOT EXISTS idx_game_records_team ON game_records(team_id)");
    });
    await db.execAsync("PRAGMA foreign_keys = ON");
  }

  // 버전 4 → 5: teams.label 컬럼 추가 (팀 용도 레이블)
  // 안전장치: 컬럼 존재 여부 먼저 확인 (이전 마이그레이션 실패 시 대응)
  {
    const cols = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(teams)"
    );
    const hasLabel = cols.some((c) => c.name === "label");
    if (!hasLabel) {
      await db.execAsync(
        "ALTER TABLE teams ADD COLUMN label TEXT NOT NULL DEFAULT ''"
      );
    }
  }

  // 마이그레이션 완료 후 버전 업데이트
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
