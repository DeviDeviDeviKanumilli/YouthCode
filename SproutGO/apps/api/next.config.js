/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are TS source; let Next transpile them.
  transpilePackages: ["@sproutgo/shared", "@sproutgo/db"],
  experimental: {
    // Prisma engine must not be bundled; @sproutgo/db is transpiled from TS source.
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

module.exports = nextConfig;
