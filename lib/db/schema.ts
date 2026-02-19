// QuickTeams DB Schema v5
// 5개 테이블: STUDENTS, TEAMS, TEAM_MEMBERS, GAME_RECORDS, INDIVIDUAL_RECORDS
// v5: teams.label 컬럼 추가 (팀 용도 레이블)

export const SCHEMA_VERSION = 5;

export const CREATE_TABLES_SQL = [
  // 학생 테이블
  `CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 6),
    class INTEGER NOT NULL CHECK(class BETWEEN 1 AND 20),
    student_number INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('M', 'F')),
    running_record TEXT,
    adjustment INTEGER NOT NULL DEFAULT 0,
    ability_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(grade, class, student_number)
  )`,

  // 팀 그룹 테이블
  `CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    grade INTEGER NOT NULL,
    class INTEGER NOT NULL,
    team_type TEXT NOT NULL CHECK(team_type IN ('mixed', 'separate')),
    team_count INTEGER NOT NULL CHECK(team_count BETWEEN 2 AND 6),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`,

  // 팀 멤버 테이블 (N:M 관계)
  `CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,

  // 경기 기록 테이블
  `CREATE TABLE IF NOT EXISTS game_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    game_type TEXT NOT NULL,
    game_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    result_type TEXT NOT NULL CHECK(result_type IN ('winner', 'score')),
    winner_team TEXT,
    scores TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  )`,

  // 개인 기록 테이블
  `CREATE TABLE IF NOT EXISTS individual_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_record_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    record_type TEXT NOT NULL CHECK(record_type IN ('warning', 'note', 'achievement')),
    description TEXT,
    FOREIGN KEY (game_record_id) REFERENCES game_records(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`,

  // 인덱스
  `CREATE INDEX IF NOT EXISTS idx_students_grade_class ON students(grade, class)`,
  `CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_game_records_team ON game_records(team_id)`,
];
