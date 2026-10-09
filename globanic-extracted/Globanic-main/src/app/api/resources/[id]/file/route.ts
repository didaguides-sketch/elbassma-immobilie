import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError } from "@/server/services/resource.service";
import { getResourceDocumentAccess } from "@/server/services/resource-access.service";
import { recordResourceDownload } from "@/server/services/analytics-tracking.service";
import { getClientIpHash } from "@/lib/utils/request-ip";
import { getStorageProvider } from "@/server/storage";
import { LocalStorageProvider } from "@/server/storage/local.provider";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const actor = session?.user ? { id: session.user.id, role: session.user.role } : null;

  const versionParam = req.nextUrl.searchParams.get("version");
  const versionNumber = versionParam ? Number.parseInt(versionParam, 10) : undefined;

  try {
    const { storageKey, mimeType, filename } = await getResourceDocumentAccess(
      actor,
      params.id,
      Number.isFinite(versionNumber) ? versionNumber : undefined,
    );

    const storage = await getStorageProvider();
    const isLocalStream = storage instanceof LocalStorageProvider;

    // Best-effort: a tracking failure must never block a legitimate,
    // already-authorized download — but it must be awaited (not
    // fire-and-forget), since serverless runtimes can kill unawaited
    // promises the moment the response is returned. Note this records an
    // *authorized download request*, not a confirmed transfer — see
    // DownloadDeliveryMethod in schema.prisma, especially for REDIRECT.
    try {
      await recordResourceDownload({
        resourceId: params.id,
        downloader: actor,
        ipHash: getClientIpHash(req),
        deliveryMethod: isLocalStream ? "STREAM" : "REDIRECT",
      });
    } catch (trackingError) {
      // eslint-disable-next-line no-console
      console.error("[api/resources/file] download tracking failed:", trackingError);
    }

    if (storage instanceof LocalStorageProvider) {
      const buffer = await storage.readFile(storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
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
    console.error("[api/resources/file] unexpected error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
