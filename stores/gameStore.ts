import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import type { GameRecord } from "@/lib/types";
import * as repo from "@/lib/db/repositories/gameRepository";

type GameRecordWithTeam = GameRecord & { teamName: string };
type IndividualRecordWithName = {
  id: number;
  gameRecordId: number;
  studentId: number;
  recordType: "warning" | "note" | "achievement";
  description: string | null;
  studentName: string;
};

type GameState = {
  records: GameRecordWithTeam[];
  currentRecord: GameRecord | null;
  individualRecords: IndividualRecordWithName[];
  isLoading: boolean;

  loadAllRecords: (db: SQLiteDatabase) => Promise<void>;
  loadRecordsByTeam: (db: SQLiteDatabase, teamId: number) => Promise<void>;
  loadRecordDetail: (db: SQLiteDatabase, recordId: number) => Promise<void>;
  saveGameRecord: (
    db: SQLiteDatabase,
    record: {
      teamId: number;
      gameType: string;
      resultType: "winner" | "score";
      winnerTeam?: string;
      scores?: Record<string, number>;
    }
  ) => Promise<number>;
  addIndividualRecord: (
    db: SQLiteDatabase,
    record: {
      gameRecordId: number;
      studentId: number;
      recordType: "warning" | "note" | "achievement";
      description?: string;
    }
  ) => Promise<void>;
  removeRecord: (db: SQLiteDatabase, id: number) => Promise<void>;
};

export const useGameStore = create<GameState>((set) => ({
  records: [],
  currentRecord: null,
  individualRecords: [],
  isLoading: false,

  loadAllRecords: async (db) => {
    set({ isLoading: true });
    const records = await repo.getAllGameRecords(db);
    set({ records, isLoading: false });
  },

  loadRecordsByTeam: async (db, teamId) => {
    set({ isLoading: true });
    const rawRecords = await repo.getGameRecordsByTeam(db, teamId);
    const records = rawRecords.map((r) => ({ ...r, teamName: "" }));
    set({ records, isLoading: false });
  },

  loadRecordDetail: async (db, recordId) => {
    set({ isLoading: true });
    const [record, individual] = await Promise.all([
      repo.getGameRecordById(db, recordId),
      repo.getIndividualRecords(db, recordId),
    ]);
    set({
      currentRecord: record,
      individualRecords: individual,
      isLoading: false,
    });
  },

  saveGameRecord: async (db, record) => {
    return await repo.insertGameRecord(db, record);
  },

  addIndividualRecord: async (db, record) => {
    await repo.insertIndividualRecord(db, record);
  },

  removeRecord: async (db, id) => {
    await repo.deleteGameRecord(db, id);
  },
}));
