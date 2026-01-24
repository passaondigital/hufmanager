import { TourManager } from "@/components/tour-manager";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const TourPage = () => {
  return (
    <ProtectedRoute allowedRoles={["provider", "admin"]}>
      <TourManager />
    </ProtectedRoute>
  );
};

export default TourPage;
