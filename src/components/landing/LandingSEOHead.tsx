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
    google_analytics_id?: string | null;
    facebook_pixel_id?: string | null;
  };
  currentPage?: string;
}

const COOKIE_CONSENT_KEY = "huf_cookie_consent";

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    const consent = JSON.parse(raw);
    return consent?.analytics === true;
  } catch {
    return false;
  }
}

function loadGoogleAnalytics(gaId: string) {
  if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  const inline = document.createElement("script");
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}', { anonymize_ip: true });
  `;
  document.head.appendChild(inline);
}

function loadFacebookPixel(pixelId: string) {
  if (document.querySelector(`script[data-fb-pixel]`)) return;
  const script = document.createElement("script");
  script.setAttribute("data-fb-pixel", "true");
  script.textContent = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

function setMetaTag(attr: string, key: string, content: string) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export const LandingSEOHead = ({ settings, currentPage }: LandingSEOHeadProps) => {
  const title = settings.business_name || settings.owner_name || "Hufbearbeitung";
  const description = settings.meta_description || settings.hero_headline || "Professionelle Hufpflege für Ihr Pferd";
  const pageUrl = settings.subdomain
    ? `https://hufiapp.de/p/${settings.subdomain}${currentPage ? `/${currentPage}` : ""}`
    : "";

  useEffect(() => {
    // Title
    document.title = `${title} | Professionelle Hufbearbeitung`;

    // Meta description
    setMetaTag("name", "description", description);

    // Canonical
    if (pageUrl) setLinkTag("canonical", pageUrl);

    // Open Graph
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", "website");
    if (pageUrl) setMetaTag("property", "og:url", pageUrl);
    if (settings.logo_url) setMetaTag("property", "og:image", settings.logo_url);

    // Twitter Card
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    if (settings.logo_url) setMetaTag("name", "twitter:image", settings.logo_url);

    // JSON-LD structured data - LocalBusiness
    const existingScript = document.querySelector("#landing-jsonld");
    if (existingScript) existingScript.remove();

    const jsonLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: title,
      description,
      ...(settings.logo_url && { image: settings.logo_url }),
      ...(pageUrl && { url: pageUrl }),
      ...(settings.phone && { telephone: settings.phone }),
      priceRange: "€€",
    };

    if (settings.address) {
      const parts = settings.address.split(",").map((s) => s.trim());
      jsonLd.address = {
        "@type": "PostalAddress",
        streetAddress: parts[0] || "",
        addressLocality: parts[1] || "",
        postalCode: parts[2] || "",
        addressCountry: "DE",
      };
    }

    const script = document.createElement("script");
    script.id = "landing-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    // Google Search Console verification
    if (settings.google_search_console_code) {
      setMetaTag("name", "google-site-verification", settings.google_search_console_code);
    }

    // Analytics (DSGVO: only after consent)
    if (hasAnalyticsConsent()) {
      if (settings.google_analytics_id) {
        loadGoogleAnalytics(settings.google_analytics_id);
      }
      if (settings.facebook_pixel_id) {
        loadFacebookPixel(settings.facebook_pixel_id);
      }
    }

    return () => {
      document.title = "HufManager";
      const ldScript = document.querySelector("#landing-jsonld");
      if (ldScript) ldScript.remove();
    };
  }, [title, description, settings.logo_url, settings.subdomain, currentPage]);

  return null;
};
