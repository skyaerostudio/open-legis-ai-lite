/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'tesseract.js'],
  images: {
    domains: []
  }
}

module.exports = nextConfig