import type { AnimationName } from "./animations.ts";

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
 * - `app`: a sandbox of our own, live, over the whole page (`public/apps`).
 */
export type Slide =
  | { kind: "cover"; title: string; picture: Picture }
  | { kind: "collage"; pictures: Picture[] }
  | { kind: "quote"; text: string; by: string }
  | { kind: "list"; title: string; items: string[]; source?: string; numbered?: boolean }
  | { kind: "principle"; count: string; name: string; says: string; animation: AnimationName }
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
    kind: "list",
    title: "¿Cómo hacemos sistemas sandbox?",
    numbered: true,
    items: [
      "Closure",
      "Locality of rules",
      "Orthogonality",
      "Small alphabet, large language",
      "Encapsulation",
      "Persistence + cheap reversibility",
      "Transparency over black boxes",
    ],
  },
  {
    kind: "principle",
    count: "1 / 7",
    name: "Closure",
    says: "The output of an operation is the same kind of thing as its input, so results feed back in as inputs. A placed block is the same type of object as a mined one. In GeoGebra: point → line → intersection → point. This is the single most important property; without it composition terminates after one step.",
    animation: "closure",
  },
  {
    kind: "principle",
    count: "2 / 7",
    name: "Locality of rules",
    says: "Each element's behavior depends only on its immediate neighbors. This is what makes composition predictable — you can reason about a piece in isolation and trust that reasoning when you plug it in. Redstone is essentially a cellular automaton, which is exactly why it's both learnable and Turing-complete.",
    animation: "locality",
  },
  {
    kind: "principle",
    count: "3 / 7",
    name: "Orthogonality",
    says: "Components do genuinely different things with minimal overlap, so combinations are meaningful rather than redundant. Soren Johnson's “orthogonal unit differentiation” is the game-design name for this; the design failure mode is 40 units that are all 20% different from each other.",
    animation: "orthogonality",
  },
  {
    kind: "principle",
    count: "4 / 7",
    name: "Small alphabet, large language",
    says: "Redstone has roughly ten components. Chess has six pieces. Juul's framing is that emergence is the primordial game structure: a small number of rules combining to yield large numbers of variations, which players then design strategies for.",
    animation: "alphabet",
  },
  {
    kind: "principle",
    count: "5 / 7",
    name: "Encapsulation",
    says: "You can name a composite and reuse it as an atom — Factorio blueprints, Scratch custom blocks, GeoGebra custom tools, copy-pasted redstone contraptions. This is the mechanism that produces a high ceiling. Without it, complexity growth is linear in player effort rather than exponential.",
    animation: "encapsulation",
  },
  {
    kind: "principle",
    count: "6 / 7",
    name: "Persistence + cheap reversibility",
    says: "The world remembers what you built (so constructions accumulate), and undo is free (so experimentation is unpunished). Creative mode is a serious design artifact, not a cheat.",
    animation: "undo",
  },
  {
    kind: "principle",
    count: "7 / 7",
    name: "Transparency over black boxes",
    says: "You can see the mechanism. Resnick, Berg & Eisenberg wrote “Beyond Black Boxes” on exactly this tension, and “Choose Black Boxes Carefully” is one of the ten principles in Resnick & Silverman's construction-kit paper — some opacity is necessary, but every opaque piece is a place where composition stops.",
    animation: "blackbox",
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
];
