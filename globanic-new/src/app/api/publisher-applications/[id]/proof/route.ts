import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth.config";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError } from "@/server/services/resource.service";
import { getPublisherApplicationProofAccess } from "@/server/services/publisher-application-access.service";
import { getStorageProvider } from "@/server/storage";
import { LocalStorageProvider } from "@/server/storage/local.provider";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();

  // Unlike resource files, there is no "public once approved" path here —
  // an unauthenticated request is rejected outright, before even touching
  // the access-control service.
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { storageKey, mimeType, filename } = await getPublisherApplicationProofAccess(
      { id: session.user.id, role: session.user.role },
      params.id,
    );

    const storage = await getStorageProvider();

    if (storage instanceof LocalStorageProvider) {
      const buffer = await storage.readFile(storageKey);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const url = await storage.getSignedDownloadUrl(storageKey, 300);
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof NotFoundError) return new NextResponse("Not found", { status: 404 });
    if (error instanceof ForbiddenError) return new NextResponse("Forbidden", { status: 403 });
    // eslint-disable-next-line no-console
    console.error("[api/publisher-applications/proof] unexpected error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
