const canonical = 'https://markmathew.com/experiments/the-counter/'
const title = 'The Counter: After the Shift — Mark Mathew'
const description = 'Step behind the counter at Morrow in an original interactive narrative by Mark Mathew.'
const image = canonical + 'art/restaurant.webp'
const imageAlt = 'Warm amber dining room and open kitchen at Morrow.'

// Keep public metadata at the portfolio route while the game ships its own entry page.
export function counterEntry(source) {
  const metadata = [
    `    <meta name="description" content="${description}">`,
    `    <title>${title}</title>`,
    `    <link rel="canonical" href="${canonical}">`,
    '    <meta property="og:type" content="website">',
    '    <meta property="og:site_name" content="Mark Mathew">',
    `    <meta property="og:url" content="${canonical}">`,
    `    <meta property="og:title" content="${title}">`,
    `    <meta property="og:description" content="${description}">`,
    `    <meta property="og:image" content="${image}">`,
    `    <meta property="og:image:alt" content="${imageAlt}">`,
    '    <meta name="twitter:card" content="summary_large_image">',
    `    <meta name="twitter:title" content="${title}">`,
    `    <meta name="twitter:description" content="${description}">`,
    `    <meta name="twitter:image" content="${image}">`,
    `    <meta name="twitter:image:alt" content="${imageAlt}">`,
  ].join('\n')
  const head = /^[ \t]*<meta name="description"[^>]*>\r?\n[ \t]*<title>[^<]+<\/title>/m
  if (!head.test(source)) throw new Error('The Counter entry is missing its expected description and title.')
  return source.replace(head, metadata)
}
