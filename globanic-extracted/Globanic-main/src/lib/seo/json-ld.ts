type ResourceForJsonLd = {
  title: string;
  abstract: string | null;
  description: string | null;
  type: string;
  updatedAt: Date;
  publishedAt: Date | null;
  authors: { author: { fullName: string } }[];
  university: { name: string } | null;
};

export function buildResourceJsonLd(resource: ResourceForJsonLd, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: resource.title,
    description: resource.abstract || resource.description || undefined,
    learningResourceType: resource.type,
    url,
    dateModified: resource.updatedAt.toISOString(),
    ...(resource.publishedAt ? { datePublished: resource.publishedAt.toISOString() } : {}),
    ...(resource.authors.length > 0
      ? { author: resource.authors.map((a) => ({ "@type": "Person", name: a.author.fullName })) }
      : {}),
    ...(resource.university
      ? { publisher: { "@type": "CollegeOrUniversity", name: resource.university.name } }
      : {}),
  };
}

/**
 * Schema.org Article, used specifically for Resource.type === ARTICLE —
 * more semantically correct than the generic CreativeWork used for
 * every other resource type (real headline/author/dates, nothing
 * fabricated). `publisher` here is Globanic itself (the platform that
 * actually published the page), which is the standard schema.org
 * convention for this field — distinct from, and not to be confused
 * with, the business "Publisher" (Resource.uploadedBy) shown elsewhere
 * on the page as a real, separate identity.
 */
export function buildArticleJsonLd(resource: ResourceForJsonLd, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: resource.title,
    description: resource.abstract || resource.description || undefined,
    url,
    dateModified: resource.updatedAt.toISOString(),
    ...(resource.publishedAt ? { datePublished: resource.publishedAt.toISOString() } : {}),
    ...(resource.authors.length > 0
      ? { author: resource.authors.map((a) => ({ "@type": "Person", name: a.author.fullName })) }
      : {}),
    publisher: { "@type": "Organization", name: "Globanic" },
  };
}

type AuthorForJsonLd = {
  fullName: string;
  bio: string | null;
  university: { name: string } | null;
};

export function buildAuthorJsonLd(author: AuthorForJsonLd, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.fullName,
    description: author.bio || undefined,
    url,
    ...(author.university
      ? { affiliation: { "@type": "CollegeOrUniversity", name: author.university.name } }
      : {}),
  };
}

type UniversityForJsonLd = {
  name: string;
  city: string | null;
  country: string | null;
  officialWebsite: string | null;
};

export function buildUniversityJsonLd(university: UniversityForJsonLd, url: string) {
  const hasAddress = !!(university.city || university.country);

  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: university.name,
    url,
    ...(hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            ...(university.city ? { addressLocality: university.city } : {}),
            ...(university.country ? { addressCountry: university.country } : {}),
          },
        }
      : {}),
    ...(university.officialWebsite ? { sameAs: university.officialWebsite } : {}),
  };
}
