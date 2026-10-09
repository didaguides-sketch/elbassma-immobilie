"use client";

import { useEffect, useRef } from "react";
import { recordViewAction, qualifyViewAction } from "@/server/actions/public-resource.actions";

const DWELL_TIME_MS = 20_000;

export function ResourceViewTracker({ resourceId }: { resourceId: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const startedAt = Date.now();
    let viewId: string | null = null;
    let isEligible = false;
    let qualified = false;

    function maybeQualify() {
      if (qualified || !isEligible || !viewId) return;
      if (Date.now() - startedAt < DWELL_TIME_MS) return;
      qualified = true;
      qualifyViewAction(viewId).catch(() => {
        // Swallow — qualification failure must never disrupt the visitor.
      });
    }

    recordViewAction(resourceId)
      .then((result) => {
        if (!result || !result.isEligible) return;
        viewId = result.viewId;
        isEligible = true;
        maybeQualify();
      })
      .catch(() => {
        // Swallow — view tracking must never disrupt the visitor's experience.
      });

    // Real wall-clock elapsed time, checked periodically AND right as the
    // visitor leaves — a plain setTimeout gets throttled/paused by mobile
    // browsers once the tab is backgrounded, which silently never fires.
    const interval = setInterval(maybeQualify, 2000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") maybeQualify();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", maybeQualify);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", maybeQualify);
    };
  }, [resourceId]);

  return null;
}
