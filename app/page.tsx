"use client";

import { useEffect } from "react";

export default function DabReadyPage() {
  useEffect(() => {
    void import("../src/main");
  }, []);

  return <div id="app" />;
}
