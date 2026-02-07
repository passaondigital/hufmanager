// ============================================
// Hufschuh-Größentabellen bekannter Hersteller
// Breite × Länge in mm
// ============================================

export interface HufschuhSize {
  size: string;
  lengthMin: number;
  lengthMax: number;
  widthMin: number;
  widthMax: number;
}

export interface HufschuhBrand {
  brand: string;
  model: string;
  sizes: HufschuhSize[];
  shopUrl?: string;
  imageUrl?: string;
}

// Scoot Boot Größentabelle (Slim & Regular)
const scootBootSlim: HufschuhBrand = {
  brand: "Scoot Boot",
  model: "Slim",
  sizes: [
    { size: "00 Slim", lengthMin: 100, lengthMax: 108, widthMin: 95, widthMax: 100 },
    { size: "0 Slim", lengthMin: 108, lengthMax: 116, widthMin: 100, widthMax: 108 },
    { size: "1 Slim", lengthMin: 116, lengthMax: 124, widthMin: 108, widthMax: 116 },
    { size: "2 Slim", lengthMin: 124, lengthMax: 132, widthMin: 116, widthMax: 124 },
    { size: "3 Slim", lengthMin: 132, lengthMax: 140, widthMin: 124, widthMax: 130 },
    { size: "4 Slim", lengthMin: 140, lengthMax: 148, widthMin: 130, widthMax: 138 },
    { size: "5 Slim", lengthMin: 148, lengthMax: 157, widthMin: 138, widthMax: 147 },
    { size: "6 Slim", lengthMin: 157, lengthMax: 165, widthMin: 147, widthMax: 155 },
  ],
};

const scootBootRegular: HufschuhBrand = {
  brand: "Scoot Boot",
  model: "Regular",
  sizes: [
    { size: "00", lengthMin: 100, lengthMax: 108, widthMin: 100, widthMax: 110 },
    { size: "0", lengthMin: 108, lengthMax: 116, widthMin: 108, widthMax: 118 },
    { size: "1", lengthMin: 116, lengthMax: 124, widthMin: 116, widthMax: 126 },
    { size: "2", lengthMin: 124, lengthMax: 132, widthMin: 124, widthMax: 134 },
    { size: "3", lengthMin: 132, lengthMax: 140, widthMin: 130, widthMax: 142 },
    { size: "4", lengthMin: 140, lengthMax: 148, widthMin: 138, widthMax: 150 },
    { size: "5", lengthMin: 148, lengthMax: 157, widthMin: 147, widthMax: 160 },
    { size: "6", lengthMin: 157, lengthMax: 165, widthMin: 155, widthMax: 168 },
  ],
};

// EasyCare Easyboot Glove
const easybootGlove: HufschuhBrand = {
  brand: "EasyCare",
  model: "Easyboot Glove Soft",
  sizes: [
    { size: "000", lengthMin: 95, lengthMax: 102, widthMin: 83, widthMax: 95 },
    { size: "00", lengthMin: 102, lengthMax: 111, widthMin: 95, widthMax: 105 },
    { size: "0", lengthMin: 111, lengthMax: 117, widthMin: 105, widthMax: 111 },
    { size: "0.5", lengthMin: 117, lengthMax: 121, widthMin: 111, widthMax: 117 },
    { size: "1", lengthMin: 121, lengthMax: 127, widthMin: 117, widthMax: 124 },
    { size: "1.5", lengthMin: 127, lengthMax: 133, widthMin: 121, widthMax: 127 },
    { size: "2", lengthMin: 133, lengthMax: 140, widthMin: 127, widthMax: 137 },
    { size: "3", lengthMin: 140, lengthMax: 149, widthMin: 137, widthMax: 146 },
    { size: "4", lengthMin: 149, lengthMax: 156, widthMin: 146, widthMax: 152 },
    { size: "5", lengthMin: 156, lengthMax: 165, widthMin: 152, widthMax: 162 },
    { size: "6", lengthMin: 165, lengthMax: 175, widthMin: 162, widthMax: 172 },
  ],
};

