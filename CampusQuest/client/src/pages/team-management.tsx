import { useState } from 'react';
import { useTeam } from '@/hooks/use-team';
import { useAuth } from '@/hooks/use-auth';
import TeamChat from '@/components/team-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Team } from '@shared/schema';

export default function TeamManagement() {
  const { user } = useAuth();
  const { userTeams, isUserTeamsLoading, createTeam, joinTeamByCode, leaveTeam } = useTeam();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    code: '',
    description: '',
    avatar: ''
  });
  const { toast } = useToast();

  const handleCreateTeam = () => {
    // Generate a random code if none is provided
    const teamCode = newTeam.code || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    createTeam(
      {
        ...newTeam,
        code: teamCode
      }, 
      {
        onSuccess: () => {
          toast({
            title: 'Team Created',
            description: `Your team has been created successfully.`,
          });
          setIsCreateDialogOpen(false);
          setNewTeam({ name: '', code: '', description: '', avatar: '' });
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: `Failed to create team: ${error.message}`,
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleJoinTeam = () => {
    if (!joinCode) return;
    
    joinTeamByCode(joinCode, {
      onSuccess: () => {
        toast({
          title: 'Joined Team',
          description: 'You have successfully joined the team.',
        });
        setJoinCode('');
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: `Failed to join team: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  const handleLeaveTeam = (teamId: number) => {
    leaveTeam(teamId, {
      onSuccess: () => {
        toast({
          title: 'Left Team',
          description: 'You have left the team.',
        });
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null);
        }
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: `Failed to leave team: ${error.message}`,
          variant: 'destructive',
        });
      }
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Please log in to access team features.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Team Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar for team selection and management */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Teams</CardTitle>
              <CardDescription>Select a team to chat with or manage its members.</CardDescription>
            </CardHeader>
            <CardContent>
              {isUserTeamsLoading ? (
                <div className="text-center py-4">Loading your teams...</div>
              ) : userTeams && userTeams.length > 0 ? (
                <div className="space-y-3">
                  {userTeams.map((team: Team) => (
                    <div 
                      key={team.id} 
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                        selectedTeam?.id === team.id ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={team.avatar || undefined} alt={team.name} />
                          <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-xs text-muted-foreground">Code: {team.code}</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveTeam(team.id);
                        }}
                      >
                        Leave
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  You're not part of any teams yet.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">Create Team</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a New Team</DialogTitle>
                    <DialogDescription>
                      Fill out the details to create your new team. The team code will be used by others to join.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input 
                        id="team-name" 
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                        placeholder="Enter team name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-code">Team Code (Optional)</Label>
                      <Input 
                        id="team-code" 
                        value={newTeam.code}
                        onChange={(e) => setNewTeam({...newTeam, code: e.target.value})}
                        placeholder="Enter team code or leave blank for auto-generated" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-description">Description (Optional)</Label>
                      <Input 
                        id="team-description" 
                        value={newTeam.description}
                        onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                        placeholder="Enter team description" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-avatar">Avatar URL (Optional)</Label>
                      <Input 
                        id="team-avatar" 
                        value={newTeam.avatar}
                        onChange={(e) => setNewTeam({...newTeam, avatar: e.target.value})}
                        placeholder="Enter avatar image URL" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateTeam} disabled={!newTeam.name.trim()}>Create Team</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Separator orientation="vertical" />
              
              <div className="flex-grow flex gap-2">
                <Input 
                  placeholder="Enter team code" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <Button variant="outline" onClick={handleJoinTeam} disabled={!joinCode.trim()}>
                  Join
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        {/* Right section for team chat and member list */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <Tabs defaultValue="chat">
              <TabsList className="w-full">
                <TabsTrigger value="chat" className="flex-1">Team Chat</TabsTrigger>
                <TabsTrigger value="members" className="flex-1">Team Members</TabsTrigger>
                <TabsTrigger value="details" className="flex-1">Team Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="mt-4">
                <TeamChat teamId={selectedTeam.id} />
              </TabsContent>
              
              <TabsContent value="members" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      View all members of {selectedTeam.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* This would be populated with actual member data */}
                    <div className="text-center py-4 text-muted-foreground">
                      Member list will be displayed here.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Team Name</h3>
                      <p className="mt-1">{selectedTeam.name}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Team Code</h3>
                      <p className="mt-1">{selectedTeam.code}</p>
                    </div>
                    
                    {selectedTeam.description && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
                        <p className="mt-1">{selectedTeam.description}</p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Created</h3>
                      <p className="mt-1">{selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <CardContent className="text-center">
                <h3 className="text-xl font-medium mb-2">No Team Selected</h3>
                <p className="text-muted-foreground">
                  Select a team from the list or create a new one to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}