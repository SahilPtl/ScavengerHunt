import { useQuery } from "@tanstack/react-query";
import { Hunt } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Share2, Globe, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HuntList() {
  const { user } = useAuth();
  const { data: hunts, isLoading } = useQuery<Hunt[]>({
    queryKey: ["/api/hunts"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {hunts?.map((hunt) => (
        <Card key={hunt.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{hunt.name}</CardTitle>
              <div className="flex items-center gap-2">
                {hunt.isPublic ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <CardDescription>
              {hunt.clues.length} clues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {hunt.description}
            </p>
            <div className="flex gap-2">
              <Link href={`/play/${hunt.id.toString()}`}>
                <Button className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Start Hunt
                </Button>
              </Link>
              {hunt.creatorId === user?.id && (
                <Link href={`/share/${hunt.id.toString()}`}>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}