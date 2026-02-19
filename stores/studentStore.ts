import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Student, StudentInput } from "@/lib/types";
import * as repo from "@/lib/db/repositories/studentRepository";

type StudentState = {
  students: Student[];
  selectedGrade: number;
  selectedClass: number;
  isLoading: boolean;

  setFilter: (grade: number, classNum: number) => void;
  loadStudents: (db: SQLiteDatabase) => Promise<void>;
  addStudent: (db: SQLiteDatabase, input: StudentInput) => Promise<number>;
  editStudent: (
    db: SQLiteDatabase,
    id: number,
    input: Partial<StudentInput>
  ) => Promise<void>;
  removeStudent: (db: SQLiteDatabase, id: number) => Promise<void>;
  removeStudentsByClass: (db: SQLiteDatabase) => Promise<number>;
  recalculateScores: (db: SQLiteDatabase) => Promise<void>;
};

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  selectedGrade: 1,
  selectedClass: 1,
  isLoading: false,

  setFilter: (grade, classNum) => {
    set({ selectedGrade: grade, selectedClass: classNum });
  },

  loadStudents: async (db) => {
    set({ isLoading: true });
    const { selectedGrade, selectedClass } = get();
    const students = await repo.getStudentsByClass(
      db,
      selectedGrade,
      selectedClass
    );
    set({ students, isLoading: false });
  },

  addStudent: async (db, input) => {
    const id = await repo.insertStudent(db, input);
    await get().loadStudents(db);
    return id;
  },

  editStudent: async (db, id, input) => {
    await repo.updateStudent(db, id, input);
    await get().loadStudents(db);
  },

  removeStudent: async (db, id) => {
    await repo.deleteStudent(db, id);
    await get().loadStudents(db);
  },

  removeStudentsByClass: async (db) => {
    const { selectedGrade, selectedClass } = get();
    const count = await repo.deleteStudentsByClass(db, selectedGrade, selectedClass);
    await get().loadStudents(db);
    return count;
  },

  recalculateScores: async (db) => {
    const { selectedGrade, selectedClass } = get();
    await repo.recalculateAbilityScores(db, selectedGrade, selectedClass);
    await get().loadStudents(db);
  },
}));
