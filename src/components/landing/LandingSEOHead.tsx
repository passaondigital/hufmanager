import { useEffect } from "react";

interface LandingSEOHeadProps {
  settings: {
    business_name: string | null;
    owner_name: string | null;
    hero_headline: string | null;
    meta_description: string | null;
    logo_url: string | null;
    subdomain: string | null;
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

    // JSON-LD structured data
    const existingScript = document.querySelector('#landing-jsonld');
    if (existingScript) existingScript.remove();

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: title,
      description,
      ...(settings.logo_url && { image: settings.logo_url }),
      ...(settings.subdomain && { url: `https://hufmanager.lovable.app/p/${settings.subdomain}` }),
    };

    const script = document.createElement('script');
    script.id = 'landing-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.title = 'HufManager';
      const ldScript = document.querySelector('#landing-jsonld');
      if (ldScript) ldScript.remove();
    };
  }, [title, description, settings.logo_url, settings.subdomain]);

  return null;
};
