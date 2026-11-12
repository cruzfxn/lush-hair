'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { formatNairaFromKobo, Product, ProductType } from '../../lib/api';
import { siteConfig } from '../../site-config';

const productTypes: Array<{ value: ProductType; label: string; description: string }> = [
  { value: 'wig', label: 'Wigs', description: 'An effortless finish, ready when you are.' },
  { value: 'bundle', label: 'Bundles', description: 'The foundation for your next look.' },
  { value: 'closure', label: 'Closures', description: 'A seamless detail, beautifully done.' },
  { value: 'frontal', label: 'Frontals', description: 'More ways to make it your own.' },
  { value: 'accessory', label: 'Accessories', description: 'Thoughtful finishing touches.' },
];

function specLine(product: Product) {
  const attributes = Object.entries(product.attributes || {}).filter(([, value]) => typeof value === 'string' || typeof value === 'number').slice(0, 2).map(([key, value]) => `${key}: ${value}`);
  return [product.texture || product.origin, ...attributes].filter(Boolean).join(' · ') || 'Hand finished';
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const prices = product.variants.filter((variant) => variant.isActive).map((variant) => variant.price);
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return <Link className="product-card" href={`/products/${product.id}`}>
    <div className={`product-image product-image-tone-${index % 4}`}>
      {image ? <Image src={image.url} alt={image.altText || `${product.name} ${product.type}`} fill sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 22vw" unoptimized /> : <div className="image-placeholder"><span>{product.name}<small>Image placeholder</small></span></div>}
      <span className="product-type-tag">{product.type}</span><span className="product-card-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
    </div>
    <div className="product-card-copy"><div><p className="product-category">{product.type}</p><h3>{product.name}</h3><p>{specLine(product)}</p></div><span className="product-price">{fromPrice === null ? 'Unavailable' : `from ${formatNairaFromKobo(fromPrice)}`}</span></div>
  </Link>;
}

export function Storefront({ products, loadError }: { products: Product[]; loadError?: string }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedType, setSelectedType] = useState<ProductType | 'all'>('all');
  const heroRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [videoAllowed, setVideoAllowed] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState<boolean[]>([false, false, false]);
  const [playingSlides, setPlayingSlides] = useState<boolean[]>([false, false, false]);
  const activeSlideRef = useRef(activeSlide);
  activeSlideRef.current = activeSlide;
  const playbackAllowedRef = useRef(false);
  playbackAllowedRef.current = videoAllowed && heroVisible && tabVisible;
  const slides = siteConfig.heroSlides;
  const changeSlide = useCallback((nextSlide: number) => {
    const previousSlide = activeSlideRef.current;
    if (previousSlide === nextSlide) return;
    videoRefs.current[previousSlide]?.pause();
    activeSlideRef.current = nextSlide;
    setPlayingSlides((current) => current.map(() => false));
    setActiveSlide(nextSlide);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const timer = window.setInterval(() => changeSlide((activeSlideRef.current + 1) % slides.length), siteConfig.heroSecondsPerSlide * 1000);
    return () => window.clearInterval(timer);
  }, [changeSlide, slides.length]);
  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection;
    const updatePolicy = () => {
      const slowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
      const allowed = !motionPreference.matches && !connection?.saveData && !slowConnection;
      setVideoAllowed(allowed);
      if (!allowed) {
        setLoadedVideos([false, false, false]);
        setPlayingSlides([false, false, false]);
      } else {
        setLoadedVideos((current) => [true, current[1], current[2]]);
      }
    };
    updatePolicy();
    motionPreference.addEventListener('change', updatePolicy);
    connection?.addEventListener?.('change', updatePolicy);
    const intersection = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.05 });
    if (heroRef.current) intersection.observe(heroRef.current);
    const updateVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      motionPreference.removeEventListener('change', updatePolicy);
      connection?.removeEventListener?.('change', updatePolicy);
      intersection.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!videoAllowed) return;
    const deferred = slides.slice(1).filter((slide) => slide.videoPath);
    let cancelled = false;
    const controllers: AbortController[] = [];
    const loadDeferredVideos = () => {
      if (cancelled) return;
      setLoadedVideos([true, ...slides.slice(1).map((slide) => Boolean(slide.videoPath))]);
      for (const item of deferred) {
        // Warm the browser cache after idle; poster rendering never waits for this request.
        const controller = new AbortController();
        controllers.push(controller);
        void fetch(item.videoPath, { cache: 'force-cache', signal: controller.signal }).catch(() => undefined);
      }
    };
    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (handle: number) => void };
    const idleHandle = idleWindow.requestIdleCallback?.(loadDeferredVideos, { timeout: 1800 });
    const fallbackHandle = idleHandle === undefined ? window.setTimeout(loadDeferredVideos, 1200) : undefined;
    return () => {
      cancelled = true;
      controllers.forEach((controller) => controller.abort());
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (fallbackHandle !== undefined) window.clearTimeout(fallbackHandle);
    };
  }, [videoAllowed, slides]);

  useEffect(() => {
    if (videoAllowed && slides[activeSlide]?.videoPath && !loadedVideos[activeSlide]) {
      setLoadedVideos((current) => current.map((loaded, index) => index === activeSlide ? true : loaded));
    }
  }, [activeSlide, loadedVideos, slides, videoAllowed]);

  useEffect(() => {
    if (!videoAllowed || !loadedVideos[activeSlide]) {
      videoRefs.current.forEach((video) => video?.pause());
      setPlayingSlides([false, false, false]);
      return;
    }
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index !== activeSlide || !heroVisible || !tabVisible) {
        video.pause();
        if (index > 0) video.preload = 'none';
        setPlayingSlides((current) => current.map((playing, itemIndex) => itemIndex === index ? false : playing));
      }
    });
    if (!heroVisible || !tabVisible) return;
    const activeVideo = videoRefs.current[activeSlide];
    if (!activeVideo) return;
    if (activeSlide > 0) {
      activeVideo.preload = 'auto';
      activeVideo.load();
    }
    void activeVideo.play().then(() => {
      if (activeSlideRef.current !== activeSlide || !playbackAllowedRef.current) {
        activeVideo.pause();
        return;
      }
      setPlayingSlides((current) => current.map((_, index) => index === activeSlide));
    }).catch(() => {
      // Autoplay can be blocked; leave the poster visible without showing an error.
      setPlayingSlides((current) => current.map((playing, index) => index === activeSlide ? false : playing));
    });
  }, [activeSlide, heroVisible, tabVisible, videoAllowed, loadedVideos]);

  const slide = slides[activeSlide];
  const featured = products.filter((product) => product.isActive).slice(0, 3);
  const activeProducts = products.filter((product) => product.isActive);
  const visibleProducts = selectedType === 'all' ? activeProducts : activeProducts.filter((product) => product.type === selectedType);

  function chooseType(type: ProductType) {
    setSelectedType(type);
    document.getElementById('all-styles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return <main>
    <section className="hero" ref={heroRef} aria-roledescription="carousel" aria-label="Featured collection">
      {slide.posterPath && <Image key={slide.posterPath} className={`hero-media hero-poster${playingSlides[activeSlide] ? ' poster-fade' : ''}`} src={slide.posterPath} alt="" fill priority={activeSlide === 0} sizes="100vw" />}
      {slides.map((item, index) => item.videoPath && <video
        key={item.videoPath}
        ref={(element) => { videoRefs.current[index] = element; }}
        className={`hero-media hero-video${playingSlides[index] ? ' video-visible' : ''}`}
        data-slide-index={index}
        aria-hidden="true"
        tabIndex={-1}
        muted
        loop
        playsInline
        controls={false}
        preload={index === 0 ? 'auto' : 'none'}
        src={videoAllowed && loadedVideos[index] ? item.videoPath : undefined}
      />)}
      <div className="hero-shade" />
      <div className="hero-content" key={activeSlide}>
        <p className="eyebrow">{slide.eyebrow}</p><h1>{slide.headline.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1><p className="hero-copy">{slide.text}</p>
        <div className="hero-actions"><a className="button button-primary" href={slide.primaryHref}>{slide.primaryLabel}<ArrowUpRight size={16} /></a>{slide.secondaryLabel && <a className="button button-ghost" href={slide.secondaryHref}>{slide.secondaryLabel}</a>}</div>
      </div>
      <div className="hero-controls"><div className="hero-dots" role="group" aria-label="Choose featured slide">{slides.map((item, index) => <button type="button" key={item.eyebrow} aria-label={`Show slide ${index + 1}`} aria-current={activeSlide === index} onClick={() => changeSlide(index)} />)}</div><a href="#curated" className="hero-scroll">Scroll to explore <ArrowDown size={14} /></a></div>
    </section>

    <section className="featured-section section-light" id="curated">
      <div className="section-heading"><div><p className="eyebrow">A FEW FAVOURITES · PLACEHOLDER</p><h2>Curated for you</h2></div><Link href="#all-styles" className="text-link">View all styles <ArrowUpRight size={15} /></Link></div>
      {loadError ? <div className="notice-card" role="alert"><h3>The collection is taking a moment.</h3><p>Product details are temporarily unavailable. Please try again shortly.</p></div> : featured.length ? <div className="product-grid featured-grid">{featured.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="notice-card"><h3>Collection preview</h3><p>Product placeholders will appear here when active items are added.</p></div>}
    </section>

    <section className="category-section" id="categories"><div className="section-heading"><div><p className="eyebrow">EXPLORE BY TYPE</p><h2>Find your finish</h2></div></div><div className="category-grid">{productTypes.map((type, index) => <a className={`category-tile category-tile-${index}`} href="#all-styles" key={type.value} onClick={(event) => { event.preventDefault(); chooseType(type.value); }}><span className="category-index">0{index + 1}</span><div><h3>{type.label}</h3><p>{type.description}</p></div><ArrowUpRight size={18} /></a>)}</div></section>

    <section className="all-styles-section section-light" id="all-styles">
      <div className="section-heading"><div><p className="eyebrow">THE FULL COLLECTION</p><h2>All styles</h2></div><span className="all-styles-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'style' : 'styles'}</span></div>
      <div className="type-filters" role="group" aria-label="Filter styles by type">
        <button type="button" className={selectedType === 'all' ? 'type-filter active' : 'type-filter'} aria-pressed={selectedType === 'all'} onClick={() => setSelectedType('all')}>All styles</button>
        {productTypes.map((type) => <button type="button" key={type.value} className={selectedType === type.value ? 'type-filter active' : 'type-filter'} aria-pressed={selectedType === type.value} onClick={() => setSelectedType(type.value)}>{type.label}</button>)}
      </div>
      {loadError ? <div className="notice-card" role="alert"><h3>The collection is taking a moment.</h3><p>Product details are temporarily unavailable. Please try again shortly.</p></div> : visibleProducts.length ? <div className="product-grid all-styles-grid">{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="notice-card"><h3>{selectedType === 'all' ? 'Collection preview' : `No ${productTypes.find((type) => type.value === selectedType)?.label.toLowerCase()} yet`}</h3><p>{selectedType === 'all' ? 'Active product styles will appear here.' : 'Try another type or check back soon.'}</p></div>}
    </section>

    <section className="story-section" id="story"><div className="story-visual">{siteConfig.story.image ? <Image src={siteConfig.story.image} alt={siteConfig.story.imageAlt} fill sizes="(max-width: 700px) 100vw, 50vw" /> : <div className="story-placeholder"><span>STUDIO IMAGE<br />PLACEHOLDER</span></div>}</div><div className="story-copy"><p className="eyebrow">{siteConfig.story.eyebrow}</p><h2>{siteConfig.story.title}</h2><p>{siteConfig.story.text}</p><a className="story-link" href="#story">Discover the story <ArrowUpRight size={16} /></a></div></section>

    <section className="newsletter-section" id="newsletter"><p className="eyebrow">A LITTLE SOMETHING IN YOUR INBOX</p><h2>{siteConfig.newsletter.title}</h2><p>{siteConfig.newsletter.text}</p><form className="newsletter-form" onSubmit={(event) => event.preventDefault()}><label className="sr-only" htmlFor="newsletter-email">{siteConfig.newsletter.placeholder}</label><input id="newsletter-email" type="email" placeholder={siteConfig.newsletter.placeholder} /><button type="submit">{siteConfig.newsletter.button}<ArrowUpRight size={16} /></button></form><small>Newsletter form placeholder · no information is submitted.</small></section>

    <footer className="site-footer"><div className="footer-brand"><span className="footer-wordmark">{siteConfig.brand.name}</span><p>{siteConfig.footerNote}</p></div><div className="footer-column"><h3>Discover</h3><a href="#curated">Shop the collection</a><a href="#story">Our story</a><a href={siteConfig.links.delivery}>Delivery</a><a href={siteConfig.links.returns}>Returns</a></div><div className="footer-column" id="trade"><h3>Trade</h3><a href={siteConfig.links.wholesale}>Wholesale enquiries</a><a href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : '#trade'}>WhatsApp</a><span className="footer-placeholder">Contact details placeholder</span></div><div className="footer-column" id="care"><h3>Care</h3><a href={siteConfig.links.care}>Hair care guide</a><a href={siteConfig.links.privacy}>Privacy</a><a href={siteConfig.links.terms}>Terms</a></div><div className="footer-newsletter"><h3>Stay in the know</h3><p>Studio notes and new arrivals, occasionally.</p><a href="#newsletter">Join our newsletter <ArrowUpRight size={14} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.brand.name} · Placeholder storefront</span><a href="#top">Back to top ↑</a></div></footer>
  </main>;
}
