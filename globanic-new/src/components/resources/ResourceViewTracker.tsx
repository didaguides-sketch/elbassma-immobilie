"use client";

import { useEffect, useRef } from "react";
import { recordViewAction } from "@/server/actions/public-resource.actions";

export function ResourceViewTracker({ resourceId }: { resourceId: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    recordViewAction(resourceId).catch(() => {
      // Swallow — view tracking must never disrupt the visitor's experience.
    });
  }, [resourceId]);

  return null;
}
