/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',  // This is the key part for static export
  images: {
    unoptimized: true,  // Disable image optimization for static export
  },
};

export default nextConfig;
