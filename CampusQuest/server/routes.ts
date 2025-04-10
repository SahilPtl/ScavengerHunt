import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertHuntSchema, insertHuntCompletionSchema, insertTeamSchema, insertTeamMemberSchema, type Message } from "@shared/schema";
import { URL } from "url";

// Track active hunt sessions
const activeHunts = new Map<string, {
  userId: number;
  huntId: number;
  socket: WebSocket;
  currentClueIndex: number;
}>();

// Track active team chat sessions
const activeTeamChats = new Map<string, {
  userId: number;
  teamId: number;
  socket: WebSocket;
}>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Expose the Google Maps API key to the frontend
  app.get("/api/config/maps", (req, res) => {
    res.json({
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ""
    });
  });
  setupAuth(app);
  const httpServer = createServer(app);

  // Create WebSocket servers
  const huntWss = new WebSocketServer({ server: httpServer, path: '/ws/hunt' });
  const teamWss = new WebSocketServer({ server: httpServer, path: '/ws/team' });

  huntWss.on('connection', async (ws, req) => {
    try {
      // Parse URL and get query parameters
      const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const url = new URL(req.url!, `${protocol}://${req.headers.host}`);
      const userId = parseInt(url.searchParams.get('userId') || '');
      const huntId = parseInt(url.searchParams.get('huntId') || '');

      if (isNaN(userId) || isNaN(huntId)) {
        console.log('Invalid userId or huntId:', { userId, huntId });
        ws.close(1008, 'Invalid user or hunt ID');
        return;
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found:', userId);
        ws.close(1008, 'User not found');
        return;
      }
      
      // Get the user's team ID if they have one
      const teamId = user.teamId;

      // Register the session
      const sessionKey = `${userId}-${huntId}`;
      activeHunts.set(sessionKey, {
        userId,
        huntId,
        socket: ws,
        currentClueIndex: 0
      });

      // Send chat history immediately
      const hunt = await storage.getHunt(huntId);
      if (hunt && hunt.messages) {
        console.log('Sending chat history to new user:', { userId, huntId });
        ws.send(JSON.stringify({
          type: 'chat_history',
          messages: hunt.messages
        }));
      }

      // Update player count
      const playersInHunt = Array.from(activeHunts.values())
        .filter(session => session.huntId === huntId);

      playersInHunt.forEach(session => {
        session.socket.send(JSON.stringify({
          type: 'player_count',
          count: playersInHunt.length
        }));
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('WebSocket message received:', message);

          switch (message.type) {
            case 'chat_message':
              if (!message.message || !message.message.content) {
                console.log('Invalid message format:', message);
                return;
              }

              const newMessage: Message = {
                senderId: userId,
                content: message.message.content,
                timestamp: new Date()
              };

              // Add message to hunt
              const updatedHunt = await storage.addHuntMessage(huntId, newMessage);
              if (!updatedHunt) return;

              console.log('Broadcasting message:', newMessage);

              // Broadcast message to all players in the hunt
              activeHunts.forEach((session) => {
                if (session.huntId === huntId) {
                  session.socket.send(JSON.stringify({
                    type: 'chat_message',
                    message: newMessage
                  }));
                }
              });
              break;

            case 'update_position':
              const currentSession = activeHunts.get(sessionKey);
              if (currentSession) {
                currentSession.currentClueIndex = message.currentClueIndex;

                // Broadcast position to other players
                activeHunts.forEach((session) => {
                  if (session.huntId === huntId && session.userId !== userId) {
                    session.socket.send(JSON.stringify({
                      type: 'player_position',
                      userId,
                      position: message.position,
                      currentClueIndex: message.currentClueIndex,
                      heading: message.heading, // Forward heading information if available
                      teamId: teamId // Include the team ID so players can be grouped by team
                    }));
                  }
                });
              }
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        activeHunts.delete(sessionKey);

        // Update player count
        const remainingPlayers = Array.from(activeHunts.values())
          .filter(session => session.huntId === huntId);

        remainingPlayers.forEach(session => {
          session.socket.send(JSON.stringify({
            type: 'player_count',
            count: remainingPlayers.length
          }));
        });
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1008, 'Connection error');
    }
  });

  // Set up team WebSocket handler
  teamWss.on('connection', async (ws, req) => {
    try {
      // Parse URL and get query parameters
      const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const url = new URL(req.url!, `${protocol}://${req.headers.host}`);
      const userId = parseInt(url.searchParams.get('userId') || '');
      const teamId = parseInt(url.searchParams.get('teamId') || '');

      if (isNaN(userId) || isNaN(teamId)) {
        console.log('Invalid userId or teamId:', { userId, teamId });
        ws.close(1008, 'Invalid user or team ID');
        return;
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found:', userId);
        ws.close(1008, 'User not found');
        return;
      }

      // Verify team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        console.log('Team not found:', teamId);
        ws.close(1008, 'Team not found');
        return;
      }

      // Verify user is a member of the team
      const teamMembers = await storage.getTeamMembers(teamId);
      if (!teamMembers.some(member => member.userId === userId)) {
        console.log('User is not a member of this team:', { userId, teamId });
        ws.close(1008, 'Not a team member');
        return;
      }

      // Register the team chat session
      const sessionKey = `${userId}-${teamId}`;
      activeTeamChats.set(sessionKey, {
        userId,
        teamId,
        socket: ws
      });

      // Send chat history immediately
      if (team.messages && team.messages.length > 0) {
        console.log('Sending team chat history to user:', { userId, teamId });
        ws.send(JSON.stringify({
          type: 'chat_history',
          messages: team.messages
        }));
      }

      // Send active members count
      const activeMembers = Array.from(activeTeamChats.values())
        .filter(session => session.teamId === teamId);
      
      activeMembers.forEach(session => {
        session.socket.send(JSON.stringify({
          type: 'member_count',
          count: activeMembers.length
        }));
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Team WebSocket message received:', message);

          if (message.type === 'chat_message') {
            if (!message.message || !message.message.content) {
              console.log('Invalid message format:', message);
              return;
            }

            const newMessage: Message = {
              senderId: userId,
              content: message.message.content,
              timestamp: new Date()
            };

            // Add message to team
            const updatedTeam = await storage.addTeamMessage(teamId, newMessage);
            if (!updatedTeam) return;

            console.log('Broadcasting team message:', newMessage);

            // Broadcast message to all team members
            activeTeamChats.forEach((session) => {
              if (session.teamId === teamId) {
                session.socket.send(JSON.stringify({
                  type: 'chat_message',
                  message: newMessage
                }));
              }
            });
          }
        } catch (error) {
          console.error('Team WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        activeTeamChats.delete(sessionKey);

        // Update active members count
        const remainingMembers = Array.from(activeTeamChats.values())
          .filter(session => session.teamId === teamId);

        remainingMembers.forEach(session => {
          session.socket.send(JSON.stringify({
            type: 'member_count',
            count: remainingMembers.length
          }));
        });
      });

    } catch (error) {
      console.error('Team WebSocket connection error:', error);
      ws.close(1008, 'Connection error');
    }
  });

  // Hunt routes
  app.get("/api/hunts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const hunts = await storage.listPublicHunts(req.user.id);
    res.json(hunts);
  });

  app.get("/api/hunts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const hunt = await storage.getHunt(parseInt(req.params.id));
    if (!hunt) return res.status(404).send("Hunt not found");

    // Check if user has access to this hunt
    if (!hunt.isPublic &&
      hunt.creatorId !== req.user.id &&
      !hunt.sharedWith.includes(req.user.id)) {
      return res.status(403).send("You don't have access to this hunt");
    }

    res.json(hunt);
  });

  app.post("/api/hunts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parseResult = insertHuntSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const hunt = await storage.createHunt(parseResult.data, req.user.id);
    res.status(201).json(hunt);
  });

  app.get("/api/hunts/:id/completions", async (req, res) => {
    const completions = await storage.getHuntCompletions(parseInt(req.params.id));
    res.json(completions);
  });

  app.post("/api/hunts/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parseResult = insertHuntCompletionSchema.safeParse({
      ...req.body,
      huntId: parseInt(req.params.id),
    });

    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const completion = await storage.createHuntCompletion(
      parseResult.data,
      req.user.id,
    );
    res.status(201).json(completion);
  });

  app.post("/api/hunts/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const huntId = parseInt(req.params.id);
    const hunt = await storage.getHunt(huntId);

    if (!hunt) return res.status(404).send("Hunt not found");
    if (hunt.creatorId !== req.user.id) {
      return res.status(403).send("Only the creator can share this hunt");
    }

    const { isPublic, sharedWith } = req.body;
    const updatedHunt = await storage.updateHuntSharing(
      huntId,
      isPublic,
      sharedWith
    );

    res.json(updatedHunt);
  });

  // Team Routes
  app.get("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const teams = await storage.listTeams();
    res.json(teams);
  });

  app.get("/api/teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const team = await storage.getTeam(parseInt(req.params.id));
    if (!team) return res.status(404).send("Team not found");
    
    res.json(team);
  });

  app.post("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parseResult = insertTeamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const team = await storage.createTeam(parseResult.data, req.user.id);
    res.status(201).json(team);
  });

  app.get("/api/teams/code/:code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const team = await storage.getTeamByCode(req.params.code);
    if (!team) return res.status(404).send("Team not found");
    
    res.json(team);
  });

  app.get("/api/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.id);
    const team = await storage.getTeam(teamId);
    if (!team) return res.status(404).send("Team not found");
    
    const members = await storage.getTeamMembers(teamId);
    res.json(members);
  });

  app.post("/api/teams/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.id);
    const team = await storage.getTeam(teamId);
    if (!team) return res.status(404).send("Team not found");
    
    // Add the user to the team
    const teamMember = await storage.addTeamMember(teamId, req.user.id);
    
    // Update the user's team ID
    await storage.updateUserTeam(req.user.id, teamId);
    
    res.status(201).json(teamMember);
  });

  app.delete("/api/teams/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.id);
    const team = await storage.getTeam(teamId);
    if (!team) return res.status(404).send("Team not found");
    
    // Remove user from team
    await storage.removeTeamMember(teamId, req.user.id);
    
    // Update user's teamId to null
    await storage.updateUserTeam(req.user.id, null);
    
    res.sendStatus(204);
  });

  app.post("/api/teams/:id/message", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teamId = parseInt(req.params.id);
    const team = await storage.getTeam(teamId);
    if (!team) return res.status(404).send("Team not found");
    
    // Verify user is a member of this team
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user.id);
    if (!isMember) {
      return res.status(403).send("You must be a team member to send messages");
    }
    
    const { content } = req.body;
    if (!content) {
      return res.status(400).send("Message content is required");
    }
    
    const message: Message = {
      senderId: req.user.id,
      content,
      timestamp: new Date()
    };
    
    const updatedTeam = await storage.addTeamMessage(teamId, message);
    res.json(updatedTeam);
  });

  app.get("/api/user/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const teams = await storage.getUserTeams(req.user.id);
    res.json(teams);
  });

  return httpServer;
}