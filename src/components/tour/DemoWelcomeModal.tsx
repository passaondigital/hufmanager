import { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Zap, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DemoRole, DemoTourTopic, demoTourConfigs } from './demoTourDefinitions';

interface DemoWelcomeModalProps {
  role: DemoRole;
  open: boolean;
  onClose: () => void;
  onStartTour: (topicId: string, mode: 'quick' | 'detailed') => void;
}

const roleLabels: Record<DemoRole, string> = {
  provider: 'Hufbearbeiter',
  client: 'Pferdebesitzer',
  partner: 'Fachpartner',
  employee: 'Mitarbeiter',
};

export function DemoWelcomeModal({ role, open, onClose, onStartTour }: DemoWelcomeModalProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const config = demoTourConfigs[role];

  const handleStart = (mode: 'quick' | 'detailed') => {
    if (!selectedTopic) return;
    onStartTour(selectedTopic, mode);
    onClose();
    setSelectedTopic(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSelectedTopic(null); } }}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">
              Willkommen, {roleLabels[role]}!
            </DialogTitle>
          </div>
          <DialogDescription>
            Womit möchtest du starten? Wähle ein Thema und die Tour-Länge.
          </DialogDescription>
        </DialogHeader>

        {/* Topic Selection */}
        <div className="grid gap-2 mt-2">
          {config.topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              selected={selectedTopic === topic.id}
              onClick={() => setSelectedTopic(topic.id)}
            />
          ))}
        </div>

        {/* Mode Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-12"
            disabled={!selectedTopic}
            onClick={() => handleStart('quick')}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <div className="text-left">
              <div className="text-sm font-medium">Schnelle Tour</div>
              <div className="text-[10px] text-muted-foreground">5 Schritte · ~2 Min.</div>
            </div>
          </Button>
          <Button
            className="flex-1 gap-2 h-12"
            disabled={!selectedTopic}
            onClick={() => handleStart('detailed')}
          >
            <BookOpen className="h-4 w-4" />
            <div className="text-left">
              <div className="text-sm font-medium">Ausführliche Tour</div>
              <div className="text-[10px] text-primary-foreground/70">10-12 Schritte · ~5 Min.</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopicCard({ topic, selected, onClick }: { topic: DemoTourTopic; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border hover:border-primary/30 hover:bg-muted/50'
      )}
    >
      <span className="text-xl flex-shrink-0">{topic.emoji}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{topic.label}</div>
        <div className="text-xs text-muted-foreground truncate">{topic.description}</div>
      </div>
      {selected && (
        <div className="ml-auto flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
      )}
    </motion.button>
  );
}
