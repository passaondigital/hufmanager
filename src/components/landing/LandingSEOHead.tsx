import { useEffect } from "react";

interface LandingSEOHeadProps {
  settings: {
    business_name: string | null;
    owner_name: string | null;
    hero_headline: string | null;
    meta_description: string | null;
    logo_url: string | null;
    subdomain: string | null;
    phone?: string | null;
    address?: string | null;
    google_search_console_code?: string | null;
  };
}

export const LandingSEOHead = ({ settings }: LandingSEOHeadProps) => {
  const title = settings.business_name || settings.owner_name || 'Hufbearbeitung';
  const description = settings.meta_description || settings.hero_headline || 'Professionelle Hufpflege für Ihr Pferd';

  useEffect(() => {
    // Title
    document.title = `${title} | Professionelle Hufbearbeitung`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Open Graph
    const ogTags: Record<string, string> = {
      'og:title': title,
      'og:description': description,
      'og:type': 'website',
    };
    if (settings.logo_url) ogTags['og:image'] = settings.logo_url;

    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // JSON-LD structured data - LocalBusiness
    const existingScript = document.querySelector('#landing-jsonld');
    if (existingScript) existingScript.remove();

    const jsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: title,
      description,
      ...(settings.logo_url && { image: settings.logo_url }),
      ...(settings.subdomain && { url: `https://hufmanager.de/p/${settings.subdomain}` }),
      ...(settings.phone && { telephone: settings.phone }),
      priceRange: '€€',
    };

    if (settings.address) {
      const parts = settings.address.split(',').map(s => s.trim());
      jsonLd.address = {
        '@type': 'PostalAddress',
        streetAddress: parts[0] || '',
        addressLocality: parts[1] || '',
        postalCode: parts[2] || '',
        addressCountry: 'DE',
      };
    }

    const script = document.createElement('script');
    script.id = 'landing-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    // Google Search Console verification
    if (settings.google_search_console_code) {
      let gscTag = document.querySelector('meta[name="google-site-verification"]');
      if (!gscTag) {
        gscTag = document.createElement('meta');
        gscTag.setAttribute('name', 'google-site-verification');
        document.head.appendChild(gscTag);
      }
      gscTag.setAttribute('content', settings.google_search_console_code);
    }

    return () => {
      document.title = 'HufManager';
      const ldScript = document.querySelector('#landing-jsonld');
      if (ldScript) ldScript.remove();
    };
  }, [title, description, settings.logo_url, settings.subdomain]);

  return null;
};
