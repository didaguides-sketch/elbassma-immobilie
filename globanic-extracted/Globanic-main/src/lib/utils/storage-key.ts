import { randomUUID } from "node:crypto";

/**
 * Builds a storage key that is:
 *  - unique (UUID, collisions astronomically unlikely — no DB round-trip needed)
 *  - namespaced by resource, so an admin can audit/delete "everything under
 *    this resource" trivially
 *  - never built from the user-supplied filename (avoids path traversal,
 *    weird Unicode, or characters some providers mishandle)
 */
export function buildDocumentStorageKey(resourceId: string, extension: string): string {
  return `resources/${resourceId}/versions/${randomUUID()}.${extension}`;
}

export function buildCoverImageStorageKey(resourceId: string, extension: string): string {
  return `resources/${resourceId}/cover/${randomUUID()}.${extension}`;
}

export function buildPublisherProofStorageKey(applicationId: string, extension: string): string {
  return `publisher-applications/${applicationId}/proof/${randomUUID()}.${extension}`;
}
