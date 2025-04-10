import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { HuntCompletion, Team } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Users, Medal, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Team colors for consistent visual identification
const TEAM_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-red-500",
  "bg-indigo-500",
];

interface TeamLeaderboardProps {
  huntId: number;
  className?: string;
}

interface TeamStats {
  teamId: number | null;
  teamName: string | null; 
  completions: number;
  fastestTime: number;
  averageTime: number;
  totalHints: number;
  color: string;
  totalTimeSum?: number; // Used for calculating averages
}

export default function TeamLeaderboard({ huntId, className }: TeamLeaderboardProps) {
  const prevRankingsRef = useRef<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<string>("fastest");
  const [animationTriggered, setAnimationTriggered] = useState<boolean>(false);
  
  // Fetch all hunt completions
  const { data: completions, isLoading: isCompletionsLoading } = useQuery<HuntCompletion[]>({
    queryKey: [`/api/hunts/${huntId}/completions`],
  });
  
  // Fetch all teams
  const { data: teams, isLoading: isTeamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  // Generate team statistics based on completions
  const teamStats = useGenerateTeamStats(completions, teams);
  
  // Sort team stats based on active tab
  const sortedStats = useSortedTeamStats(teamStats, activeTab);
  
  // Trigger animation when data changes
  useEffect(() => {
    if (sortedStats && !isCompletionsLoading && !isTeamsLoading) {
      // Delay to ensure DOM is updated
      setTimeout(() => {
        setAnimationTriggered(prevState => !prevState);
      }, 300);
      
      // Update previous rankings for comparison
      const newRankings: { [key: string]: number } = {};
      sortedStats.forEach((team, index) => {
        const key = team.teamId ? `team-${team.teamId}` : `individual-${team.teamName}`;
        newRankings[key] = index;
      });
      prevRankingsRef.current = newRankings;
    }
  }, [activeTab, sortedStats, isCompletionsLoading, isTeamsLoading]);
  
  const getTeamPreviousRank = (team: TeamStats): number => {
    const key = team.teamId ? `team-${team.teamId}` : `individual-${team.teamName}`;
    return prevRankingsRef.current[key] !== undefined ? prevRankingsRef.current[key] : -1;
  };
  
  if (isCompletionsLoading || isTeamsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Team Leaderboard
          </CardTitle>
          <CardDescription>Loading team statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="fastest" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Fastest
            </TabsTrigger>
            <TabsTrigger value="completions" className="flex-1">
              <Medal className="h-4 w-4 mr-2" />
              Most Completions
            </TabsTrigger>
          </TabsList>
          
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If no team completions yet
  if (sortedStats.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Team Leaderboard
          </CardTitle>
          <CardDescription>Teams competing in this hunt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No team completions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Teams will appear here after completing the hunt
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Team Leaderboard
        </CardTitle>
        <CardDescription>Team rankings for this hunt</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fastest" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="fastest" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Fastest Time
            </TabsTrigger>
            <TabsTrigger value="completions" className="flex-1">
              <Medal className="h-4 w-4 mr-2" />
              Most Completions
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="fastest" className="mt-0">
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {sortedStats.map((team, index) => {
                  const prevRank = getTeamPreviousRank(team);
                  const rankChange = prevRank !== -1 ? prevRank - index : 0;
                  
                  return (
                    <TeamRankItem 
                      key={team.teamId ? `team-${team.teamId}` : `individual-${team.teamName}`}
                      team={team}
                      rank={index}
                      rankChange={rankChange}
                      sortType="fastest"
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </TabsContent>
          
          <TabsContent value="completions" className="mt-0">
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {sortedStats.map((team, index) => {
                  const prevRank = getTeamPreviousRank(team);
                  const rankChange = prevRank !== -1 ? prevRank - index : 0;
                  
                  return (
                    <TeamRankItem 
                      key={team.teamId ? `team-${team.teamId}` : `individual-${team.teamName}`}
                      team={team}
                      rank={index}
                      rankChange={rankChange}
                      sortType="completions"
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TeamRankItem({ 
  team, 
  rank, 
  rankChange, 
  sortType 
}: { 
  team: TeamStats; 
  rank: number; 
  rankChange: number;
  sortType: 'fastest' | 'completions';
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 rounded-lg bg-muted/50 relative overflow-hidden"
    >
      {/* Colored stripe based on team color */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${team.color}`} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-full ${
              rank === 0
                ? "bg-yellow-500 text-black"
                : rank === 1
                ? "bg-gray-400 text-black"
                : rank === 2
                ? "bg-amber-600 text-white"
                : "bg-gray-200 text-gray-700"
            } font-bold text-sm`}
          >
            {rank + 1}
          </span>
          
          <div className="flex flex-col">
            <span className="font-medium flex items-center gap-2">
              {team.teamName || "Individual Players"}
              
              {team.teamId && (
                <Users className="h-3 w-3 text-muted-foreground" />
              )}
              
              {rankChange !== 0 && (
                <motion.div
                  initial={{ opacity: 0, y: rankChange > 0 ? -10 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex ml-1"
                >
                  <Badge variant={rankChange > 0 ? "default" : "destructive"} className="text-xs px-1 py-0">
                    {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                  </Badge>
                </motion.div>
              )}
            </span>
            
            <span className="text-xs text-muted-foreground">
              {team.teamId 
                ? `${team.completions} ${team.completions === 1 ? 'completion' : 'completions'}`
                : `${team.completions} individual ${team.completions === 1 ? 'player' : 'players'}`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sortType === 'fastest' && (
            <div className="text-right">
              <div className="font-mono text-sm">
                {formatTime(team.fastestTime)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg: {formatTime(team.averageTime)}
              </div>
            </div>
          )}
          
          {sortType === 'completions' && (
            <div className="text-right">
              <div className="font-mono text-sm font-bold">
                {team.completions}
              </div>
              <div className="text-xs text-muted-foreground">
                Hints: {team.totalHints}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Format time from seconds to minutes and seconds
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Custom hook to generate team statistics
function useGenerateTeamStats(
  completions: HuntCompletion[] | undefined,
  teams: Team[] | undefined
): TeamStats[] {
  const teamStats: { [key: string]: TeamStats } = {};
  
  if (!completions || !teams) return [];
  
  // Create a lookup map for team names
  const teamMap = new Map<number, string>();
  teams.forEach(team => {
    teamMap.set(team.id, team.name);
  });
  
  // Process completions to generate team statistics
  completions.forEach(completion => {
    const teamId = completion.teamId;
    const key = teamId ? `team-${teamId}` : `individual-${completion.userId}`;
    const teamName = teamId ? teamMap.get(teamId) || `Team ${teamId}` : `Player ${completion.userId}`;
    
    // Get existing stats or create new ones
    if (!teamStats[key]) {
      teamStats[key] = {
        teamId: teamId,
        teamName: teamName,
        completions: 0,
        fastestTime: Infinity,
        averageTime: 0,
        totalHints: 0,
        totalTimeSum: 0, // Helper for calculating average
        color: teamId 
          ? TEAM_COLORS[teamId % TEAM_COLORS.length] 
          : "bg-gray-500"
      };
    }
    
    const stats = teamStats[key];
    
    // Update stats
    stats.completions++;
    stats.fastestTime = Math.min(stats.fastestTime, completion.completionTime);
    stats.totalHints += completion.hintsUsed;
    if (stats.totalTimeSum !== undefined) {
      stats.totalTimeSum += completion.completionTime;
      stats.averageTime = Math.round(stats.totalTimeSum / stats.completions);
    }
    
    teamStats[key] = stats;
  });
  
  // Convert object to array and clean up
  return Object.values(teamStats).map(stats => {
    // @ts-ignore: Remove temporary field
    const { totalTimeSum, ...rest } = stats;
    return rest;
  });
}

// Custom hook to sort team stats based on active tab
function useSortedTeamStats(
  teamStats: TeamStats[],
  sortBy: string
): TeamStats[] {
  return [...teamStats].sort((a, b) => {
    if (sortBy === "fastest") {
      return a.fastestTime - b.fastestTime;
    } else if (sortBy === "completions") {
      return b.completions - a.completions || a.averageTime - b.averageTime;
    }
    return 0;
  });
}