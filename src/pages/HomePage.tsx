import EditorsPickCarousel from "../components/premium/EditorsPickCarousel";
import JsonLd from "../components/seo/JsonLd";
import MetaTags from "../components/seo/MetaTags";
import SafeScrollReveal from "../components/SafeScrollReveal";
import { useLanguage } from "../contexts/LanguageContext";
import CategoriesSection from "./home/CategoriesSection";
import CtaBanner from "./home/CtaBanner";
import DistrictsSection from "./home/DistrictsSection";
import FeaturedBusinesses from "./home/FeaturedBusinesses";
import HeroSection from "./home/HeroSection";
import StatsStrip from "./home/StatsStrip";
import UsefulServices from "./home/UsefulServices";

export default function HomePage() {
  const { lang } = useLanguage();

  return (
    <>
      <MetaTags
        title="My Andijan — Andijon viloyatidagi bizneslar"
        description="Andijon viloyatidagi restoran, shifoxona, do'kon va xizmatlarni bir joyda toping."
      />
      <JsonLd type="WebSite" data={{ name: "My Andijan", url: `/${lang}`, searchPath: `/${lang}/search` }} />

      {/* The hero animates on mount rather than on scroll — it is already in view. */}
      <HeroSection />

      <SafeScrollReveal label="stats">
        <StatsStrip />
      </SafeScrollReveal>
      <SafeScrollReveal label="districts">
        <DistrictsSection />
      </SafeScrollReveal>
      <SafeScrollReveal label="categories">
        <CategoriesSection />
      </SafeScrollReveal>
      <SafeScrollReveal label="editors-pick">
        <EditorsPickCarousel />
      </SafeScrollReveal>
      <SafeScrollReveal label="featured">
        <FeaturedBusinesses />
      </SafeScrollReveal>
      <SafeScrollReveal label="useful-services">
        <UsefulServices />
      </SafeScrollReveal>
      <SafeScrollReveal label="cta">
        <CtaBanner />
      </SafeScrollReveal>
    </>
  );
}
