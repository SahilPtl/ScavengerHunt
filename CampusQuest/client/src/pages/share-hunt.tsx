import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Hunt } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { ArrowLeft, Copy, Globe, Lock, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ShareHunt() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newUserId, setNewUserId] = useState("");

  const { data: hunt, isLoading } = useQuery<Hunt>({
    queryKey: [`/api/hunts/${id}`],
  });

  const form = useForm({
    defaultValues: {
      isPublic: hunt?.isPublic ?? true,
      sharedWith: hunt?.sharedWith ?? [],
    },
  });

  useEffect(() => {
    if (hunt) {
      form.reset({
        isPublic: hunt.isPublic,
        sharedWith: hunt.sharedWith,
      });
    }
  }, [hunt, form]);

  const shareMutation = useMutation({
    mutationFn: async (data: { isPublic: boolean; sharedWith: number[] }) => {
      const res = await apiRequest("POST", `/api/hunts/${id}/share`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/hunts/${id}`] });
      toast({
        title: "Sharing settings updated",
        description: "Your hunt's sharing settings have been updated successfully.",
      });
    },
  });

  const handleAddUser = () => {
    const userId = parseInt(newUserId);
    if (isNaN(userId)) {
      toast({
        title: "Invalid user ID",
        description: "Please enter a valid user ID number",
        variant: "destructive",
      });
      return;
    }

    const currentSharedWith = form.getValues("sharedWith");
    if (currentSharedWith.includes(userId)) {
      toast({
        title: "User already added",
        description: "This user already has access to the hunt",
        variant: "destructive",
      });
      return;
    }

    form.setValue("sharedWith", [...currentSharedWith, userId]);
    setNewUserId("");
  };

  const handleRemoveUser = (userId: number) => {
    const currentSharedWith = form.getValues("sharedWith");
    form.setValue(
      "sharedWith",
      currentSharedWith.filter((id) => id !== userId),
    );
  };

  const onSubmit = (data: { isPublic: boolean; sharedWith: number[] }) => {
    shareMutation.mutate(data);
  };

  if (isLoading || !hunt) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Retrieving hunt details</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/play/${id}`;

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
          <h1 className="text-3xl font-bold">Share Hunt</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Share Link</CardTitle>
              <CardDescription>
                Anyone with this link can view the hunt (if they have access)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast({
                      title: "Link copied",
                      description: "Share link has been copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visibility Settings</CardTitle>
                  <CardDescription>
                    Control who can access your hunt
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {field.value ? (
                              <Globe className="h-4 w-4 inline-block mr-2" />
                            ) : (
                              <Lock className="h-4 w-4 inline-block mr-2" />
                            )}
                            {field.value ? "Public" : "Private"}
                          </FormLabel>
                          <FormDescription>
                            {field.value
                              ? "Anyone can access this hunt"
                              : "Only specific users can access this hunt"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!form.getValues("isPublic") && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter user ID"
                          value={newUserId}
                          onChange={(e) => setNewUserId(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddUser}
                        >
                          Add User
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {form.getValues("sharedWith").map((userId) => (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-2 rounded-lg border"
                          >
                            <span>User {userId}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(userId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full"
                disabled={shareMutation.isPending}
              >
                Save Sharing Settings
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}