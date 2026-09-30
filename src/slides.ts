import type { AnimationName } from "./animations.ts";

/** Somewhere else to go, said in words. */
export type Link = { href: string; text: string };

/** A picture from `public/img`, with what it shows for whoever cannot see it. */
export type Picture = { src: string; alt: string };

/**
 * The kinds of page the talk is made of.
 *
 * - `cover`: the picture over the title, and nothing else.
 * - `collage`: pictures filling the page, to be talked over.
 * - `quote`: one sentence in the middle, and who said it.
 * - `list`: a title and its items, revealed one per → press.
 * - `principle`: one idea, said in a paragraph, beside an animation of it (`animations.ts`).
 * - `example`: a title, what it means, and the pictures that show it.
 * - `gallery`: a title and pictures, one large and the others beside it.
 * - `app`: a sandbox, live, over the whole page: one of ours in `public/apps`, or a site of its own
 *   given by its full address, which also gets a way to open it in a tab of its own.
 */
export type Slide =
  | { kind: "cover"; title: string; picture: Picture }
  | { kind: "collage"; pictures: Picture[] }
  | { kind: "quote"; text: string; by: string }
  | { kind: "list"; title: string; items: string[]; source?: string; numbered?: boolean }
  | { kind: "principle"; count?: string; name: string; says: string; animation: AnimationName; link?: Link }
  | { kind: "example"; title: string; says: string; example: string; pictures: Picture[] }
  | { kind: "gallery"; title: string; pictures: Picture[]; large: Picture }
  | { kind: "app"; src: string; title: string };

const img = (name: string, alt: string): Picture => ({ src: `img/${name}.png`, alt });

export const TITLE = "Sandbox";

