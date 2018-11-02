module.exports = {
  getHeaders: async (req, settings) => {
    return [
      { name: 'Cache-Control', value: 'max-age=300' },
      { name: 'X-Content-Type-Options', value: 'nosniff' },
      { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { name: 'X-XSS-Protection', value: '1; mode=block' },
      { name: 'X-Frame-Options', value: 'DENY' },
      {
        name: 'Strict-Transport-Security',
        value: 'max-age=31557600;includeSubdomains;preload',
      },
      {
        name: 'Content-Security-Policy',
        value:
          "default-src 'none'; font-src 'self'; img-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; block-all-mixed-content;",
      },
      {
        name: 'Feature-Policy',
        value:
          "autoplay: 'none'; camera 'none'; geolocation: 'none'; microphone 'none'; midi 'none'; payment 'none'",
      },
      { name: 'Expect-CT', value: 'enforce, max-age=30' },
    ]
  },
}
