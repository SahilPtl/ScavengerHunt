import { useState, useEffect, useCallback } from 'react';
import { Team, User, Message } from '@shared/schema';
import { useAuth } from './use-auth';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface TeamChatState {
  isConnected: boolean;
  messages: Message[];
  activeMembers: number;
  sendMessage: (content: string) => void;
}

export function useTeam(teamId?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to get team data
  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ['/api/teams', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch team');
      }
      return response.json();
    },
    enabled: !!teamId
  });

  // Query to get team members
  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'members'],
    queryFn: async () => {
      if (!teamId) return [];
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
    enabled: !!teamId
  });

  // Query to get teams for the current user
  const { data: userTeams, isLoading: isUserTeamsLoading } = useQuery({
    queryKey: ['/api/user/teams'],
    queryFn: async () => {
      const response = await fetch('/api/user/teams');
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error('Failed to fetch user teams');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Mutation to create a new team
  const createTeamMutation = useMutation({
    mutationFn: async (newTeam: { name: string; code: string; description?: string; avatar?: string }) => {
      return apiRequest("POST", '/api/teams', newTeam);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/teams'] });
    }
  });

  // Mutation to join a team by code
  const joinTeamByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      // First get the team ID from the code
      const teamResponse = await fetch(`/api/teams/code/${code}`);
      if (!teamResponse.ok) {
        if (teamResponse.status === 404) throw new Error('Team not found with this code');
        throw new Error('Failed to find team');
      }
      
      const team = await teamResponse.json() as Team;
      
      // Then join the team
      return apiRequest("POST", `/api/teams/${team.id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/teams'] });
    }
  });

  // Mutation to leave a team
  const leaveTeamMutation = useMutation({
    mutationFn: async (teamIdToLeave: number) => {
      return apiRequest("DELETE", `/api/teams/${teamIdToLeave}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/teams'] });
    }
  });

  // Team chat functionality using WebSockets
  const [chatState, setChatState] = useState<TeamChatState>({
    isConnected: false,
    messages: [],
    activeMembers: 0,
    sendMessage: () => {}
  });

  useEffect(() => {
    if (!user || !teamId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const socket = new WebSocket(`${wsProtocol}//${wsHost}/ws/team?userId=${user.id}&teamId=${teamId}`);
    
    let reconnectTimeout: NodeJS.Timeout;
    
    const handleOpen = () => {
      console.log('Team WebSocket connected');
      setChatState(prev => ({ ...prev, isConnected: true }));
    };
    
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Team WebSocket message received:', data);
      
      if (data.type === 'chat_history') {
        setChatState(prev => ({ ...prev, messages: data.messages }));
      } else if (data.type === 'chat_message') {
        setChatState(prev => ({ 
          ...prev, 
          messages: [...prev.messages, data.message] 
        }));
      } else if (data.type === 'member_count') {
        setChatState(prev => ({ ...prev, activeMembers: data.count }));
      }
    };
    
    const handleClose = () => {
      console.log('Team WebSocket disconnected, reconnecting...');
      setChatState(prev => ({ ...prev, isConnected: false }));
      
      // Attempt to reconnect
      reconnectTimeout = setTimeout(() => {
        window.location.reload();
      }, 5000);
    };
    
    const handleError = (error: Event) => {
      console.error('Team WebSocket error:', error);
    };
    
    // Function to send a message
    const sendMessage = (content: string) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error('Team WebSocket not connected');
        return;
      }
      
      socket.send(JSON.stringify({
        type: 'chat_message',
        message: { content }
      }));
    };
    
    setChatState(prev => ({ ...prev, sendMessage }));
    
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);
    
    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      
      socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [user, teamId]);

  return {
    team,
    members,
    userTeams,
    isTeamLoading,
    isMembersLoading,
    isUserTeamsLoading,
    createTeam: createTeamMutation.mutate,
    isCreatingTeam: createTeamMutation.isPending,
    joinTeamByCode: joinTeamByCodeMutation.mutate,
    isJoiningTeam: joinTeamByCodeMutation.isPending,
    leaveTeam: leaveTeamMutation.mutate,
    isLeavingTeam: leaveTeamMutation.isPending,
    chatState
  };
}