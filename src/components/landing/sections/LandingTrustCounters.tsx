import { useEffect, useRef, useState } from "react";
import { Footprints, Clock, MapPin } from "lucide-react";

interface Props {
  horsesTreated: number;
  yearsExperience: number;
  serviceAreaKm: number;
  primaryColor: string;
}

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current || target <= 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export const LandingTrustCounters = ({ horsesTreated, yearsExperience, serviceAreaKm, primaryColor }: Props) => {
  const horses = useCountUp(horsesTreated);
  const years = useCountUp(yearsExperience);
  const area = useCountUp(serviceAreaKm);

  const counters = [
    { value: horses.count, ref: horses.ref, label: "Pferde betreut", icon: Footprints, show: horsesTreated > 0 },
    { value: years.count, ref: years.ref, label: "Jahre Erfahrung", icon: Clock, show: yearsExperience > 0 },
    { value: `${area.count}km`, ref: area.ref, label: "Einzugsgebiet", icon: MapPin, show: serviceAreaKm > 0 },
  ].filter((c) => c.show);

  if (counters.length === 0) return null;

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className={`grid gap-6 ${counters.length === 3 ? "grid-cols-3" : counters.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {counters.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} ref={c.ref} className="text-center">
                <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl md:text-4xl font-bold" style={{ color: primaryColor }}>
                  {typeof c.value === "number" ? c.value.toLocaleString("de-DE") : c.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
