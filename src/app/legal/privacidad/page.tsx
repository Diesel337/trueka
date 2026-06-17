import Link from "next/link";

import { appName, supportEmail } from "@/lib/app-config";

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-white">
      <section className="border-b border-stone-200 bg-[#fbfaf7]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase text-emerald-800">Privacidad</p>
          <h1 className="mt-2 text-4xl font-semibold text-stone-950">Política de privacidad</h1>
          <p className="mt-4 text-stone-600">
            Última actualización: junio de 2026. Este documento es una base operativa para el MVP de {appName}.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-7 px-4 py-10 leading-7 text-stone-700 sm:px-6 lg:px-8">
        <Block title="Qué es Trueka">
          <p>
            {appName} es una app para publicar artículos y proponer intercambios de artículo por artículo.
            No es una plataforma de compra/venta, no maneja pagos, no guarda datos bancarios y no gestiona
            envíos ni entregas.
          </p>
        </Block>

        <Block title="Datos que podemos usar">
          <ul className="list-disc space-y-2 pl-5">
            <li>Datos de cuenta: correo, nombre visible, foto de perfil y proveedor de inicio de sesión.</li>
            <li>Datos de perfil: ciudad, estado, bio corta y señales de verificación.</li>
            <li>Publicaciones: título, descripción, fotos, estado del artículo, ubicación aproximada y preferencias públicas.</li>
            <li>Interacciones: solicitudes, contraofertas, mensajes, reportes, bloqueos, guardados, vistas únicas y calificaciones.</li>
            <li>Intereses privados: etiquetas que ayudan al matching y no se muestran públicamente completas.</li>
          </ul>
        </Block>

        <Block title="Para qué usamos los datos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Crear y proteger tu cuenta.</li>
            <li>Mostrar publicaciones activas y perfiles públicos.</li>
            <li>Permitir solicitudes de trueque, contraofertas y chat entre participantes.</li>
            <li>Ordenar matches y avisarte cuando aparezca algo de tu interés.</li>
            <li>Prevenir abuso, revisar reportes, aplicar bloqueos y moderar artículos prohibidos.</li>
          </ul>
        </Block>

        <Block title="Datos públicos y privados">
          <p>
            Tu nombre visible, foto de perfil, ciudad, estado, bio, calificaciones y artículos activos pueden
            aparecer en Trueka. Tus etiquetas privadas de interés se usan para matching y no se publican como
            lista completa en perfiles o publicaciones públicas.
          </p>
        </Block>

        <Block title="Proveedores externos">
          <p>
            Podemos usar Supabase para autenticación, base de datos y almacenamiento de fotos. Si inicias sesión
            con Google o Facebook, esos proveedores comparten con Trueka los datos básicos necesarios para crear
            o acceder a tu cuenta, como nombre, correo e imagen de perfil si están disponibles.
          </p>
        </Block>

        <Block title="Conservación y eliminación">
          <p>
            Conservamos datos mientras la cuenta esté activa o mientras sean necesarios para seguridad,
            moderación y cumplimiento operativo. Puedes pedir eliminación de datos desde la página de{" "}
            <Link href="/legal/eliminacion-datos" className="font-semibold text-emerald-800 hover:text-emerald-950">
              eliminación de datos
            </Link>.
          </p>
        </Block>

        <Block title="Contacto">
          <p>
            Para dudas de privacidad, escribe a{" "}
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
