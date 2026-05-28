"use client";

import { useEffect, useState } from "react";
import { HomeGrid } from "@/components/home-grid";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <HomeGrid />;
}
