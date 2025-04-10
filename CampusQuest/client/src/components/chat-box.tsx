import { useState, useEffect, useRef } from "react";
import { Message } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "@/components/ui/user-icon";
import { Send } from "lucide-react";
import { format } from "date-fns";

interface ChatBoxProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  className?: string;
}

export default function ChatBox({ messages, onSendMessage, className }: ChatBoxProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    console.log('Sending new message:', newMessage); // Debug log
    onSendMessage(newMessage);
    setNewMessage("");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Hunt Chat</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={scrollAreaRef}
          className="h-[300px] overflow-y-auto p-4"
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 ${
                  message.senderId === user?.id ? "flex-row-reverse" : ""
                }`}
              >
                <User className="h-8 w-8 flex-shrink-0" />
                <div
                  className={`rounded-lg p-2 max-w-[80%] ${
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs opacity-70 mb-1">
                      {message.senderId === user?.id ? "You" : `User ${message.senderId}`}
                    </span>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(message.timestamp), "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="border-t p-4 flex items-center gap-2"
        >
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}