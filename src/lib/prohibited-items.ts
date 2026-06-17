type ProhibitedItemReviewInput = {
  title: string;
  description: string;
  knownDefects: string;
};

const prohibitedReviewTerms: { label: string; patterns: RegExp[] }[] = [
  { label: "armas o municiones", patterns: [/\barma(s)?\b/, /\bpistola(s)?\b/, /\brifle(s)?\b/, /\bmunicion(es)?\b/, /\bbala(s)?\b/] },
  { label: "explosivos", patterns: [/\bexplosivo(s)?\b/, /\bpirotecnia\b/, /\bfuego artificial(es)?\b/] },
  { label: "medicamentos controlados o drogas", patterns: [/\bdroga(s)?\b/, /\bnarcotico(s)?\b/, /\bmedicamento(s)? controlado(s)?\b/, /\breceta medica\b/] },
  { label: "alcohol, tabaco, vapes o nicotina", patterns: [/\balcohol\b/, /\btabaco\b/, /\bvape(s)?\b/, /\bvaper(s)?\b/, /\bnicotina\b/] },
  { label: "animales", patterns: [/\bmascota(s)?\b/, /\bperro(s)?\b/, /\bgato(s)?\b/, /\banimal(es)?\b/] },
  { label: "documentos oficiales", patterns: [/\bine\b/, /\bpasaporte(s)?\b/, /\blicencia(s)?\b/, /\bacta(s)?\b/, /\bdocumento(s)? oficial(es)?\b/] },
  { label: "productos robados", patterns: [/\brobado(s)?\b/, /\bsin papeles\b/, /\bsin factura\b/] },
  { label: "replicas o falsificaciones", patterns: [/\breplica(s)?\b/, /\bfalso(s)?\b/, /\bfalsificado(s)?\b/, /\bclon(es)?\b/] },
  { label: "datos personales de terceros", patterns: [/\bdato(s)? personal(es)?\b/, /\bbase de datos\b/, /\bcuenta(s)? de tercero(s)?\b/] },
];

export function findProhibitedItemReviewReasons(input: ProhibitedItemReviewInput) {
  const text = normalizeForModeration([
    input.title,
    input.description,
    input.knownDefects,
  ].join(" "));

  return prohibitedReviewTerms
    .filter((term) => term.patterns.some((pattern) => pattern.test(text)))
    .map((term) => term.label);
}

export function buildProhibitedItemReviewReason(reasons: string[]) {
  if (reasons.length === 0) {
    return "";
  }

  return `Posible articulo prohibido: ${reasons.join(", ")}.`;
}

function normalizeForModeration(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
}
