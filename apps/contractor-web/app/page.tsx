import Link from "next/link";
import { portalHref } from "../lib/site";

const services = [
  { number: "01", symbol: "⌂", title: "Detached ADUs", body: "A complete little home in your backyard, designed around your lot and the people who will live there." },
  { number: "02", symbol: "▤", title: "Garage conversions", body: "Turn underused square footage into a comfortable, independent space with a new purpose." },
  { number: "03", symbol: "◫", title: "Attached ADUs", body: "Make room for a new chapter while keeping the connection to the home you already love." },
];
const advantages = [
  { number: "01", title: "One team, start to finish", body: "We bring design, planning, permits, and construction together so the path forward stays clear." },
  { number: "02", title: "Bay Area know-how", body: "Each city and property is different. Local experience helps us plan with those details in mind." },
  { number: "03", title: "Built to feel at home", body: "Good proportions, durable materials, and careful finishing make a small space feel generous." },
];
const steps = [
  { number: "01", title: "Let's talk", body: "We listen to your goals, walk the property, and discuss what is possible." },
  { number: "02", title: "Design a clear plan", body: "Together we shape the layout, details, budget, and permitting path." },
  { number: "03", title: "Build with care", body: "We coordinate the work and keep you informed through the final walkthrough." },
];

export default function Home() {
  return <main>
    <section className="hero"><div className="wrap hero-grid"><div className="hero-copy"><p className="eyebrow">WESTWOOD ADU · BAY AREA DESIGN + BUILD</p><h1>More living space. <em>More possibility.</em></h1><p className="lead">Custom accessory dwelling units that make your home work harder and life feel easier. From the first idea to the final detail, we make room for what comes next.</p><div className="hero-actions"><a className="button button-accent" href={portalHref()}>View project status <span aria-hidden="true">↗</span></a><a className="text-link" href="#services">Explore ADU options <span aria-hidden="true">↓</span></a></div><div className="hero-note"><span className="line"/> Thoughtfully designed for Bay Area living</div></div><div className="hero-art" role="img" aria-label="Illustration of a modern backyard accessory dwelling unit"><div className="sun"/><div className="house"><div className="roof"/><div className="wall"><div className="window"><i/><i/></div><div className="door"/><div className="siding"/></div></div><div className="ground"/><div className="plant plant-one"/><div className="plant plant-two"/><div className="art-label">A NEW WAY TO FEEL AT HOME</div></div></div></section>
    <section className="intro wrap" id="about"><div><p className="eyebrow">THE WESTWOOD STORY</p><h2>Small footprint. <em>Big purpose.</em></h2></div><p>A backyard home can do more than add square footage. It can bring family closer, create a quiet place to work, or open up a new way to live. We design and build ADUs that fit the property and the people behind the project.</p></section>
    <section className="services-section" id="services"><div className="wrap"><div className="section-heading"><div><p className="eyebrow">WHAT WE BUILD</p><h2>ADU options for <em>every home.</em></h2></div><p>From a freestanding retreat to a smart conversion, the right approach begins with your property and your goals.</p></div><div className="services">{services.map((service) => <article key={service.number}><span className="service-num">{service.number}</span><div className="service-icon" aria-hidden="true">{service.symbol}</div><h3>{service.title}</h3><p>{service.body}</p></article>)}</div></div></section>
    <section className="mid-cta"><div className="wrap mid-cta-inner"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Start your ADU story.</h2></div><a className="button button-light" href="mailto:hello@westwoodadu.example?subject=ADU%20project%20inquiry">Get in touch <span aria-hidden="true">↗</span></a></div></section>
    <section className="feature"><div className="wrap feature-grid"><div className="feature-art"><div className="feature-card"><span>FEATURED PROJECT</span><strong>Oakland garden studio</strong><small>Oakland, CA · Concept project</small></div></div><div className="feature-copy"><p className="eyebrow">A LOOK AT THE WORK</p><h2>A little more space. <em>A lot more possibility.</em></h2><p>This light-filled backyard studio imagines a flexible place for work, guests, and the quiet moments in between.</p><Link className="button button-outline" href="/projects">Explore projects <span aria-hidden="true">→</span></Link></div></div></section>
    <section className="advantages wrap"><div className="section-heading"><div><p className="eyebrow">THE WESTWOOD APPROACH</p><h2>Good building starts <em>with trust.</em></h2></div><p>We keep the process personal, practical, and easy to follow, with care for the finished space and the experience of getting there.</p></div><div className="advantages-grid">{advantages.map((item) => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
    <section className="process"><div className="wrap"><div className="section-heading"><div><p className="eyebrow">HOW WE WORK</p><h2>From idea to <em>move-in.</em></h2></div><p>Three straightforward phases keep your project grounded and moving forward.</p></div><div className="process-grid">{steps.map((step) => <article key={step.number}><span>STEP {step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></div></section>
    <section className="contact" id="contact"><div className="wrap contact-grid"><div><p className="eyebrow">LET'S TALK</p><h2>Have a space in mind?</h2><p>Tell us what you are dreaming up. We would love to hear about it.</p></div><a className="button button-light" href="mailto:hello@westwoodadu.example?subject=Project%20inquiry">Start a conversation <span aria-hidden="true">↗</span></a></div></section>
  </main>;
}
