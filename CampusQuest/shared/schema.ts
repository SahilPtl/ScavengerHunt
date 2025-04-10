import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  profilePicture: text("profile_picture"),
  teamId: integer("team_id"), // Current active team (can be null if user isn't in a team)
});

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Clue = {
  text: string;
  hint: string;
  coordinates: Coordinates;
};

export type Message = {
  senderId: number;
  content: string;
  timestamp: Date;
};

export const hunts = pgTable("hunts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  creatorId: integer("creator_id").notNull(),
  clues: json("clues").$type<Clue[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isPublic: boolean("is_public").notNull().default(true),
  sharedWith: json("shared_with").$type<number[]>().notNull().default([]),
  messages: json("messages").$type<Message[]>().notNull().default([]),
});

export const huntCompletions = pgTable("hunt_completions", {
  id: serial("id").primaryKey(),
  huntId: integer("hunt_id").notNull(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id"), // Can be null if user isn't in a team
  completionTime: integer("completion_time").notNull(), // in seconds
  hintsUsed: integer("hints_used").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // Unique code for team joining
  creatorId: integer("creator_id").notNull(), // User who created the team
  createdAt: timestamp("created_at").defaultNow(),
  description: text("description"),
  avatar: text("avatar"),
  messages: json("messages").$type<Message[]>().notNull().default([]),
});

// Team memberships table (many-to-many relationship between users and teams)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  profilePicture: true,
  teamId: true,
});

export const insertHuntSchema = createInsertSchema(hunts).pick({
  name: true,
  description: true,
  clues: true,
  isPublic: true,
  sharedWith: true,
});

export const insertHuntCompletionSchema = createInsertSchema(huntCompletions).pick({
  huntId: true,
  completionTime: true,
  hintsUsed: true,
  teamId: true, // Include teamId for team leaderboard functionality
});

// Create insert schemas for teams and team members
export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  code: true,
  description: true,
  avatar: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  isAdmin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHunt = z.infer<typeof insertHuntSchema>;
export type InsertHuntCompletion = z.infer<typeof insertHuntCompletionSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type User = typeof users.$inferSelect;
export type Hunt = typeof hunts.$inferSelect;
export type HuntCompletion = typeof huntCompletions.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;