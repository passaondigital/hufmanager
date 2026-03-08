import { ExternalLink, Instagram } from "lucide-react";

interface InstagramPost {
  image_url: string;
  caption?: string;
  post_url?: string;
}

interface Props {
  posts: InstagramPost[];
  instagramHandle?: string | null;
  primaryColor: string;
}

export const LandingInstagramFeed = ({ posts, instagramHandle, primaryColor }: Props) => {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Instagram className="h-4 w-4" />
            Instagram
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            📸 Folge mir auf Instagram
          </h2>
          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:underline"
              style={{ color: primaryColor }}
            >
              @{instagramHandle.replace("@", "")}
            </a>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-xl mx-auto">
          {posts.slice(0, 9).map((post, i) => (
            <a
              key={i}
              href={post.post_url || "#"}
              target={post.post_url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden group relative block"
            >
              <img
                src={post.image_url}
                alt={post.caption || `Instagram ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>

        {instagramHandle && (
          <div className="text-center mt-6">
            <a
              href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Zu Instagram <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
