import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import CreateHunt from "@/pages/create-hunt";
import PlayHunt from "@/pages/play-hunt";
import ShareHunt from "@/pages/share-hunt";
import TeamManagement from "@/pages/team-management";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/create" component={CreateHunt} />
      <ProtectedRoute path="/play/:id" component={PlayHunt} />
      <ProtectedRoute path="/share/:id" component={ShareHunt} />
      <ProtectedRoute path="/teams" component={TeamManagement} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;