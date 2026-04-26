import { FileText, Calculator, TrendingDown, TrendingUp, Car, Package, Download } from "lucide-react";
import { Link } from "react-router-dom";

export default function Business() {
  const businessLinks = [
    { name: "Rechnungen", icon: FileText, path: "/rechnungen", color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Buchhaltung", icon: Calculator, path: "/buchhaltung", color: "text-amber-500", bg: "bg-amber-50" },
    { name: "Ausgaben", icon: TrendingDown, path: "/ausgaben", color: "text-red-500", bg: "bg-red-50" },
    { name: "GuV", icon: TrendingUp, path: "/guv", color: "text-emerald-500", bg: "bg-emerald-50" },
    { name: "Fuhrpark", icon: Car, path: "/fuhrpark", color: "text-slate-500", bg: "bg-slate-50" },
    { name: "Lager", icon: Package, path: "/lager", color: "text-indigo-500", bg: "bg-indigo-50" },
    { name: "Daten-Export", icon: Download, path: "/settings", color: "text-gray-500", bg: "bg-gray-50" },
  ];

  return (
    <div className="pb-24">
      <div className="p-6 bg-white border-b sticky top-0 z-10 flex items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Hufi Business</h1>
      </div>
      <div className="p-4 space-y-6 mt-4">
        <p className="text-gray-500 text-sm">Dein gesamter Betrieb auf einen Blick.</p>
        
        <div className="grid grid-cols-2 gap-4">
          {businessLinks.map((link) => (
            <Link key={link.name} to={link.path} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
              <div className={`p-3 rounded-xl ${link.bg}`}>
                <link.icon className={`w-6 h-6 ${link.color}`} />
              </div>
              <span className="font-medium text-gray-800 text-sm">{link.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
