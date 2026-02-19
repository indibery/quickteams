import type { SQLiteDatabase } from "expo-sqlite";
import type { Student, StudentInput } from "@/lib/types";
import {
  calculateAbilityScore,
  parseRunningRecord,
  convertRunningToScore,
} from "@/lib/algorithms/abilityScore";

// DB row → Student 객체 변환
function rowToStudent(row: any): Student {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    class: row.class,
    studentNumber: row.student_number,
    gender: row.gender,
    runningRecord: row.running_record,
    adjustment: row.adjustment ?? 0,
    abilityScore: row.ability_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 학년/반별 학생 목록 조회 */
export async function getStudentsByClass(
  db: SQLiteDatabase,
  grade: number,
  classNum: number
): Promise<Student[]> {
  const rows = await db.getAllAsync(
    "SELECT * FROM students WHERE grade = ? AND class = ? ORDER BY student_number",
    [grade, classNum]
  );
  return rows.map(rowToStudent);
}

/** 전체 학생 목록 조회 */
export async function getAllStudents(db: SQLiteDatabase): Promise<Student[]> {
  const rows = await db.getAllAsync(
    "SELECT * FROM students ORDER BY grade, class, student_number"
  );
  return rows.map(rowToStudent);
}

/** 학생 1명 조회 */
export async function getStudentById(
  db: SQLiteDatabase,
  id: number
): Promise<Student | null> {
  const row = await db.getFirstAsync("SELECT * FROM students WHERE id = ?", [
    id,
  ]);
  return row ? rowToStudent(row) : null;
}

/** 학생 추가 */
export async function insertStudent(
  db: SQLiteDatabase,
  input: StudentInput
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO students (name, grade, class, student_number, gender, running_record, adjustment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.grade,
      input.class,
      input.studentNumber,
      input.gender,
      input.runningRecord ?? null,
      input.adjustment ?? 0,
    ]
  );
  return result.lastInsertRowId;
}

/** 학생 정보 수정 */
export async function updateStudent(
  db: SQLiteDatabase,
  id: number,
  input: Partial<StudentInput>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.grade !== undefined) {
    fields.push("grade = ?");
    values.push(input.grade);
  }
  if (input.class !== undefined) {
    fields.push("class = ?");
    values.push(input.class);
  }
  if (input.studentNumber !== undefined) {
    fields.push("student_number = ?");
    values.push(input.studentNumber);
  }
  if (input.gender !== undefined) {
    fields.push("gender = ?");
    values.push(input.gender);
  }
  if (input.runningRecord !== undefined) {
    fields.push("running_record = ?");
    values.push(input.runningRecord);
  }
  if (input.adjustment !== undefined) {
    fields.push("adjustment = ?");
    values.push(input.adjustment);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now', 'localtime')");

  await db.runAsync(
    `UPDATE students SET ${fields.join(", ")} WHERE id = ?`,
    [...values, id]
  );
}

/** 학생 삭제 */
export async function deleteStudent(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync("DELETE FROM students WHERE id = ?", [id]);
}

/** 학급 전체 삭제 */
export async function deleteStudentsByClass(
  db: SQLiteDatabase,
  grade: number,
  classNum: number
): Promise<number> {
  const result = await db.runAsync(
    "DELETE FROM students WHERE grade = ? AND class = ?",
    [grade, classNum]
  );
  return result.changes; // 삭제된 학생 수 반환
}

/** 학년/반 학생들의 능력 점수 일괄 계산 및 업데이트 */
export async function recalculateAbilityScores(
  db: SQLiteDatabase,
  grade: number,
  classNum: number
): Promise<void> {
  const students = await getStudentsByClass(db, grade, classNum);

  // 달리기 기록이 있는 학생들의 초 단위 기록 수집
  const runningSeconds: { id: number; seconds: number }[] = [];
  for (const s of students) {
    if (s.runningRecord) {
      const sec = parseRunningRecord(s.runningRecord);
      if (sec != null) runningSeconds.push({ id: s.id, seconds: sec });
    }
  }

  const allSeconds = runningSeconds.map((r) => r.seconds);

  for (const student of students) {
    let runningScore: number | undefined;

    if (student.runningRecord) {
      const sec = parseRunningRecord(student.runningRecord);
      if (sec != null && allSeconds.length > 0) {
        runningScore = convertRunningToScore(sec, allSeconds);
      }
    }

    const abilityScore = calculateAbilityScore({
      runningScore,
      adjustment: student.adjustment,
    });

    await db.runAsync("UPDATE students SET ability_score = ? WHERE id = ?", [
      abilityScore,
      student.id,
    ]);
  }
}

/** 학생 대량 일괄 삽입 (트랜잭션) */
export async function insertStudentsBatch(
  db: SQLiteDatabase,
  grade: number,
  classNum: number,
  students: { studentNumber: number; name: string; gender: "M" | "F"; runningRecord?: string | null }[]
): Promise<number> {
  let insertedCount = 0;
  await db.withTransactionAsync(async () => {
    for (const s of students) {
      await db.runAsync(
        `INSERT INTO students (name, grade, class, student_number, gender, running_record, adjustment)
         VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(grade, class, student_number) DO UPDATE SET
           name = excluded.name,
           gender = excluded.gender,
           running_record = COALESCE(excluded.running_record, running_record)`,
        [s.name, grade, classNum, s.studentNumber, s.gender, s.runningRecord ?? null]
      );
      insertedCount++;
    }
  });
  return insertedCount;
}

/** 존재하는 학년/반 목록 조회 */
export async function getDistinctClasses(
  db: SQLiteDatabase
): Promise<{ grade: number; class: number; count: number }[]> {
  const rows = await db.getAllAsync<{
    grade: number;
    class: number;
    count: number;
  }>(
    "SELECT grade, class, COUNT(*) as count FROM students GROUP BY grade, class ORDER BY grade, class"
  );
  return rows;
}
