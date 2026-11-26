import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let phones on the same Wi-Fi load the dev server by the Mac's local name or IP.
  // (Use the .local name for host sign-in on a phone — Supabase won't redirect to a raw 192.168.x.x address.)
  allowedDevOrigins: ["*.local", "192.168.*.*"],
};

export default nextConfig;
