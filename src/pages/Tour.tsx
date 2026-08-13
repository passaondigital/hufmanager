import { useLocation } from "react-router-dom";
import { DayCockpit } from "@/components/day-cockpit";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SlimTourScreen } from "@/components/slim/SlimTourScreen";

const TourPage = () => {
  const location = useLocation();

  if (location.pathname === "/home/tour") {
    return <SlimTourScreen />;
  }

  return (
    <ProtectedRoute allowedRoles={["provider", "admin"]}>
      <DayCockpit />
    </ProtectedRoute>
  );
};

export default TourPage;
