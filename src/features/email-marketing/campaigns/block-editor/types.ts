export type BlockType = "heading" | "text" | "image" | "button" | "divider" | "spacer";

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  // Heading
  level?: "h1" | "h2" | "h3";
  // Image
  imageUrl?: string;
  altText?: string;
  // Button
  buttonUrl?: string;
  buttonColor?: string;
  // Text alignment
  align?: "left" | "center" | "right";
  // Spacer
  height?: number;
}

export const BLOCK_DEFAULTS: Record<BlockType, Partial<EmailBlock>> = {
  heading: { content: "Überschrift", level: "h1", align: "left" },
  text: { content: "Dein Text hier...", align: "left" },
  image: { content: "", imageUrl: "", altText: "Bild" },
  button: { content: "Jetzt entdecken", buttonUrl: "#", buttonColor: "#F47B20", align: "center" },
  divider: { content: "" },
  spacer: { content: "", height: 24 },
};

export function blocksToHtml(blocks: EmailBlock[]): string {
  const inner = blocks.map(b => {
    switch (b.type) {
      case "heading": {
        const tag = b.level || "h1";
        const sizes: Record<string, string> = { h1: "24px", h2: "20px", h3: "16px" };
        return `<${tag} style="color: #000; font-size: ${sizes[tag]}; text-align: ${b.align || "left"}; margin: 0 0 8px;">${b.content}</${tag}>`;
      }
      case "text":
        return `<p style="color: #333; line-height: 1.6; text-align: ${b.align || "left"}; margin: 0 0 16px;">${b.content}</p>`;
      case "image":
        return `<img src="${b.imageUrl || "https://placehold.co/600x200/f5f5f5/999?text=Bild"}" alt="${b.altText || ""}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 0 0 16px;" />`;
      case "button":
        return `<div style="text-align: ${b.align || "center"}; margin: 16px 0;"><a href="${b.buttonUrl || "#"}" style="display: inline-block; background: ${b.buttonColor || "#F47B20"}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">${b.content}</a></div>`;
      case "divider":
        return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />`;
      case "spacer":
        return `<div style="height: ${b.height || 24}px;"></div>`;
      default:
        return "";
    }
  }).join("\n");

  return `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">\n${inner}\n</div>`;
}

export function htmlToBlocks(html: string): EmailBlock[] | null {
  // Simple parser - returns null if can't parse (user should use raw HTML mode)
  if (!html || !html.includes("</")) return null;
  // Default: return null to indicate HTML mode
  return null;
}
