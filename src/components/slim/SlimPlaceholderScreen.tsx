import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SlimPlaceholderScreen({
  title,
  description,
  primaryActionLabel,
  primaryActionPath,
}: {
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionPath: string;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">HUFMANAGER SLIM</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(primaryActionPath)}
          className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          {primaryActionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Zurück zu Heute
        </button>
      </div>
    </section>
  );
}

