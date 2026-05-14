import { useAuth } from "@/hooks/useAuth";
import { HufiMemoryViewer } from "@/components/memory/HufiMemoryViewer";
import { useNavigate } from "react-router-dom";

export default function HufiMemoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
      <HufiMemoryViewer userId={user?.id ?? ""} onClose={() => navigate(-1)} />
    </div>
  );
}
