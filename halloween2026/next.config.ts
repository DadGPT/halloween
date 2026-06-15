import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — the repo has several lockfiles above this app.
  turbopack: { root: __dirname },
  images: {
    // Supabase Storage public URLs live on the project's *.supabase.co host.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