// Renegade Hoof Boot
const renegadeViper: HufschuhBrand = {
  brand: "Renegade",
  model: "Viper",
  sizes: [
    { size: "00", lengthMin: 102, lengthMax: 111, widthMin: 95, widthMax: 108 },
    { size: "0", lengthMin: 111, lengthMax: 121, widthMin: 108, widthMax: 117 },
    { size: "1", lengthMin: 121, lengthMax: 130, widthMin: 117, widthMax: 127 },
    { size: "2", lengthMin: 130, lengthMax: 143, widthMin: 127, widthMax: 140 },
    { size: "3", lengthMin: 143, lengthMax: 152, widthMin: 140, widthMax: 149 },
    { size: "4", lengthMin: 152, lengthMax: 162, widthMin: 149, widthMax: 159 },
  ],
};

// Flex Boot
const flexBoot: HufschuhBrand = {
  brand: "Flex Boot",
  model: "Flex Regular",
  sizes: [
    { size: "XS", lengthMin: 100, lengthMax: 115, widthMin: 95, widthMax: 110 },
    { size: "S", lengthMin: 115, lengthMax: 130, widthMin: 110, widthMax: 125 },
    { size: "M", lengthMin: 130, lengthMax: 145, widthMin: 125, widthMax: 140 },
    { size: "L", lengthMin: 145, lengthMax: 160, widthMin: 140, widthMax: 155 },
    { size: "XL", lengthMin: 160, lengthMax: 175, widthMin: 155, widthMax: 170 },
  ],
};

// Alle Marken
export const HUFSCHUH_BRANDS: HufschuhBrand[] = [
  scootBootRegular,
  scootBootSlim,
  easybootGlove,
  renegadeViper,
  flexBoot,
];

export interface SizeRecommendation {
  brand: string;
  model: string;
  size: string;
  fit: "perfect" | "tight" | "loose";
  shopUrl?: string;
}

/**
 * Berechne passende Hufschuh-Größen basierend auf Länge und Breite
 */
export function calculateSizeRecommendations(
  lengthMm: number,
  widthMm: number
): SizeRecommendation[] {
  const recommendations: SizeRecommendation[] = [];

  for (const brand of HUFSCHUH_BRANDS) {
    for (const size of brand.sizes) {
      const lengthFits =
        lengthMm >= size.lengthMin && lengthMm <= size.lengthMax;
      const widthFits =
        widthMm >= size.widthMin && widthMm <= size.widthMax;

      // Toleranz: +/- 3mm für "eng" oder "weit"
      const lengthTight =
        lengthMm >= size.lengthMin - 3 && lengthMm < size.lengthMin;
      const lengthLoose =
        lengthMm > size.lengthMax && lengthMm <= size.lengthMax + 3;
      const widthTight =
        widthMm >= size.widthMin - 3 && widthMm < size.widthMin;
      const widthLoose =
        widthMm > size.widthMax && widthMm <= size.widthMax + 3;

      if (lengthFits && widthFits) {
        recommendations.push({
          brand: brand.brand,
          model: brand.model,
          size: size.size,
          fit: "perfect",
          shopUrl: brand.shopUrl,
        });
      } else if (
        (lengthFits || lengthTight) &&
        (widthFits || widthTight)
      ) {
        recommendations.push({
          brand: brand.brand,
          model: brand.model,
          size: size.size,
          fit: "tight",
          shopUrl: brand.shopUrl,
        });
      } else if (
        (lengthFits || lengthLoose) &&
        (widthFits || widthLoose)
      ) {
        recommendations.push({
          brand: brand.brand,
          model: brand.model,
          size: size.size,
          fit: "loose",
          shopUrl: brand.shopUrl,
        });
      }
    }
  }

  // Sortiere: perfekt > eng > weit
  const fitOrder = { perfect: 0, tight: 1, loose: 2 };
  recommendations.sort((a, b) => fitOrder[a.fit] - fitOrder[b.fit]);

  return recommendations;
}
