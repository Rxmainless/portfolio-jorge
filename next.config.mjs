/** @type {import('next').NextConfig} */
const nextConfig = {
  // Site estático (pasta out/), publicado no Cloudflare Pages
  output: 'export',
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
