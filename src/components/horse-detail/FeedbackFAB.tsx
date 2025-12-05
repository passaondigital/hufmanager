import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface FeedbackFABProps {
  horseName: string;
}

export function FeedbackFAB({ horseName }: FeedbackFABProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to chat with context
    // Store context in sessionStorage for the chat to pick up
    sessionStorage.setItem('chatContext', `Betrifft: ${horseName}`);
    navigate('/chat');
  };

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
      size="icon"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
