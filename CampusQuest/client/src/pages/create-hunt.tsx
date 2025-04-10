import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertHuntSchema, type InsertHunt, type Clue, Coordinates } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HuntMap from "@/components/hunt-map";
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  MapPinOff,
  Lightbulb, 
  Target, 
  Trash2, 
  Check, 
  Plus,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Steps for creating a hunt
enum CreateHuntStep {
  DETAILS = 'details',
  ADD_CLUES = 'add-clues',
  REVIEW = 'review',
  PREVIEW = 'preview'
}

// Hunt difficulty levels
enum HuntDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

// Map marker themes
enum MarkerTheme {
  DEFAULT = 'default',
  NATURE = 'nature',
  ACADEMIC = 'academic',
  HISTORICAL = 'historical',
  MODERN = 'modern',
  FANTASY = 'fantasy'
}

export default function CreateHunt() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clues, setClues] = useState<Clue[]>([]);
  const { location: userLocation } = useGeolocation();
  const [currentStep, setCurrentStep] = useState<CreateHuntStep>(CreateHuntStep.DETAILS);
  const [selectedPosition, setSelectedPosition] = useState<Coordinates | null>(null);
  const [newClue, setNewClue] = useState<Partial<Clue>>({
    text: "",
    hint: ""
  });
  const [editingClueIndex, setEditingClueIndex] = useState<number | null>(null);
  const [clueErrors, setClueErrors] = useState<{
    text?: string;
    hint?: string;
    location?: string;
  }>({});
  
  // New features
  const [huntDifficulty, setHuntDifficulty] = useState<HuntDifficulty>(HuntDifficulty.MEDIUM);
  const [markerTheme, setMarkerTheme] = useState<MarkerTheme>(MarkerTheme.DEFAULT);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [generatingClue, setGeneratingClue] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showHint, setShowHint] = useState(false); // For preview hint visibility
  const [locationChecked, setLocationChecked] = useState(false); // For preview location check
  const [showMap, setShowMap] = useState(false); // For preview map visibility
  const [showLocationDialog, setShowLocationDialog] = useState(false); // For location verification dialog
  const [locationVerifying, setLocationVerifying] = useState(false); // For location verification loading state
  const [locationVerified, setLocationVerified] = useState(false); // For location verification success state
  const [locationAttempts, setLocationAttempts] = useState(3); // Number of verification attempts remaining

  // Form for hunt details
  const form = useForm<InsertHunt>({
    resolver: zodResolver(
      insertHuntSchema.extend({
        name: insertHuntSchema.shape.name.min(3, {
          message: "Hunt name must be at least 3 characters",
        }),
        description: insertHuntSchema.shape.description.min(10, {
          message: "Please provide a detailed description (at least 10 characters)",
        }),
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      clues: [],
    },
  });

  // Create hunt mutation
  const createHuntMutation = useMutation({
    mutationFn: async (data: InsertHunt) => {
      const res = await apiRequest("POST", "/api/hunts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts"] });
      toast({
        title: "Hunt created successfully",
        description: "Your hunt is now available for others to play!",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error creating hunt",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: InsertHunt) => {
    if (clues.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one clue to your hunt",
        variant: "destructive",
      });
      setCurrentStep(CreateHuntStep.ADD_CLUES);
      return;
    }
    
    createHuntMutation.mutate({ ...data, clues });
  };

  // Navigation between steps
  const goToNextStep = () => {
    if (currentStep === CreateHuntStep.DETAILS) {
      // Validate hunt details before moving to add clues
      form.trigger(["name", "description"]).then(isValid => {
        if (isValid) {
          setCurrentStep(CreateHuntStep.ADD_CLUES);
        }
      });
    } else if (currentStep === CreateHuntStep.ADD_CLUES) {
      // Ensure we have at least one clue before previewing
      if (clues.length === 0) {
        toast({
          title: "Add clues",
          description: "Please add at least one clue before continuing",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(CreateHuntStep.PREVIEW);
    } else if (currentStep === CreateHuntStep.PREVIEW) {
      setCurrentStep(CreateHuntStep.REVIEW);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === CreateHuntStep.ADD_CLUES) {
      setCurrentStep(CreateHuntStep.DETAILS);
    } else if (currentStep === CreateHuntStep.PREVIEW) {
      setCurrentStep(CreateHuntStep.ADD_CLUES);
    } else if (currentStep === CreateHuntStep.REVIEW) {
      setCurrentStep(CreateHuntStep.PREVIEW);
    }
  };
  
  // Get AI suggestions based on theme
  const getAISuggestions = (theme: MarkerTheme) => {
    const suggestions = {
      [MarkerTheme.DEFAULT]: [
        {
          text: "Where knowledge flows like a river, seek the building with many stories. Look for wisdom's home where minds expand.",
          hint: "Books line the walls in this quiet sanctuary of learning."
        },
        {
          text: "Time stands still in this central gathering place. Find the tower that marks the hours as students rush by.",
          hint: "Students pass by this landmark daily on their way to classes."
        },
        {
          text: "Hungry minds and bodies converge in this social hub. Find the place where meals and meetings happen daily.",
          hint: "The aroma of coffee and food fills the air in this busy spot."
        }
      ],
      [MarkerTheme.NATURE]: [
        {
          text: "Beneath the canopy of ancient guardians, find where the earth's wisdom speaks through rustling leaves.",
          hint: "Look for the largest tree in this natural area."
        },
        {
          text: "Water flows where stones were placed by careful hands. Find this peaceful spot where nature meets design.",
          hint: "The sound of water will guide you to this tranquil garden feature."
        },
        {
          text: "Blossoms of a hundred colors form a living rainbow. Find where the campus showcases nature's palette.",
          hint: "This flower garden changes its appearance with the seasons."
        }
      ],
      [MarkerTheme.ACADEMIC]: [
        {
          text: "Numbers and formulas dance on the walls of this temple of logic and reason. Find where mathematical minds gather.",
          hint: "This department hosts aspiring mathematicians and statisticians."
        },
        {
          text: "Elements combine and reactions spark in this laboratory of discovery. Find where chemists unlock nature's secrets.",
          hint: "Look for the building with periodic table displays."
        },
        {
          text: "Ancient texts and modern thought collide in this sanctuary of humanities. Find where words shape understanding.",
          hint: "Philosophy and literature students frequently gather here."
        }
      ],
      [MarkerTheme.HISTORICAL]: [
        {
          text: "Stone weathered by decades watches over the campus. Find the oldest structure that has witnessed generations of scholars.",
          hint: "The cornerstone marks the founding year of the institution."
        },
        {
          text: "A figure from the past stands frozen in metal, commemorating achievements long ago. Find this historic tribute.",
          hint: "The statue honors a significant figure in the institution's history."
        },
        {
          text: "Echoes of wartime sacrifice resonate here. Find the memorial that honors those who served from these halls.",
          hint: "Look for the plaque listing names of alumni who served in conflicts."
        }
      ],
      [MarkerTheme.MODERN]: [
        {
          text: "Glass and steel reach skyward in this celebration of innovation. Find the newest addition to campus architecture.",
          hint: "The building features cutting-edge sustainable design elements."
        },
        {
          text: "Digital dreams become reality in this hub of technology. Find where coders and creators collaborate.",
          hint: "This is where computer science students spend their late nights."
        },
        {
          text: "Art meets algorithm in this space of modern expression. Find where creativity embraces technology.",
          hint: "Interactive media installations can be found in this building."
        }
      ],
      [MarkerTheme.FANTASY]: [
        {
          text: "The guardian stone waits beneath twisted branches. Adventurers rest here before continuing their quest.",
          hint: "Look for the distinctive rock formation that resembles a mythical creature."
        },
        {
          text: "A portal between worlds hides in plain sight. Find the archway where dimensions seem to blur.",
          hint: "The ornate gateway features symbols of ancient mystical significance."
        },
        {
          text: "The wizard's tower rises where four paths meet. Seek the spiraling structure that touches the clouds.",
          hint: "From certain angles, the building appears to be watching over the grounds."
        }
      ]
    };
    
    // Get suggestions based on the chosen theme (or default if theme not found)
    return suggestions[theme] || suggestions[MarkerTheme.DEFAULT];
  };

  // Function to generate AI clue suggestion
  const generateClue = () => {
    if (!selectedPosition) {
      toast({
        title: "Select location first",
        description: "Please select a location on the map before generating a clue",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingClue(true);
    // Simulate AI clue generation (in a real app, this would call an API)
    setTimeout(() => {      
      // Get a random suggestion
      const themeOptions = getAISuggestions(markerTheme);
      const randomSuggestion = themeOptions[Math.floor(Math.random() * themeOptions.length)];
      
      setNewClue({
        ...newClue,
        text: randomSuggestion.text
      });
      
      setGeneratingClue(false);
      toast({
        title: "AI clue generated",
        description: "A clue suggestion has been created for this location.",
      });
    }, 1000);
  };
  
  // Function to generate just the hint
  const generateHint = () => {
    if (!selectedPosition) {
      toast({
        title: "Select location first",
        description: "Please select a location on the map before generating a hint",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingClue(true);
    // Simulate AI hint generation
    setTimeout(() => {
      // Get a random hint
      const themeOptions = getAISuggestions(markerTheme);
      const randomSuggestion = themeOptions[Math.floor(Math.random() * themeOptions.length)];
      
      setNewClue({
        ...newClue,
        hint: randomSuggestion.hint
      });
      
      setGeneratingClue(false);
      toast({
        title: "AI hint generated",
        description: "A hint suggestion has been created for this location.",
      });
    }, 1000);
  };

  // Handle adding a new clue
  const handleAddClue = () => {
    // Validate clue fields
    const errors: {
      text?: string;
      hint?: string;
      location?: string;
    } = {};
    
    if (!newClue.text || newClue.text.trim() === "") {
      errors.text = "Please provide a clue text";
    }
    
    if (!newClue.hint || newClue.hint.trim() === "") {
      errors.hint = "Please provide a hint";
    }
    
    if (!selectedPosition) {
      errors.location = "Please select a location on the map";
    }
    
    if (Object.keys(errors).length > 0) {
      setClueErrors(errors);
      return;
    }
    
    // Clear any previous errors
    setClueErrors({});
    
    // If editing an existing clue, update it
    if (editingClueIndex !== null && editingClueIndex >= 0 && editingClueIndex < clues.length) {
      const updatedClues = [...clues];
      updatedClues[editingClueIndex] = {
        text: newClue.text || "",
        hint: newClue.hint || "",
        coordinates: selectedPosition!
      };
      setClues(updatedClues);
    } else {
      // Add a new clue
      setClues([...clues, {
        text: newClue.text || "",
        hint: newClue.hint || "",
        coordinates: selectedPosition!
      }]);
    }
    
    // Reset form state
    setNewClue({ text: "", hint: "" });
    setSelectedPosition(null);
    setEditingClueIndex(null);
    
    toast({
      title: editingClueIndex !== null ? "Clue updated" : "Clue added",
      description: editingClueIndex !== null 
        ? "Your clue has been updated successfully" 
        : "Your clue has been added to the hunt",
    });
  };

  // Edit an existing clue
  const editClue = (index: number) => {
    const clue = clues[index];
    setNewClue({
      text: clue.text,
      hint: clue.hint
    });
    setSelectedPosition(clue.coordinates);
    setEditingClueIndex(index);
  };

  // Delete a clue
  const deleteClue = (index: number) => {
    const updatedClues = [...clues];
    updatedClues.splice(index, 1);
    setClues(updatedClues);
    
    // If we were editing this clue, reset the form
    if (editingClueIndex === index) {
      setNewClue({ text: "", hint: "" });
      setSelectedPosition(null);
      setEditingClueIndex(null);
    }
    
    toast({
      title: "Clue removed",
      description: "The clue has been removed from your hunt",
    });
  };

  // Cancel clue editing
  const cancelClueEdit = () => {
    setNewClue({ text: "", hint: "" });
    setSelectedPosition(null);
    setEditingClueIndex(null);
    setClueErrors({});
  };
  
  // Handle location verification
  const handleLocationCheck = () => {
    if (clues.length === 0) {
      toast({
        title: "No clues available",
        description: "There are no clues to check location against",
        variant: "destructive",
      });
      return;
    }
    
    setShowLocationDialog(true);
    setLocationVerifying(true);
    setLocationVerified(false);
    
    // Simulate location verification process
    setTimeout(() => {
      setLocationVerifying(false);
      
      if (userLocation) {
        // In a real app, we would calculate the distance between the user's location 
        // and the clue's location, and check if it's within a certain radius
        
        // For demo purposes, let's randomly determine success/failure
        const isCloseEnough = Math.random() > 0.5;
        
        if (isCloseEnough) {
          setLocationVerified(true);
        } else {
          // Decrement attempts
          setLocationAttempts(prev => Math.max(0, prev - 1));
        }
      } else {
        toast({
          title: "Location unavailable",
          description: "Unable to access your location. Please enable location services.",
          variant: "destructive",
        });
        setShowLocationDialog(false);
      }
    }, 2000);
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
          <h1 className="text-3xl font-bold">Create New Hunt</h1>
        </div>

        {/* Progress indicators */}
        <Tabs
          value={currentStep}
          className="mb-8"
          onValueChange={(value) => setCurrentStep(value as CreateHuntStep)}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value={CreateHuntStep.DETAILS}>
              1. Hunt Details
            </TabsTrigger>
            <TabsTrigger value={CreateHuntStep.ADD_CLUES}>
              2. Add Clues {clues.length > 0 && <Badge className="ml-2" variant="secondary">{clues.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value={CreateHuntStep.PREVIEW}>
              3. Preview Hunt
            </TabsTrigger>
            <TabsTrigger value={CreateHuntStep.REVIEW}>
              4. Review & Create
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Hunt Details */}
          <TabsContent value={CreateHuntStep.DETAILS}>
            <Card>
              <CardHeader>
                <CardTitle>Hunt Details</CardTitle>
                <CardDescription>
                  Give your hunt a great name and description to attract players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Hunt Name</label>
                          <FormControl>
                            <Input placeholder="The Academic Adventure" {...field} />
                          </FormControl>
                          <FormDescription>
                            Choose an engaging name for your hunt
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
                          <FormControl>
                            <Textarea
                              placeholder="A challenging quest around campus landmarks that tests your knowledge of university history and architecture."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide details about what players should expect
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 border-t pt-4 mt-4">
                      <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Hunt Difficulty</label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {Object.values(HuntDifficulty).map((difficulty) => (
                            <Button
                              key={difficulty}
                              type="button"
                              variant={huntDifficulty === difficulty ? "default" : "outline"}
                              onClick={() => setHuntDifficulty(difficulty)}
                              className="flex flex-col items-center gap-1 h-auto py-3"
                            >
                              {difficulty === HuntDifficulty.EASY && (
                                <span className="text-lg">😊</span>
                              )}
                              {difficulty === HuntDifficulty.MEDIUM && (
                                <span className="text-lg">🤔</span>
                              )}
                              {difficulty === HuntDifficulty.HARD && (
                                <span className="text-lg">😓</span>
                              )}
                              {difficulty === HuntDifficulty.EXPERT && (
                                <span className="text-lg">🧠</span>
                              )}
                              <span className="capitalize">{difficulty}</span>
                            </Button>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Select the difficulty level for your hunt to set player expectations
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Map Marker Theme</label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {Object.values(MarkerTheme).map((theme) => (
                            <Button
                              key={theme}
                              type="button"
                              variant={markerTheme === theme ? "default" : "outline"}
                              onClick={() => setMarkerTheme(theme)}
                              className="justify-start h-auto py-3"
                            >
                              <div className="w-5 h-5 rounded-full mr-2 border flex items-center justify-center">
                                {theme === MarkerTheme.DEFAULT && <MapPin className="w-3 h-3" />}
                                {theme === MarkerTheme.NATURE && <span className="text-xs">🌿</span>}
                                {theme === MarkerTheme.ACADEMIC && <span className="text-xs">📚</span>}
                                {theme === MarkerTheme.HISTORICAL && <span className="text-xs">🏛️</span>}
                                {theme === MarkerTheme.MODERN && <span className="text-xs">🏙️</span>}
                                {theme === MarkerTheme.FANTASY && <span className="text-xs">🧙</span>}
                              </div>
                              <span className="capitalize">{theme}</span>
                            </Button>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Choose a visual theme for your hunt markers on the map
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Collaborators (Optional)</label>
                        <div className="flex gap-2 mt-2">
                          <Input 
                            placeholder="Enter username to add" 
                            value={collaboratorInput}
                            onChange={(e) => setCollaboratorInput(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            type="button"
                            onClick={() => {
                              if (collaboratorInput.trim()) {
                                setCollaborators([...collaborators, collaboratorInput.trim()]);
                                setCollaboratorInput('');
                              }
                            }}
                            disabled={!collaboratorInput.trim()}
                          >
                            Add
                          </Button>
                        </div>
                        
                        {collaborators.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {collaborators.map((collaborator, index) => (
                              <Badge key={index} variant="secondary" className="px-2 py-1">
                                {collaborator}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => {
                                    const newCollaborators = [...collaborators];
                                    newCollaborators.splice(index, 1);
                                    setCollaborators(newCollaborators);
                                  }}
                                >
                                  <span className="sr-only">Remove</span>
                                  ×
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          Add usernames of people who can edit this hunt with you
                        </p>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={goToNextStep}>
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Step 2: Add Clues */}
          <TabsContent value={CreateHuntStep.ADD_CLUES}>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{editingClueIndex !== null ? "Edit Clue" : "Add a New Clue"}</CardTitle>
                    <CardDescription>
                      {editingClueIndex !== null 
                        ? `Editing clue ${editingClueIndex + 1}` 
                        : "Create a clue and select its location on the map"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Clue Text</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateClue}
                          disabled={!selectedPosition || generatingClue}
                          className="flex items-center gap-1"
                        >
                          {generatingClue ? (
                            <>Generating...</>
                          ) : (
                            <>
                              <span className="text-xs">✨</span> AI Generate
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="This building, erected in 1907, houses the world's first..."
                        rows={3}
                        value={newClue.text}
                        onChange={(e) => setNewClue({...newClue, text: e.target.value})}
                      />
                      {clueErrors.text && (
                        <p className="text-sm font-medium text-destructive mt-1">{clueErrors.text}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Write a riddle or description that leads players to a specific location
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Hint</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateHint}
                          disabled={!selectedPosition || generatingClue}
                          className="flex items-center gap-1"
                        >
                          {generatingClue ? (
                            <>Generating...</>
                          ) : (
                            <>
                              <Lightbulb className="h-3 w-3 mr-1" /> AI Hint
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Look for the bronze statue near the entrance..."
                        rows={2}
                        value={newClue.hint}
                        onChange={(e) => setNewClue({...newClue, hint: e.target.value})}
                      />
                      {clueErrors.hint && (
                        <p className="text-sm font-medium text-destructive mt-1">{clueErrors.hint}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Provide a helpful hint for players who get stuck
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Location</label>
                      <div className="flex items-center mt-1 text-sm">
                        {selectedPosition ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <MapPin className="h-4 w-4" />
                            <span>Location selected at {selectedPosition.latitude.toFixed(6)}, {selectedPosition.longitude.toFixed(6)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Click on the map to select a location</span>
                          </div>
                        )}
                      </div>
                      {clueErrors.location && (
                        <p className="text-sm font-medium text-destructive mt-1">{clueErrors.location}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 justify-end">
                    {editingClueIndex !== null && (
                      <Button variant="outline" onClick={cancelClueEdit}>
                        Cancel
                      </Button>
                    )}
                    <Button 
                      onClick={handleAddClue}
                      disabled={!newClue.text || !newClue.hint || !selectedPosition}
                    >
                      {editingClueIndex !== null ? (
                        <>Update Clue <Check className="ml-2 h-4 w-4" /></>
                      ) : (
                        <>Add Clue <Plus className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Clue List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Clues</CardTitle>
                    <CardDescription>
                      {clues.length === 0 
                        ? "You haven't added any clues yet" 
                        : `${clues.length} clue${clues.length !== 1 ? 's' : ''} in this hunt`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {clues.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Clues will appear here as you add them</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {clues.map((clue, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-2 relative">
                            <div className="flex justify-between">
                              <p className="font-medium">Clue {index + 1}</p>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => editClue(index)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteClue(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p>{clue.text}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Lightbulb className="h-3.5 w-3.5" />
                              <span>Hint: {clue.hint}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Location: {clue.coordinates.latitude.toFixed(6)}, {clue.coordinates.longitude.toFixed(6)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={goToPreviousStep}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goToNextStep}>
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Map Section */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Locations on Map</CardTitle>
                    <CardDescription>
                      Click on the map to place a marker where players need to go
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <HuntMap
                      clues={clues}
                      userLocation={userLocation}
                      className="h-[550px] rounded-none"
                      onAddClue={(clue) => {
                        setSelectedPosition(clue.coordinates);
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Step 3: Preview Hunt */}
          <TabsContent value={CreateHuntStep.PREVIEW}>
            <Card>
              <CardHeader>
                <CardTitle>Preview Your Hunt</CardTitle>
                <CardDescription>
                  Experience your hunt as players will see it
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Location verification dialog */}
                <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Location Verification</DialogTitle>
                      <DialogDescription>
                        We're checking if you're close enough to the clue location...
                      </DialogDescription>
                    </DialogHeader>
                    
                    {locationVerifying ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-center">Verifying your location...</p>
                        <p className="text-xs text-muted-foreground mt-2">This may take a few seconds</p>
                      </div>
                    ) : locationVerified ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-4 mb-4">
                          <Check className="h-8 w-8 text-green-600 dark:text-green-500" />
                        </div>
                        <h3 className="font-medium text-lg mb-2">Location Verified!</h3>
                        <p className="text-center text-muted-foreground mb-4">
                          You've found the correct location. Well done!
                        </p>
                        <Button onClick={() => {
                          setShowLocationDialog(false);
                          setLocationChecked(true);
                        }}>
                          Continue
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                          <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
                        </div>
                        <h3 className="font-medium text-lg mb-2">Not quite there</h3>
                        <p className="text-center text-muted-foreground mb-4">
                          You're not close enough to the clue location yet. Keep exploring!
                        </p>
                        <p className="text-xs text-center mb-4">
                          Attempts remaining: {locationAttempts} of 3
                        </p>
                        <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
                          Try Again
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                <div className="grid md:grid-cols-3 min-h-[600px]">
                  {/* Player View */}
                  <div className="md:col-span-1 border-r p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{form.getValues("name")}</h3>
                      <p className="text-sm text-muted-foreground">{form.getValues("description")}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="font-normal capitalize">{huntDifficulty} Difficulty</Badge>
                        <Badge variant="outline" className="font-normal">{clues.length} Clues</Badge>
                        {markerTheme !== MarkerTheme.DEFAULT && (
                          <Badge variant="outline" className="font-normal capitalize">{markerTheme} Theme</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="text-md font-semibold mb-3">Current Clue</h3>
                      {clues.length > 0 ? (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="font-medium">Clue 1 of {clues.length}</p>
                          <p className="mt-2">{clues[0].text}</p>
                          <div className="mt-3 border-t pt-3">
                            {/* Using useState hook to track hint visibility */}
                            {showHint ? (
                              <div className="mb-3">
                                <div className="flex items-center gap-1 mb-2">
                                  <Lightbulb className="h-4 w-4 text-amber-500" />
                                  <span className="font-medium text-sm">Hint:</span>
                                </div>
                                <p className="text-sm">{clues[0].hint}</p>
                                <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowHint(false)}>
                                  Hide Hint
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHint(true)}>
                                <Lightbulb className="mr-2 h-4 w-4" /> Reveal Hint
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                          <p>No clues available to preview</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="text-md font-semibold mb-2">Player Actions</h3>
                      <div className="space-y-2">
                        {/* Using state to toggle checked status and map visibility */}
                        <Button 
                          variant={locationChecked ? "default" : "outline"} 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={handleLocationCheck}
                        >
                          <Target className="mr-2 h-4 w-4" /> 
                          {locationChecked ? "Location Verified!" : "Check Location"}
                        </Button>
                        <Button 
                          variant={showMap ? "default" : "outline"} 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => setShowMap(!showMap)}
                        >
                          <MapPin className="mr-2 h-4 w-4" /> 
                          {showMap ? "Hide Map" : "View Map"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Map View */}
                  <div className="md:col-span-2 relative">
                    {/* Show map only when showMap is true, otherwise show a message */}
                    {showMap ? (
                      <>
                        <HuntMap
                          clues={previewMode ? [clues[0]].filter(Boolean) : clues}
                          userLocation={userLocation}
                          className="h-[600px] rounded-none"
                          otherPlayers={[
                            { userId: 1, position: userLocation || { latitude: 0, longitude: 0 }, heading: 45, currentClueIndex: 0 }
                          ].filter(p => p.position)}
                        />
                        
                        <div className="absolute top-4 right-4 z-[1000] space-y-2">
                          <div className="bg-background border rounded-md p-2 shadow-md">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium">Preview Options</h4>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs">Show all clue locations</span>
                                <Button 
                                  variant={previewMode ? "outline" : "default"} 
                                  size="sm"
                                  onClick={() => setPreviewMode(!previewMode)}
                                  className="h-7 text-xs"
                                >
                                  {previewMode ? "Show All" : "Player View"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-[600px] rounded-none flex flex-col items-center justify-center bg-muted">
                        <MapPinOff className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-medium mb-2">Map Hidden</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                          In a real scavenger hunt, players need to figure out where to go based on clues alone. 
                          Press "View Map" to see the answer.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setShowMap(true)}
                        >
                          <MapPin className="mr-2 h-4 w-4" /> Show Map
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={goToPreviousStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={goToNextStep}>
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Step 4: Review & Create */}
          <TabsContent value={CreateHuntStep.REVIEW}>
            <Card>
              <CardHeader>
                <CardTitle>Review Your Hunt</CardTitle>
                <CardDescription>
                  Review all details before creating your hunt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold">Hunt Details</h3>
                      <div className="mt-2 p-4 border rounded-lg space-y-3">
                        <div>
                          <p className="font-medium">Name</p>
                          <p>{form.getValues("name")}</p>
                        </div>
                        <div>
                          <p className="font-medium">Description</p>
                          <p>{form.getValues("description")}</p>
                        </div>
                        <div>
                          <p className="font-medium">Difficulty</p>
                          <Badge className="capitalize">{huntDifficulty}</Badge>
                        </div>
                        <div>
                          <p className="font-medium">Marker Theme</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                              {markerTheme === MarkerTheme.DEFAULT && <MapPin className="w-3 h-3" />}
                              {markerTheme === MarkerTheme.NATURE && <span className="text-xs">🌿</span>}
                              {markerTheme === MarkerTheme.ACADEMIC && <span className="text-xs">📚</span>}
                              {markerTheme === MarkerTheme.HISTORICAL && <span className="text-xs">🏛️</span>}
                              {markerTheme === MarkerTheme.MODERN && <span className="text-xs">🏙️</span>}
                              {markerTheme === MarkerTheme.FANTASY && <span className="text-xs">🧙</span>}
                            </div>
                            <span className="capitalize">{markerTheme}</span>
                          </div>
                        </div>
                        {collaborators.length > 0 && (
                          <div>
                            <p className="font-medium">Collaborators</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {collaborators.map((collaborator, index) => (
                                <Badge key={index} variant="secondary" className="px-2 py-1">
                                  {collaborator}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">Clues ({clues.length})</h3>
                      {clues.length === 0 ? (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>No clues added</AlertTitle>
                          <AlertDescription>
                            Please go back and add at least one clue before creating the hunt.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="mt-2 space-y-4">
                          {clues.map((clue, index) => (
                            <div key={index} className="p-4 border rounded-lg space-y-2">
                              <p className="font-medium">Clue {index + 1}</p>
                              <p>{clue.text}</p>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Lightbulb className="h-3.5 w-3.5" />
                                <span>Hint: {clue.hint}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Hunt Map</h3>
                    <HuntMap
                      clues={clues}
                      userLocation={userLocation}
                      className="h-[400px] rounded-lg border"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={goToPreviousStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={clues.length === 0 || createHuntMutation.isPending}
                >
                  {createHuntMutation.isPending ? "Creating..." : "Create Hunt"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}