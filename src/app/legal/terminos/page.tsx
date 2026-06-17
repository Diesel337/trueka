import Link from "next/link";

import { appName, supportEmail } from "@/lib/app-config";

export default function TermsPage() {
  return (
    <main className="flex-1 bg-white">
      <section className="border-b border-stone-200 bg-[#fbfaf7]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase text-emerald-800">Términos</p>
          <h1 className="mt-2 text-4xl font-semibold text-stone-950">Términos de uso</h1>
          <p className="mt-4 text-stone-600">
            Última actualización: junio de 2026. Estos términos describen el uso esperado del MVP de {appName}.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-7 px-4 py-10 leading-7 text-stone-700 sm:px-6 lg:px-8">
        <Block title="Uso de la plataforma">
          <p>
            {appName} permite publicar artículos y proponer trueques ofreciendo uno o varios artículos propios
            por un artículo publicado por otra persona. Las personas usuarias son responsables de describir
            con claridad el estado real de sus artículos.
          </p>
        </Block>

        <Block title="Regla central">
          <ul className="list-disc space-y-2 pl-5">
            <li>No se permiten pagos entre usuarios dentro de solicitudes de trueque.</li>
            <li>No se permite dinero más artículo como propuesta.</li>
            <li>{appName} no gestiona envíos, paquetería, entregas, custodia ni puntos de intercambio.</li>
            <li>Aceptar una solicitud abre negociación; no significa que el trueque ya se realizó.</li>
            <li>Un trueque cuenta como completado solo cuando ambas personas confirman que sí se hizo.</li>
          </ul>
        </Block>

        <Block title="Publicaciones y artículos prohibidos">
          <p>
            No se deben publicar artículos ilegales, robados, peligrosos, falsificados, de venta restringida
            o que requieran moderación especial. {appName} puede ocultar publicaciones, pausar cuentas o revisar
            reportes cuando detecte riesgo o incumplimiento.
          </p>
        </Block>

        <Block title="Solicitudes, chat y acuerdos">
          <p>
            Las solicitudes se hacen con artículos propios. No puedes solicitar un artículo propio ni ofrecer
            artículos ajenos. El chat sirve para acordar detalles entre participantes, siempre respetando que
            {appName} no media entregas ni maneja pagos.
          </p>
        </Block>

        <Block title="Confianza y reportes">
          <p>
            Las calificaciones y reseñas ayudan a construir reputación. Los reportes se usan para revisar
            posibles abusos, acoso, información falsa, artículos prohibidos o conductas sospechosas.
          </p>
        </Block>

        <Block title="Bloqueos y seguridad">
          <p>
            Si bloqueas a una persona, la plataforma debe impedir nuevas interacciones entre ambas cuentas.
            {appName} puede restringir cuentas que incumplan reglas o pongan en riesgo a otras personas.
          </p>
        </Block>

        <Block title="Privacidad">
          <p>
            El uso de datos se describe en la{" "}
            <Link href="/legal/privacidad" className="font-semibold text-emerald-800 hover:text-emerald-950">
              Política de privacidad
            </Link>. Las etiquetas privadas se usan para matching y no deben exponerse como lista pública completa.
          </p>
        </Block>

        <Block title="Contacto">
          <p>
            Para dudas sobre estos términos, escribe a{" "}
            <a className="font-semibold text-emerald-800 hover:text-emerald-950" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>.
          </p>
        </Block>
      </section>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
