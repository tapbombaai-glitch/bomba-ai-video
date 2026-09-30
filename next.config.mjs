/** @type {import('next').NextConfig} */

const nextConfig = {
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static"
  ]
};

export default nextConfig;