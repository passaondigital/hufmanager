import { Navigate } from "react-router-dom";
import WebsiteHome from "@/pages/website/WebsiteHome";

const LANDING_HOSTS = ["www.hufmanager.de", "hufmanager.de"];

const Index = () => {
  const hostname = window.location.hostname;
  
  if (LANDING_HOSTS.includes(hostname)) {
    return <WebsiteHome />;
  }
  
  // app.hufmanager.de or preview → Auth login
  return <Navigate to="/auth" replace />;
};

export default Index;
