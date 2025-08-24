/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase timeout for serverless functions
  serverRuntimeConfig: {
    apiTimeout: 120, // 120 seconds
  },
  // Configure experimental features for better timeout handling
  experimental: {
    // Increase default timeout for API routes to match maxDuration in route
    proxyTimeout: 600000, // 600 seconds (10 minutes) in milliseconds
  },
}

export default nextConfig