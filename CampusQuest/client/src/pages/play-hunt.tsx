import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Hunt, Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useGeolocation, calculateDistance } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import HuntMap from "@/components/hunt-map";
import Leaderboard from "@/components/leaderboard";
import TeamLeaderboard from "@/components/team-leaderboard";
import { ArrowLeft, MapPin, Lightbulb, Loader2, Users, CheckCircle2, XCircle, AlertCircle, Target, Filter } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useHuntProgress } from "@/hooks/use-hunt-progress";
import ChatBox from "@/components/chat-box";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useTeam } from "@/hooks/use-team";

export default function PlayHunt() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { userTeams, isUserTeamsLoading } = useTeam();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentClueIndex, setCurrentClueIndex] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [locationAttempts, setLocationAttempts] = useState<number>(0);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [locationResult, setLocationResult] = useState<'success' | 'close' | 'wrong' | null>(null);
  const [showTeamColors, setShowTeamColors] = useState<boolean>(true);
  const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
  // Removed AR view feature as it defeats the purpose of the scavenger hunt
  const { location: userLocation, isTracking } = useGeolocation();

  const { data: hunt, isLoading: isHuntLoading } = useQuery<Hunt>({
    queryKey: [`/api/hunts/${id}`],
  });

  const { isConnected, otherPlayers, activePlayerCount, messages, updatePosition, sendMessage } = useHuntProgress(Number(id));

  const completeMutation = useMutation({
    mutationFn: async (data: { completionTime: number; hintsUsed: number; teamId?: number | null }) => {
      const res = await apiRequest("POST", `/api/hunts/${id}/complete`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hunts/${id}/completions`] });
      toast({
        title: "Congratulations!",
        description: "You've completed the hunt!",
      });
      setLocation("/");
    },
  });

  useEffect(() => {
    if (hunt && !startTime) {
      setStartTime(Date.now());
    }
  }, [hunt, startTime]);

  useEffect(() => {
    if (userLocation && hunt) {
      updatePosition(userLocation, currentClueIndex, userHeading);
    }
  }, [userLocation, updatePosition, currentClueIndex, hunt, userHeading]);

  if (isHuntLoading || !hunt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const currentClue = hunt.clues[currentClueIndex];

  const checkLocation = () => {
    if (!userLocation) {
      toast({
        title: "Error",
        description: "Unable to get your location",
        variant: "destructive",
      });
      return;
    }

    // Check if user has reached the attempt limit
    if (locationAttempts >= 3) {
      setLocationResult('wrong');
      setShowLocationModal(true);
      return;
    }

    const distance = calculateDistance(userLocation, currentClue.coordinates);
    // The proximity threshold - adjust as needed. 50 meters is a reasonable area.
    const proximityThreshold = 50;
    
    if (distance <= proximityThreshold) { 
      // Success! Reset attempt counter for next clue
      setLocationAttempts(0);
      setLocationResult('success');
      setShowLocationModal(true);
      
      if (currentClueIndex === hunt.clues.length - 1) {
        // Hunt completed!
        const completionTime = Math.floor((Date.now() - startTime!) / 1000);
        // Include the user's team ID if they are part of a team
        const teamId = user?.teamId || null;
        completeMutation.mutate({ completionTime, hintsUsed, teamId });
      } else {
        // After modal is closed, we'll move to the next clue
        // This is handled in the modal close handler
        updatePosition(userLocation, currentClueIndex + 1, userHeading);
      }
    } else {
      // Increment attempt counter
      setLocationAttempts(locationAttempts + 1);
      
      // Provide feedback based on how close they are
      if (distance <= proximityThreshold * 2) {
        setLocationResult('close');
        setShowLocationModal(true);
      } else {
        setLocationResult('wrong');
        setShowLocationModal(true);
      }
    }
  };
  
  const handleLocationModalClose = () => {
    setShowLocationModal(false);
    
    // If the result was successful and not the final clue, move to next clue
    if (locationResult === 'success' && currentClueIndex < hunt.clues.length - 1) {
      setCurrentClueIndex(currentClueIndex + 1);
      setShowHint(false);
    }
  };

  const showHintHandler = () => {
    if (hintsUsed >= 3) {
      toast({
        title: "No hints remaining",
        description: "You've used all your hints for this hunt",
        variant: "destructive",
      });
      return;
    }
    setHintsUsed(hintsUsed + 1);
    setShowHint(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{hunt.name}</h1>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="team-colors" className="text-xs">Team Colors</Label>
                <Switch
                  id="team-colors"
                  checked={showTeamColors}
                  onCheckedChange={setShowTeamColors}
                />
              </div>
              
              {!isUserTeamsLoading && userTeams && userTeams.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="filter-team" className="text-xs">Filter Team</Label>
                  <Select
                    value={filterTeamId?.toString() || 'all'}
                    onValueChange={(value) => {
                      setFilterTeamId(value === 'all' ? null : parseInt(value));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {userTeams.map((team: { id: number, name: string }) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{activePlayerCount} active players</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Clue</CardTitle>
                    <CardDescription>
                      Clue {currentClueIndex + 1} of {hunt.clues.length}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end text-sm space-y-1">
                    {isConnected ? (
                      <div className="text-green-500">Connected</div>
                    ) : (
                      <div className="text-red-500">Disconnected</div>
                    )}
                    {isTracking ? (
                      <div className="text-blue-500">Location tracking active</div>
                    ) : (
                      <div className="text-orange-500">Waiting for location...</div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{currentClue.text}</p>
                {showHint && (
                  <p className="text-sm text-muted-foreground">
                    Hint: {currentClue.hint}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-4">
                  <Button onClick={checkLocation} disabled={!userLocation}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Check Location
                  </Button>
                  <Button
                    variant="outline"
                    onClick={showHintHandler}
                    disabled={hintsUsed >= 3 || showHint}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Use Hint ({3 - hintsUsed} remaining)
                  </Button>
                </div>
              </CardContent>
            </Card>
            <ChatBox
              messages={messages}
              onSendMessage={sendMessage}
              className="mt-6"
            />
            <Leaderboard huntId={Number(id)} />
            <TeamLeaderboard huntId={Number(id)} className="mt-6" />
          </div>

          <HuntMap
            clues={[currentClue]}
            userLocation={userLocation}
            otherPlayers={otherPlayers.filter(player => 
              !filterTeamId || player.teamId === filterTeamId
            )}
            className="h-[600px] rounded-lg border"
            onHeadingChange={(heading) => setUserHeading(heading)}
            showTeamColors={showTeamColors}
          />
        </div>
      </div>
      
      {/* Location Check Result Modal */}
      
      <Dialog open={showLocationModal} onOpenChange={handleLocationModalClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            {locationResult === 'success' && (
              <>
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <DialogTitle className="text-center text-xl">
                  {currentClueIndex === hunt.clues.length - 1 ? 
                    "Hunt Completed!" : 
                    "Location Found!"}
                </DialogTitle>
              </>
            )}
            
            {locationResult === 'close' && (
              <>
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
                <DialogTitle className="text-center text-xl">Getting Closer!</DialogTitle>
              </>
            )}
            
            {locationResult === 'wrong' && (
              <>
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <DialogTitle className="text-center text-xl">
                  {locationAttempts >= 3 ? 
                    "Maximum Attempts Reached" : 
                    "Not the Right Location"}
                </DialogTitle>
              </>
            )}
          </DialogHeader>
          
          <div className="p-1">
            {locationResult === 'success' && (
              <div className="text-center text-base">
                {currentClueIndex === hunt.clues.length - 1 ? (
                  <>
                    <div className="mb-4">
                      Congratulations! You've completed the "{hunt.name}" hunt!
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Your time: {Math.floor((Date.now() - startTime!) / 60000)} minutes<br />
                      Hints used: {hintsUsed} of 3
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2">
                      You've found the location of Clue {currentClueIndex + 1}!
                    </div>
                    <div className="font-medium mb-4">
                      The next clue will be revealed when you close this dialog.
                    </div>
                  </>
                )}
              </div>
            )}
            
            {locationResult === 'close' && (
              <div className="text-center text-base">
                <div className="mb-2">
                  You're in the general area, but not quite at the exact location.
                </div>
                <Alert className="mt-4 mb-2 bg-amber-50 border-amber-200 text-amber-800">
                  <Target className="h-4 w-4" />
                  <AlertTitle>Location attempts: {locationAttempts} of 3</AlertTitle>
                  <AlertDescription>
                    Try moving around a bit and check again.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {locationResult === 'wrong' && (
              <div className="text-center text-base">
                {locationAttempts >= 3 ? (
                  <>
                    <div className="mb-2">
                      You've used all 3 attempts to find this location.
                    </div>
                    <Alert variant="destructive" className="mt-4 mb-2">
                      <AlertTitle>Need to solve the clue</AlertTitle>
                      <AlertDescription>
                        Try using a hint or re-reading the clue carefully to figure out the correct location.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <>
                    <div className="mb-2">
                      That's not the right location. Read the clue carefully and try again.
                    </div>
                    <Alert variant="destructive" className="mt-4 mb-2">
                      <Target className="h-4 w-4" />
                      <AlertTitle>Location attempts: {locationAttempts} of 3</AlertTitle>
                      <AlertDescription>
                        You have {3 - locationAttempts} more attempts to find this location.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              className="w-full" 
              onClick={handleLocationModalClose}
            >
              {locationResult === 'success' ? 
                (currentClueIndex === hunt.clues.length - 1 ? "Return to Home" : "Continue to Next Clue") : 
                "Try Again"}
            </Button>
            
            {(locationResult === 'close' || locationResult === 'wrong') && !showHint && hintsUsed < 3 && (
              <Button 
                variant="outline" 
                className="w-full mt-2" 
                onClick={() => {
                  showHintHandler();
                  handleLocationModalClose();
                }}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Use a Hint ({3 - hintsUsed} remaining)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}