 /** @type {import('next').NextConfig} */

const nextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static"
  ],

  outputFileTracingIncludes: {
    "/api/video/finalize": [
      "./node_modules/ffmpeg-static/ffmpeg"
    ]
  }
};

export default nextConfig;