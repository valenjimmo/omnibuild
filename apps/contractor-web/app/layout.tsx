import type { Metadata } from "next";
import Link from "next/link";
import { contractorName, portalHref } from "../lib/site";
import "./globals.css";
import "./reference.css";

export const metadata: Metadata = {
  title: `${contractorName} | Thoughtful spaces, built for living`,
  description: "Bay Area ADUs and residential remodels, designed around the way you live.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const portal = portalHref();
  return <html lang="en"><body>
    <header className="site-header"><div className="wrap nav">
      <Link className="brand" href="/" aria-label={`${contractorName} home`}><span className="brand-mark">W<span>.</span></span><span className="brand-name">WESTWOOD <small>ADU + REMODEL</small></span></Link>
      <nav aria-label="Main navigation"><Link href="/#about">About</Link><Link href="/#services">Services</Link><Link href="/projects">Projects</Link><Link href="/#contact">Contact</Link></nav>
      <a className="button button-dark nav-cta" href={portal}>View project status <span aria-hidden="true">↗</span></a>
    </div></header>
    {children}
    <footer className="footer"><div className="wrap footer-grid"><div><Link className="footer-brand" href="/">WESTWOOD <span>ADU</span></Link><p>Spaces that make room for what matters.</p></div><div><p>Bay Area, California</p><a href="mailto:hello@westwoodadu.example">hello@westwoodadu.example</a></div><div><Link href="/projects">Our projects</Link><a href={portal}>Client portal ↗</a></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Westwood ADU. Concept website for demonstration.</span><a href={portal}>Project updates powered by OmniBuild ↗</a></div></footer>
  </body></html>;
}
