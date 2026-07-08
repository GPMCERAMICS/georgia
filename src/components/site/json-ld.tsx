import { pieces, site } from "@/lib/site";

/**
 * Structured data for search engines. LocalBusiness powers local/Maps results;
 * each Product helps pieces surface in shopping/rich results.
 */
export function JsonLd() {
  const graph = [
    {
      "@type": "LocalBusiness",
      "@id": `${site.url}/#business`,
      name: site.name,
      description: site.description,
      url: site.url,
      email: site.email,
      image: `${site.url}/opengraph-image`,
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        addressLocality: site.location.city,
        addressRegion: site.location.region,
        addressCountry: site.location.country,
      },
      sameAs: [site.social.instagram, site.social.pinterest].filter(Boolean),
    },
    ...pieces.map((piece) => ({
      "@type": "Product",
      "@id": `${site.url}/#${piece.id}`,
      name: piece.title,
      description: piece.description,
      category: piece.category,
      brand: { "@type": "Brand", name: site.name },
      offers: {
        "@type": "Offer",
        price: piece.price.replace(/[^0-9.]/g, ""),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${site.url}/#work`,
      },
    })),
  ];

  const json = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
