const html_headers = new Headers({
  'Cache-Control': 'max-age=300',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31557600;includeSubdomains;preload',
  'Content-Security-Policy':
    "default-src 'none'; font-src 'self'; img-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; block-all-mixed-content;",
  'Feature-Policy':
    "autoplay: 'none'; camera 'none'; geolocation: 'none'; microphone 'none'; midi 'none'; payment 'none'",
  'Expect-CT': 'enforce, max-age=30',
})

module.exports = {
  getHtmlHeaders: async (req, settings) => {
    return html_headers
  },
}
