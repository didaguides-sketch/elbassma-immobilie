import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError } from "@/server/services/resource.service";
import { getResourceCoverAccess } from "@/server/services/resource-access.service";
import { getStorageProvider } from "@/server/storage";
import { LocalStorageProvider } from "@/server/storage/local.provider";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const actor = session?.user ? { id: session.user.id, role: session.user.role } : null;

  try {
    const { storageKey, mimeType } = await getResourceCoverAccess(actor, params.id);
    const storage = await getStorageProvider();

    if (storage instanceof LocalStorageProvider) {
      const buffer = await storage.readFile(storageKey);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          // Private: this may be a draft's cover, gated by the same
          // permission check every time — never let a shared/browser
          // cache serve it to someone else.
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    // S3/R2/Supabase: a real, time-limited, provider-signed URL.
    const url = await storage.getSignedDownloadUrl(storageKey, 300);
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof NotFoundError) return new NextResponse("Not found", { status: 404 });
    if (error instanceof ForbiddenError) return new NextResponse("Forbidden", { status: 403 });
    // eslint-disable-next-line no-console
    console.error("[api/resources/cover] unexpected error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