export const SLIDES: Slide[] = [
  {
    kind: "cover",
    title: "Sandbox",
    picture: img("arenero", "Dos niños jugando con juguetes en un arenero"),
  },
  {
    kind: "quote",
    text: "Un sandbox es cualquier entorno acotado que ofrezca la libertad para explorar y construir.",
    by: "Alexandra Lange",
  },
  {
    kind: "collage",
    pictures: [
      img("lego", "Manos armando piezas de LEGO"),
      img("papel", "Una hoja en blanco y un lápiz"),
      img("geogebra", "La calculadora de GeoGebra, vacía"),
      img("minecraft-jardin", "Una construcción en Minecraft"),
    ],
  },
  {
    kind: "list",
    title: "Propiedades de los sandbox",
    numbered: true,
    items: [
      "**Open-ended search.** Los usuarios tienen un alto grado de libertad para interactuar creativamente, usualmente sin ningún objetivo predeterminado, o con el objetivo que el propio usuario se ponga.",
      "**Emergencia.** Surgen comportamientos o fenómenos complejos de mecánicas relativamente simples. Muchos de estos comportamientos son cosas que los diseñadores del sandbox no habían pensado.",
      "**Maravilla accidental.** Se descubren fenómenos interesantes accidentalmente, sin haberlos buscado, solamente de la experimentación.",
    ],
  },
  {
    kind: "example",
    title: "Open-ended search",
    says: "Los usuarios tienen un alto grado de libertad para interactuar creativamente, usualmente sin ningún objetivo predeterminado, o con el objetivo que el propio usuario se ponga.",
    example: "Numbers sandbox",
    pictures: [
      img("minecraft-otono", "Un paisaje de otoño construido en Minecraft"),
      img("sims", "Personajes en una plaza en Los Sims"),
    ],
  },
  { kind: "app", src: "apps/turtle.html", title: "Turtle" },
  { kind: "app", src: "apps/sieve.html", title: "Sieve" },
  {
    kind: "example",
    title: "Emergencia",
    says: "Surgen comportamientos o fenómenos interesantes de mecánicas relativamente simples. Muchos de estos comportamientos son cosas que los diseñadores del sandbox no habían pensado.",
    example: "Turtle game, el juego de la vida de Conway, LEGO",
    pictures: [
      img("redstone", "Un reloj digital construido con redstone en Minecraft"),
      img("ti83", "Un juego de plataformas corriendo en una calculadora TI-83 Plus"),
    ],
  },
  { kind: "app", src: "apps/life.html", title: "Life" },
  { kind: "app", src: "apps/wolfram.html", title: "Wolfram" },
  { kind: "app", src: "https://extantword.github.io/interactive-algebra/", title: "Algebra Sandbox" },
  {
    kind: "gallery",
    title: "Maravilla accidental",
    pictures: [
      img("picbreeder-1", "Una figura roja y blanca evolucionada en Picbreeder"),
      img("picbreeder-2", "Un insecto evolucionado en Picbreeder"),
      img("picbreeder-3", "Una mariposa evolucionada en Picbreeder"),
    ],
    large: img("picbreeder-galeria", "La galería de imágenes de Picbreeder"),
  },
  {
    kind: "principle",
    name: "Maravilla accidental",
    says: "En Picbreeder nadie tenía un objetivo: cada quien elegía la imagen que le parecía interesante, la publicaba, y otros continuaban desde ahí. Así aparecieron calaveras, mariposas y autos que nadie había buscado, y los pasos intermedios casi nunca se parecían al resultado. Buscarlos a propósito no funcionaba.",
    animation: "picbreeder",
  },
  {
    kind: "list",
    title: "Some Reflections on Designing Construction Kits for Kids",
    source: "Resnick & Silverman, 2005",
    items: [
      "Design for Designers",
      "Low Floor and Wide Walls",
      "Make Powerful Ideas Salient — Not Forced",
      "Support Many Paths, Many Styles",
      "Make it as Simple as Possible — and Maybe Even Simpler",
      "Choose Black Boxes Carefully",
      "A Little Bit of Programming Goes a Long Way",
      "Give People What They Want — Not What They Ask For",
      "Invent Things That You Would Want to Use Yourself",
      "Iterate, Iterate — then Iterate Again",
    ],
  },
  {
    kind: "principle",
    count: "1 / 10",
    name: "Design for Designers",
    says: "Un buen kit no está hecho para que los niños usen lo que otros diseñaron, sino para que diseñen y construyan lo suyo: quien diseña el kit diseña para diseñadores.",
    animation: "designers",
  },
  {
    kind: "principle",
    count: "2 / 10",
    name: "Low Floor and Wide Walls",
    says: "Debe ser fácil empezar —el suelo bajo— y debe poder llevar a proyectos muy distintos entre sí —las paredes anchas—, no solo a proyectos cada vez más difíciles.",
    animation: "floor",
  },
  {
    kind: "principle",
    count: "3 / 10",
    name: "Make Powerful Ideas Salient — Not Forced",
    says: "Las ideas poderosas, como la retroalimentación, tienen que hacerse visibles mientras se juega, sin imponerlas con una lección.",
    animation: "salient",
  },
  {
    kind: "principle",
    count: "4 / 10",
    name: "Support Many Paths, Many Styles",
    says: "Hay quien planifica de arriba abajo y hay quien juega con las piezas hasta encontrar la forma. Un buen kit sirve a los dos estilos.",
    animation: "paths",
  },
  {
    kind: "principle",
    count: "5 / 10",
    name: "Make it as Simple as Possible — and Maybe Even Simpler",
    says: "Cada función que se añade complica todas las demás. A veces conviene quitar incluso cosas útiles: menos opciones, más claridad.",
    animation: "simple",
  },
  {
    kind: "principle",
    count: "6 / 10",
    name: "Choose Black Boxes Carefully",
    says: "Decidir qué piezas son primitivas decide qué ideas se pueden explorar: si se esconde demasiado no queda nada que aprender; si se muestra todo, no se sabe por dónde empezar.",
    animation: "blackboxes",
  },
  {
    kind: "principle",
    count: "7 / 10",
    name: "A Little Bit of Programming Goes a Long Way",
    says: "No hace falta volverse programador: unas pocas líneas bastan para hacer cosas que a mano serían imposibles.",
    animation: "programming",
  },
  {
    kind: "principle",
    count: "8 / 10",
    name: "Give People What They Want — Not What They Ask For",
    says: "Lo que la gente pide suele ser una solución concreta; lo que necesita puede ser otra cosa. Hay que entender el deseo que hay detrás del pedido.",
    animation: "want",
  },
  {
    kind: "principle",
    count: "9 / 10",
    name: "Invent Things That You Would Want to Use Yourself",
    says: "Si quien diseña usa lo que construye, lo prueba todos los días y ve dónde falla. El primer usuario es uno mismo.",
    animation: "yourself",
    link: { href: "https://extantword.github.io/diff-geo/", text: "Un ejemplo: diff-geo, geometría diferencial interactiva" },
  },
  {
    kind: "principle",
    count: "10 / 10",
    name: "Iterate, Iterate — then Iterate Again",
    says: "Nada sale bien a la primera: se construye, se prueba, se ajusta y se vuelve a empezar, cada vez un poco más cerca.",
    animation: "iterate",
  },
];
