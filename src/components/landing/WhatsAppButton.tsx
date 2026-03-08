import { MessageCircle } from "lucide-react";

interface Props {
  phoneNumber: string;
  providerName: string;
}

export const WhatsAppButton = ({ phoneNumber, providerName }: Props) => {
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
  const message = encodeURIComponent(`Hallo ${providerName}, ich habe Interesse an deinen Leistungen und würde gerne mehr erfahren.`);
  const url = `https://wa.me/${cleanNumber}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 hidden md:flex"
      aria-label="WhatsApp kontaktieren"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
};
