import { User, Hunt, HuntCompletion, InsertUser, InsertHunt, InsertHuntCompletion, Message, Team, TeamMember, InsertTeam, InsertTeamMember } from "@shared/schema";
import { Store } from "express-session";

export interface IStorage {
  sessionStore: Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserTeam(userId: number, teamId: number | null): Promise<User | undefined>;
  
  // Hunt methods
  getHunt(id: number): Promise<Hunt | undefined>;
  listHunts(): Promise<Hunt[]>;
  listPublicHunts(userId: number): Promise<Hunt[]>;
  createHunt(insertHunt: InsertHunt, creatorId: number): Promise<Hunt>;
  updateHuntSharing(id: number, isPublic: boolean, sharedWith: number[]): Promise<Hunt | undefined>;
  getHuntCompletions(huntId: number): Promise<HuntCompletion[]>;
  createHuntCompletion(insertCompletion: InsertHuntCompletion, userId: number): Promise<HuntCompletion>;
  addHuntMessage(huntId: number, message: Message): Promise<Hunt | undefined>;
  
  // Team methods
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByCode(code: string): Promise<Team | undefined>;
  listTeams(): Promise<Team[]>;
  createTeam(insertTeam: InsertTeam, creatorId: number): Promise<Team>;
  addTeamMember(teamId: number, userId: number, isAdmin?: boolean): Promise<TeamMember>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getUserTeams(userId: number): Promise<Team[]>;
  addTeamMessage(teamId: number, message: Message): Promise<Team | undefined>;
}