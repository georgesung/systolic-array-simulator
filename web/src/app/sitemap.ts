import type { MetadataRoute } from "next";

const SITE_URL = "https://systolic-array-simulator.georgesung.com";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date("2026-08-17T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
