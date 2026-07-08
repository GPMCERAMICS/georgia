import { About } from "@/components/site/about";
import { Commission } from "@/components/site/commission";
import { Gallery } from "@/components/site/gallery";
import { Hero } from "@/components/site/hero";
import { JsonLd } from "@/components/site/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function Home() {
  return (
    <>
      <JsonLd />
      <SiteHeader />
      <main>
        <Hero />
        <Gallery />
        <About />
        <Commission />
      </main>
      <SiteFooter />
    </>
  );
}
