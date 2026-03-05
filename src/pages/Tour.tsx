import { DayCockpit } from "@/components/day-cockpit";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const TourPage = () => {
  return (
    <ProtectedRoute allowedRoles={["provider", "admin"]}>
      <DayCockpit />
    </ProtectedRoute>
  );
};

export default TourPage;
