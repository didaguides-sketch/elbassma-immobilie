import { prisma } from "@/lib/prisma";
import { getOrCreatePublisherReferralLink } from "@/server/services/referral.service";
import { absoluteUrl } from "@/lib/utils/site-url";
import { ShareResourceButton } from "@/components/resources/ShareResourceButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

/**
 * Server component: resolves (or lazily creates) the current publisher's
 * permanent referral link and displays it. Reuses ShareResourceButton
 * as-is (Phase 5, already locale-aware since Batch 5) for copy/native-share
 * — same component, different target string, no duplicated UI logic.
 *
 * No statistics of any kind are shown here — no visit count, no
 * "attributed views," no earnings estimate — per the explicit
 * instruction that this is attribution infrastructure, not a
 * commission program, and no fake numbers.
 */
export async function ReferralLinkPanel({ publisherUserId }: { publisherUserId: string }) {
  const dict = await getDictionary(await getLocale());
  const profile = await prisma.profile.findUnique({
    where: { userId: publisherUserId },
    select: { fullName: true },
  });
  const displayNameForCode = profile?.fullName ?? "publisher";

  const link = await getOrCreatePublisherReferralLink(publisherUserId, displayNameForCode);
  const referralUrl = absoluteUrl(`/p/${link.code}`);

  return (
    <div className="mb-6 rounded border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-body-sm font-semibold text-globanic-navy">{dict.publisherDashboard.referralHeading}</h2>
      <p className="mb-3 text-caption text-slate-500">
        {dict.publisherDashboard.referralDescription}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded bg-slate-50 px-3 py-2 text-body-sm text-globanic-navy">{referralUrl}</code>
        <ShareResourceButton url={referralUrl} title="Globanic" />
      </div>
    </div>
  );
}
