module.exports = {
  getHeaders: (req, settings) => {
    return [
      { name: 'X-Content-Type-Options', value: 'nosniff' },
      { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { name: 'X-XSS-Protection', value: '1; mode=block' },
      { name: 'X-Frame-Options', value: 'DENY' },
      {
        name: 'Strict-Transport-Security',
        value: 'max-age=31557600;includeSubdomains;preload',
      },
      { name: 'Content-Security-Policy', value: "default-src 'self' " },
    ]
  },
}
