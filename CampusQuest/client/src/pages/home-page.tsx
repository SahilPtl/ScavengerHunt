import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import HuntList from "@/components/hunt-list";
import { MapPin, Plus, LogOut, Users } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold">Campus Quest</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.name || user?.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Available Hunts</h1>
          <div className="flex gap-3">
            <Link href="/teams">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Team Management
              </Button>
            </Link>
            <Link href="/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Hunt
              </Button>
            </Link>
          </div>
        </div>

        <HuntList />
      </main>
    </div>
  );
}
