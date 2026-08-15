import { SlimTourScreen } from "@/components/slim/SlimTourScreen";
import { TourArrivalControl } from "@/components/slim/TourArrivalControl";
import { TourQuickGuide } from "@/components/slim/TourQuickGuide";

const TourPage = () => (
  <>
    <TourQuickGuide />
    <TourArrivalControl />
    <SlimTourScreen />
  </>
);

export default TourPage;
