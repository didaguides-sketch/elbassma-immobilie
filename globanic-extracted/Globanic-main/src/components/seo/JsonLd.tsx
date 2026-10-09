export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // A resource title/bio/description is real user-submitted text (via the
  // publisher workflow) — never trust it not to contain "</script>".
  // Escaping every '<' as its unicode form neutralizes that regardless of
  // where it appears in the serialized JSON.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    // eslint-disable-next-line react/no-danger
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
