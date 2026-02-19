import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Team } from "@/lib/types";
import * as repo from "@/lib/db/repositories/teamRepository";

type TeamMemberWithInfo = {
  id: number;
  teamId: number;
  studentId: number;
  teamName: string;
  studentName: string;
  gender: string;
  abilityScore: number | null;
};

type TeamState = {
  teams: Team[];
  currentTeam: Team | null;
  currentMembers: TeamMemberWithInfo[];
  isLoading: boolean;

  loadAllTeams: (db: SQLiteDatabase) => Promise<void>;
  loadTeams: (db: SQLiteDatabase, grade: number, classNum: number) => Promise<void>;
  loadTeamsByGrade: (db: SQLiteDatabase, grade: number) => Promise<void>;
  loadTeamDetail: (db: SQLiteDatabase, teamId: number) => Promise<void>;
  createTeam: (
    db: SQLiteDatabase,
    team: {
      name: string;
      label: string;
      grade: number;
      class: number;
      teamType: "mixed" | "separate";
      teamCount: number;
    },
    members: { studentId: number; teamName: string }[]
  ) => Promise<number>;
  updateLabel: (db: SQLiteDatabase, id: number, label: string) => Promise<void>;
  reassignMembers: (
    db: SQLiteDatabase,
    teamId: number,
    members: { studentId: number; teamName: string }[]
  ) => Promise<void>;
  removeTeam: (db: SQLiteDatabase, id: number) => Promise<void>;
};

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  currentTeam: null,
  currentMembers: [],
  isLoading: false,

  loadAllTeams: async (db) => {
    set({ isLoading: true });
    const teams = await repo.getAllTeams(db);
    set({ teams, isLoading: false });
  },

  loadTeams: async (db, grade, classNum) => {
    set({ isLoading: true });
    const teams = await repo.getTeamsByClass(db, grade, classNum);
    set({ teams, isLoading: false });
  },

  loadTeamsByGrade: async (db, grade) => {
    set({ isLoading: true });
    const teams = await repo.getTeamsByGrade(db, grade);
    set({ teams, isLoading: false });
  },

  loadTeamDetail: async (db, teamId) => {
    set({ isLoading: true });
    const [team, members] = await Promise.all([
      repo.getTeamById(db, teamId),
      repo.getTeamMembers(db, teamId),
    ]);
    set({ currentTeam: team, currentMembers: members, isLoading: false });
  },

  createTeam: async (db, team, members) => {
    const teamId = await repo.insertTeam(db, team);
    await repo.insertTeamMembers(db, teamId, members);
    return teamId;
  },

  updateLabel: async (db, id, label) => {
    await repo.updateTeamLabel(db, id, label);
  },

  reassignMembers: async (db, teamId, members) => {
    await repo.deleteTeamMembers(db, teamId);
    await repo.insertTeamMembers(db, teamId, members);
  },

  removeTeam: async (db, id) => {
    await repo.deleteTeam(db, id);
  },
}));
