import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GraduationCap, Rocket, TrendingUp, BookOpen, Play, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AcademyContentModal } from "@/components/academy/AcademyContentModal";

interface AcademyVideo {
  id: string;
  title: string;
  description: string | null;
  category: string;
  video_url: string;
  thumbnail_url: string | null;
  sort_order: number | null;
}

const categories = [
  {
    id: "Schnellstart",
    title: "Schnellstart",
    description: "Erste Schritte in der App – schnell und einfach loslegen",
    icon: Rocket,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "Business Booster",
    title: "Business Booster",
    description: "Preise, Rechnungen & Finanzen professionell managen",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "Pferde-Wissen",
    title: "Pferde-Wissen",
    description: "Experten-Tipps rund um Hufgesundheit & Pflege",
    icon: BookOpen,
    gradient: "from-violet-500 to-purple-600",
  },
];

export default function Academy() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<AcademyVideo | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = role === 'admin';

  const { data: videos, isLoading } = useQuery({
    queryKey: ["academy-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_videos")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as AcademyVideo[];
    },
  });

  const deleteVideo = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase.from("academy_videos").delete().eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-videos"] });
      toast({ title: "Gelöscht", description: "Video wurde entfernt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const filteredVideos = videos?.filter((v) => v.category === selectedCategory) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">MemberHorse Academy</h1>
            <p className="text-muted-foreground">
              Lerne alles, was du für deinen Erfolg als Hufbearbeiter brauchst
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Neuer Kurs
          </Button>
        )}
      </div>

      {/* Category Cards */}
      {!selectedCategory ? (
        <div className="grid gap-6 md:grid-cols-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden group"
              onClick={() => setSelectedCategory(category.id)}
            >
              <div className={`h-2 bg-gradient-to-r ${category.gradient}`} />
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                <CardDescription className="text-sm">
                  {category.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {videos?.filter((v) => v.category === category.id).length || 0} Lektionen
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Category Detail View */
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedCategory(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Übersicht
          </Button>

          <div className="flex items-center gap-4 mb-6">
            {(() => {
              const cat = categories.find((c) => c.id === selectedCategory);
              if (!cat) return null;
              return (
                <>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                    <cat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{cat.title}</h2>
                    <p className="text-muted-foreground">{cat.description}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group relative"
                  onClick={() => setSelectedVideo(video)}
                >
                  {isProviderOrAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Video löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchten Sie "{video.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteVideo.mutate(video.id)}
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <div className="relative aspect-video bg-muted">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                        <Play className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-primary ml-1" />
                      </div>
                    </div>
                  </div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg line-clamp-1">{video.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {video.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="aspect-video w-full">
            {selectedVideo && (
              <iframe
                src={selectedVideo.video_url}
                title={selectedVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedVideo?.title}</DialogTitle>
              <DialogDescription className="text-base">
                {selectedVideo?.description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Content Modal */}
      <AcademyContentModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}
