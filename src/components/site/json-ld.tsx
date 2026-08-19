import type { PublicPiece } from "@convex/pieces";
import { collectionLabel } from "@/lib/shop";
import { site } from "@/lib/site";

const schemaAvailability = {
  available: "https://schema.org/InStock",
  sold: "https://schema.org/SoldOut",
  unreleased: "https://schema.org/PreOrder",
  hidden: "https://schema.org/OutOfStock",
} as const;

/**
 * Structured data for search engines. LocalBusiness powers local/Maps results;
 * each Product entry points at its live shop page, which carries the full
 * Product markup of its own.
 */
export function JsonLd({ pieces }: { pieces: PublicPiece[] }) {
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
      "@id": `${site.url}/shop/${piece.slug}`,
      name: piece.title,
      description: piece.description,
      category: collectionLabel[piece.collection],
      image: piece.imageUrls.slice(0, 1),
      brand: { "@type": "Brand", name: site.name },
      offers: {
        "@type": "Offer",
        price: (piece.priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        availability: schemaAvailability[piece.availability.state],
        url: `${site.url}/shop/${piece.slug}`,
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
