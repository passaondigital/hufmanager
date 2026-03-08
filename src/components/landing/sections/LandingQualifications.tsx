import { Award } from "lucide-react";

interface Qualification {
  title: string;
  year: string;
  institution?: string;
}

interface LandingQualificationsProps {
  qualifications: Qualification[];
  primaryColor: string;
}

export const LandingQualifications = ({ qualifications, primaryColor }: LandingQualificationsProps) => {
  if (!qualifications || qualifications.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Award className="h-4 w-4" />
            Qualifikationen
          </div>
          <h2 className="text-2xl font-bold text-foreground">Ausbildung & Zertifikate</h2>
        </div>
        <div className="space-y-4">
          {qualifications.map((q, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: primaryColor }}
                />
                {i < qualifications.length - 1 && (
                  <div className="w-0.5 h-full min-h-[2rem] bg-border" />
                )}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium" style={{ color: primaryColor }}>{q.year}</p>
                <p className="font-semibold text-foreground">{q.title}</p>
                {q.institution && (
                  <p className="text-sm text-muted-foreground">{q.institution}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
