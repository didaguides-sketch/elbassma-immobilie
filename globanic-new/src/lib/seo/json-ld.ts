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
