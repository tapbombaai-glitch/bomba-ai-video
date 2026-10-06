/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "fluent-ffmpeg",
      "ffmpeg-static",
    ],

    outputFileTracingIncludes: {
      "/api/video/finalize": [
        "./node_modules/ffmpeg-static/ffmpeg",
      ],
    },
  },
};

export default nextConfig;