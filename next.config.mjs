/** @type {import('next').NextConfig} */

const nextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static",
  ],

  experimental: {
    outputFileTracingIncludes: {
      "/api/video/finalize": [
        "./node_modules/ffmpeg-static/**/*",
      ],
    },
  },
};

export default nextConfig;