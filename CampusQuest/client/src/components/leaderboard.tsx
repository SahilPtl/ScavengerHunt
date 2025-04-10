import { useQuery } from "@tanstack/react-query";
import { HuntCompletion } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface LeaderboardProps {
  huntId: number;
}

export default function Leaderboard({ huntId }: LeaderboardProps) {
  const { data: completions } = useQuery<HuntCompletion[]>({
    queryKey: [`/api/hunts/${huntId}/completions`],
  });

  const sortedCompletions = completions
    ?.sort((a, b) => a.completionTime - b.completionTime)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Leaderboard
        </CardTitle>
        <CardDescription>Top 10 fastest completions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedCompletions?.map((completion, index) => (
            <div
              key={completion.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`font-medium ${
                    index === 0
                      ? "text-yellow-500"
                      : index === 1
                      ? "text-gray-400"
                      : index === 2
                      ? "text-amber-600"
                      : ""
                  }`}
                >
                  #{index + 1}
                </span>
                <span>{completion.userId}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {Math.floor(completion.completionTime / 60)}m{" "}
                  {completion.completionTime % 60}s
                </span>
                <span className="text-sm text-muted-foreground">
                  {completion.hintsUsed} hints
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
