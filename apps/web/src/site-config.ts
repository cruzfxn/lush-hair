/** Owner-editable storefront content and theme. Keep image paths local under /public where possible. */
export const siteConfig = {
  brand: {
    name: 'ByteBridge Hair',
    tagline: 'Luxury hair, finished by hand.',
    /** Set to a local /public path to replace the text wordmark with an image. */
    logoImage: '',
  },
  announcement: 'Complimentary Lagos delivery on orders over ₦250,000 · Placeholder offer',
  colors: {
    black: '#0A0A0A',
    ivory: '#FAF9F6',
    gold: '#C8A96A',
    bronze: '#8A6A2F',
  },
  heroSecondsPerSlide: 6.5,
  heroSlides: [
    { eyebrow: 'BYTEBRIDGE HAIR · PLACEHOLDER', headline: 'Your texture.\nYour signature.', text: 'Considered hair, selected for the way you move.', primaryLabel: 'Shop the collection', primaryHref: '#curated', secondaryLabel: 'Our story', secondaryHref: '#story', videoPath: '/videos/hero-1.mp4', posterPath: '/videos/hero-1-poster.jpg' },
    { eyebrow: 'THE FINISHING TOUCH · PLACEHOLDER', headline: 'Made to feel\nlike your own.', text: 'Explore the details that make every look personal.', primaryLabel: 'Find your style', primaryHref: '#categories', secondaryLabel: '', secondaryHref: '', videoPath: '/videos/hero-2.mp4', posterPath: '/videos/hero-2-poster.jpg' },
    { eyebrow: 'HAND FINISHED · PLACEHOLDER', headline: 'A little more\nyou, every day.', text: 'Beautifully considered pieces, ready for your next chapter.', primaryLabel: 'Discover more', primaryHref: '#curated', secondaryLabel: '', secondaryHref: '', videoPath: '/videos/hero-3.mp4', posterPath: '/videos/hero-3-poster.jpg' },
  ],
  story: { eyebrow: 'A NOTE FROM THE STUDIO · PLACEHOLDER', title: 'Beautiful hair is personal.', text: 'ByteBridge Hair is a placeholder brand story. Replace this copy with the details, craft and people behind your collection.', image: '', imageAlt: 'Placeholder image for the ByteBridge Hair studio story' },
  newsletter: { title: 'A note from us.', text: 'New arrivals and studio notes, occasionally.', placeholder: 'Your email address', button: 'Join the list' },
  links: { wholesale: '#trade', instagram: '#', delivery: '#', returns: '#', care: '#care', privacy: '#', terms: '#' },
  whatsappNumber: '',
  footerNote: 'Luxury hair, finished by hand.',
};
