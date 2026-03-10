import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

interface WiderrufsausschlussCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: boolean;
}

export function WiderrufsausschlussCheckbox({ checked, onCheckedChange, error }: WiderrufsausschlussCheckboxProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <Checkbox
          id="widerrufsausschluss-consent"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="widerrufsausschluss-consent" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
          Ich stimme ausdrücklich zu, dass der Anbieter mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnt. Ich habe zur Kenntnis genommen, dass ich durch meine Zustimmung mit Beginn der Vertragsausführung mein Widerrufsrecht verliere. *
        </Label>
      </div>
      {error && !checked && (
        <p className="text-destructive text-xs ml-7">
          Bitte bestätigen Sie den Widerrufsausschluss um fortzufahren.
        </p>
      )}
      <p className="text-xs text-muted-foreground ml-7">
        Weitere Informationen finden Sie in unserer{" "}
        <Link to="/widerruf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Widerrufsbelehrung
        </Link>.
      </p>
    </div>
  );
}
