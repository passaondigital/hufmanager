import { HufCamProStandalone } from "@/components/hufcam";
import { Camera } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

const EmployeeHufCam = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          HufCam Pro
          <HelpTip id="mitarbeiter.hufcam" />
        </h1>
        <p className="text-sm text-muted-foreground">Professionelle Huf-Fotodokumentation</p>
      </div>
      <HufCamProStandalone />
    </div>
  );
};

export default EmployeeHufCam;
