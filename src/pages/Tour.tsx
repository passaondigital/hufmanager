import { SlimTourScreen } from "@/components/slim/SlimTourScreen";
import { TourArrivalControl } from "@/components/slim/TourArrivalControl";
import { TourLiveEditControl } from "@/components/slim/TourLiveEditControl";
import { TourQuickGuide } from "@/components/slim/TourQuickGuide";

const TourPage = () => (
  <>
    <TourQuickGuide />
    <TourArrivalControl />
    <TourLiveEditControl />
    <SlimTourScreen />
  </>
);

export default TourPage;
