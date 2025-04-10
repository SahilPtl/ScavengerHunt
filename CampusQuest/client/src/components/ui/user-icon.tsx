import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";

interface UserProps {
  className?: string;
}

export function User({ className }: UserProps) {
  return (
    <Avatar className={className}>
      <AvatarFallback>
        <UserIcon className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  );
}
