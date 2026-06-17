export const appName = "Trueka";

export const appDescription =
  "Cambia articulos por articulos. Publica lo que ya no usas, recibe propuestas y acuerda trueques sin pagos ni envios gestionados por la plataforma.";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteUrl = rawSiteUrl.replace(/\/$/, "");

export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@trueka.mx";
