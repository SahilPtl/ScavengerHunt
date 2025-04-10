import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeam } from '@/hooks/use-team';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Message } from '@shared/schema';

interface TeamChatProps {
  teamId: number;
  className?: string;
}

export default function TeamChat({ teamId, className }: TeamChatProps) {
  const { chatState, team } = useTeam(teamId);
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatState.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && chatState.isConnected) {
      chatState.sendMessage(message);
      setMessage('');
    }
  };

  // Format timestamp to a readable format
  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className={cn("flex flex-col h-[500px]", className)}>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex justify-between items-center">
          <span>Team Chat {team?.name ? `- ${team.name}` : ''}</span>
          <span className="text-sm text-muted-foreground">
            {chatState.isConnected ? 
              `${chatState.activeMembers} online` : 
              'Connecting...'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full pr-4">
          <div className="space-y-4 py-4">
            {chatState.messages.length > 0 ? (
              chatState.messages.map((msg: Message, i: number) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col p-3 rounded-lg max-w-[80%]",
                    msg.senderId === user?.id ? 
                      "ml-auto bg-primary text-primary-foreground" : 
                      "bg-muted"
                  )}
                >
                  <div className="text-sm font-semibold">
                    {msg.senderId === user?.id ? 'You' : `User ${msg.senderId}`}
                  </div>
                  <div className="break-words">{msg.content}</div>
                  <div className="text-xs mt-1 self-end opacity-70">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!chatState.isConnected}
            className="flex-grow"
          />
          <Button 
            type="submit" 
            disabled={!chatState.isConnected || !message.trim()}
          >
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}