import { IStorage } from "./storage.d";
import { User, Hunt, HuntCompletion, InsertUser, InsertHunt, InsertHuntCompletion, Message, Clue, Team, TeamMember, InsertTeam } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private hunts: Map<number, Hunt>;
  private huntCompletions: Map<number, HuntCompletion>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.hunts = new Map();
    this.huntCompletions = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with sample data
    this.initializePresetHunts();
  }
  
  private initializePresetHunts() {
    // Create a sample user if none exists
    if (this.users.size === 0) {
      const adminUser: User = {
        id: this.currentId++,
        username: "admin",
        password: "password", // In a real app, this would be hashed
        name: "Admin User",
        profilePicture: null,
        teamId: null
      };
      this.users.set(adminUser.id, adminUser);
    }
    
    // Create The Academic Adventure hunt
    const clues: Clue[] = [
      {
        text: "Where knowledge begins, and journeys unfold, find the next clue where stories are told.",
        hint: "Think of a place within the building where books are kept.",
        coordinates: { latitude: 25.494025, longitude: 81.866252 } // Academic Building Entrance
      },
      {
        text: "Among the shelves, where silence is gold, seek the section where tech tales are told.",
        hint: "Look for books related to programming and technology.",
        coordinates: { latitude: 25.493889, longitude: 81.866344 } // Central Library
      },
      {
        text: "From bytes to bites, where hunger meets code, find the next clue where students unload.",
        hint: "It's a place to eat near the academic area.",
        coordinates: { latitude: 25.493750, longitude: 81.866189 } // Computer Science Section
      },
      {
        text: "Where flavors mix and friends gather 'round, now head to where athletes are found.",
        hint: "Think of the largest sports field on campus.",
        coordinates: { latitude: 25.492983, longitude: 81.865861 } // Yamuna Canteen
      },
      {
        text: "On this field, where champions play, look for the spot where nets hold sway.",
        hint: "It's a specific area for a sport with a net.",
        coordinates: { latitude: 25.492025, longitude: 81.864950 } // Athletic Ground
      },
      {
        text: "From hoops to health, where muscles are made, find the next clue where fitness is displayed.",
        hint: "It's a workout spot just for guys.",
        coordinates: { latitude: 25.491681, longitude: 81.864767 } // Basketball Court
      },
      {
        text: "You've reached the end, where strength is key, claim your treasure, you've earned it, see!",
        hint: "Look under a bench for your prize.",
        coordinates: { latitude: 25.491525, longitude: 81.865050 } // Men's Gym
      }
    ];
    
    const sharedWith: number[] = [];
    const messages: Message[] = [];
    
    const academicAdventure: Hunt = {
      id: this.currentId++,
      name: "The Academic Adventure",
      description: "This hunt takes participants through the academic and athletic side of MNNIT, blending brainpower with physical spaces.",
      creatorId: 1, // Admin user ID
      clues,
      createdAt: new Date(),
      isPublic: true,
      sharedWith,
      messages
    };
    
    this.hunts.set(academicAdventure.id, academicAdventure);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id, 
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name || null,
      profilePicture: insertUser.profilePicture || null,
      teamId: insertUser.teamId || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserTeam(userId: number, teamId: number | null): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      teamId
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getHunt(id: number): Promise<Hunt | undefined> {
    return this.hunts.get(id);
  }

  async listHunts(): Promise<Hunt[]> {
    return Array.from(this.hunts.values());
  }

  async listPublicHunts(userId: number): Promise<Hunt[]> {
    return Array.from(this.hunts.values()).filter(hunt => 
      hunt.isPublic || hunt.creatorId === userId || hunt.sharedWith.includes(userId)
    );
  }

  async createHunt(insertHunt: InsertHunt, creatorId: number): Promise<Hunt> {
    const id = this.currentId++;
    const hunt: Hunt = {
      id,
      name: insertHunt.name,
      description: insertHunt.description,
      creatorId,
      clues: insertHunt.clues as Clue[],
      createdAt: new Date(),
      isPublic: insertHunt.isPublic ?? true,
      sharedWith: Array.isArray(insertHunt.sharedWith) ? [...insertHunt.sharedWith] : [],
      messages: []
    };
    this.hunts.set(id, hunt);
    return hunt;
  }

  async updateHuntSharing(id: number, isPublic: boolean, sharedWith: number[]): Promise<Hunt | undefined> {
    const hunt = this.hunts.get(id);
    if (!hunt) return undefined;

    const updatedHunt = {
      ...hunt,
      isPublic,
      sharedWith: Array.isArray(sharedWith) ? [...sharedWith] : []
    };
    this.hunts.set(id, updatedHunt);
    return updatedHunt;
  }

  async getHuntCompletions(huntId: number): Promise<HuntCompletion[]> {
    return Array.from(this.huntCompletions.values()).filter(
      (completion) => completion.huntId === huntId,
    );
  }

  async createHuntCompletion(
    insertCompletion: InsertHuntCompletion,
    userId: number,
  ): Promise<HuntCompletion> {
    const id = this.currentId++;
    const completion: HuntCompletion = {
      id,
      huntId: insertCompletion.huntId,
      userId,
      teamId: insertCompletion.teamId || null, // Store the team ID if provided
      completionTime: insertCompletion.completionTime,
      hintsUsed: insertCompletion.hintsUsed,
      completedAt: new Date(),
    };
    this.huntCompletions.set(id, completion);
    return completion;
  }

  async addHuntMessage(huntId: number, message: Message): Promise<Hunt | undefined> {
    const hunt = this.hunts.get(huntId);
    if (!hunt) return undefined;

    const messages = hunt.messages || [];
    const updatedHunt = {
      ...hunt,
      messages: [...messages, message]
    };
    this.hunts.set(huntId, updatedHunt);
    return updatedHunt;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByCode(code: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.code === code,
    );
  }

  async listTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async createTeam(insertTeam: InsertTeam, creatorId: number): Promise<Team> {
    const id = this.currentId++;
    const team: Team = {
      id,
      name: insertTeam.name,
      code: insertTeam.code,
      creatorId,
      createdAt: new Date(),
      description: insertTeam.description || null,
      avatar: insertTeam.avatar || null,
      messages: []
    };
    this.teams.set(id, team);
    
    // Add creator as an admin team member
    await this.addTeamMember(id, creatorId, true);
    
    return team;
  }

  async addTeamMember(teamId: number, userId: number, isAdmin: boolean = false): Promise<TeamMember> {
    const id = this.currentId++;
    const teamMember: TeamMember = {
      id,
      teamId,
      userId,
      joinedAt: new Date(),
      isAdmin
    };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    const teamMemberId = Array.from(this.teamMembers.values())
      .find(tm => tm.teamId === teamId && tm.userId === userId)?.id;
    
    if (teamMemberId) {
      this.teamMembers.delete(teamMemberId);
    }
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.teamId === teamId,
    );
  }

  async getUserTeams(userId: number): Promise<Team[]> {
    const userTeamIds = Array.from(this.teamMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.teamId);
    
    return Array.from(this.teams.values())
      .filter(team => userTeamIds.includes(team.id));
  }

  async addTeamMessage(teamId: number, message: Message): Promise<Team | undefined> {
    const team = this.teams.get(teamId);
    if (!team) return undefined;

    const messages = team.messages || [];
    const updatedTeam = {
      ...team,
      messages: [...messages, message]
    };
    this.teams.set(teamId, updatedTeam);
    return updatedTeam;
  }
}

export const storage = new MemStorage();