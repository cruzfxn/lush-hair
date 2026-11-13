/** Owner-editable storefront content and theme. Keep image paths local under /public where possible. */
export const siteConfig = {
  brand: {
    name: 'Zitachi Luxury Hair',
    wordmark: 'ZITACHI',
    descriptor: 'LUXURY HAIR',
    tagline: 'Beauty Beyond Ordinary',
    /** Full black-background logo, intended for dark surfaces only. */
    logoImage: '/brand/zit.jpeg',
    /** Optional transparent logo for future use on light surfaces. */
    transparentLogoImage: '',
    favicon: '/brand/favicon.png',
    openGraphImage: '/brand/open-graph.png',
  },
  announcement: 'Discover the beauty of Zitachi Luxury Hair · Beauty Beyond Ordinary',
  colors: {
    black: '#0A0A0A',
    ivory: '#FAF9F6',
    gold: '#C8A048',
    bronze: '#73551F',
  },
  heroSecondsPerSlide: 6.5,
  heroSlides: [
    { id: 'signature', eyebrow: 'ZITACHI LUXURY HAIR', headline: 'Your texture.\nYour signature.', text: 'Considered hair, selected for the way you move.', primaryLabel: 'Shop the collection', primaryHref: '#curated', secondaryLabel: 'Our story', secondaryHref: '#story', videoPath: '/videos/hero-1.mp4', posterPath: '/videos/hero-1-poster.jpg' },
    { id: 'finishing-touch', eyebrow: 'BEAUTY BEYOND ORDINARY', headline: 'Made to feel\nlike your own.', text: 'Explore the details that make every look personal.', primaryLabel: 'Find your style', primaryHref: '#categories', secondaryLabel: '', secondaryHref: '', videoPath: '/videos/hero-2.mp4', posterPath: '/videos/hero-2-poster.jpg' },
    { id: 'everyday', eyebrow: 'ZITACHI LUXURY HAIR', headline: 'A little more\nyou, every day.', text: 'Beautifully considered pieces, ready for your next chapter.', primaryLabel: 'Discover more', primaryHref: '#curated', secondaryLabel: '', secondaryHref: '', videoPath: '/videos/hero-3.mp4', posterPath: '/videos/hero-3-poster.jpg' },
  ],
  story: { eyebrow: 'THE ZITACHI STORY', title: 'Beautiful hair is personal.', text: 'At Zitachi Luxury Hair, we believe the right hair is an expression of you. Discover thoughtfully selected styles made to help you feel unmistakably yourself.', image: '', imageAlt: 'Zitachi Luxury Hair studio' },
  newsletter: { title: 'A note from us.', text: 'New arrivals and studio notes, occasionally.', placeholder: 'Your email address', button: 'Join the list' },
  links: { wholesale: '#trade', instagram: '#', delivery: '#', returns: '#', care: '#care', privacy: '#', terms: '#' },
  whatsappNumber: '',
  footerNote: 'Beauty Beyond Ordinary.',
};
