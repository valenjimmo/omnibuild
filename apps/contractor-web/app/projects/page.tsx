import Link from "next/link";

const projects = [
  { number: "01", type: "BACKYARD ADU", title: "Oakland garden studio", place: "Oakland, CA", className: "project-oakland", description: "A calm, flexible retreat tucked into a leafy backyard." },
  { number: "02", type: "KITCHEN REMODEL", title: "The light-filled kitchen", place: "Berkeley, CA", className: "project-kitchen", description: "A practical family kitchen with warmth in every detail." },
  { number: "03", type: "BATHROOM REMODEL", title: "A quieter morning", place: "San Mateo, CA", className: "project-bath", description: "Natural finishes and a simpler daily ritual." },
];

export default function Projects() {
  return <main><section className="projects-hero"><div className="wrap"><p className="eyebrow">SELECTED WORK</p><h1>Spaces with <em>a story.</em></h1><p>Every home is different. Here are a few of the places we have imagined for Bay Area living.</p></div></section><section className="wrap project-list">{projects.map((project) => <article className="project-row" key={project.number}><div className={`project-image ${project.className}`}><span>{project.number} / 03</span></div><div className="project-info"><p className="eyebrow">{project.type} · {project.place}</p><h2>{project.title}</h2><p>{project.description}</p></div></article>)}</section><section className="projects-end wrap"><h2>Could yours be next?</h2><Link className="button button-dark" href="/#contact">Get in touch <span aria-hidden="true">↗</span></Link></section></main>;
}
