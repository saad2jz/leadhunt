/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  ...(isGitHubPages && {
    output: 'export',
    basePath: '/leadhunt',
  }),
  images: {
    unoptimized: true,
  },
  typescript: {
    // Ignore build errors for local MVP testing
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
