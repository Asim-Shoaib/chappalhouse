/**
 * Anti-flash for the page intros (PdpMotion, InfoMotion). Render it before the
 * heading it guards: the parser runs it before that heading paints and adds
 * html.paper-wait, which holds [data-enter] elements and the page's branch and
 * tape hidden until the motion component writes their start states and
 * removes the class. React does not run scripts it renders on client
 * navigation, so the motion components add the class themselves in a layout
 * effect (also before paint). No JS: the class never exists. A bundle that
 * never arrives: CSS reveals everything after 2s (styles/paper-pages.css).
 */
const PAPER_WAIT =
  "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('paper-wait')}catch(e){}"

export function PaperWait() {
  return <script dangerouslySetInnerHTML={{ __html: PAPER_WAIT }} />
}
