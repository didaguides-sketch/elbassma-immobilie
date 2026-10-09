import { NextRequest, NextResponse } from "next/server";
import { LocalStorageProvider } from "@/server/storage/local.provider";

/**
 * DEV-ONLY. Lets you open a stored file directly by key while developing
 * (e.g. to eyeball what LocalStorageProvider actually wrote to disk).
 *
 * This route has NO permission check of its own — it is NOT what
 * `/publisher/resources/[id]` or the public resource page link to. Those
 * go through `/api/resources/[id]/file` and `/api/resources/[id]/cover`,
 * which check ownership/publish-status before ever touching storage.
 *
 * Disabled entirely in production and whenever STORAGE_PROVIDER !== "local",
 * so it can never become an accidental unauthenticated file server.
 */
export async function GET(_req: NextRequest, { params }: { params: { key: string[] } }) {
  const isLocalDev =
    process.env.NODE_ENV !== "production" && (process.env.STORAGE_PROVIDER ?? "local") === "local";

  if (!isLocalDev) {
    return new NextResponse("Not found", { status: 404 });
  }

  const key = params.key.join("/");

  try {
    const provider = new LocalStorageProvider();
    const buffer = await provider.readFile(key);
    return new NextResponse(buffer);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
