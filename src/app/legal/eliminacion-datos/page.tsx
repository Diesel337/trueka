import Link from "next/link";

import { appName, supportEmail } from "@/lib/app-config";

export default function DataDeletionPage() {
  return (
    <main className="flex-1 bg-white">
      <section className="border-b border-stone-200 bg-[#fbfaf7]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase text-emerald-800">Datos personales</p>
          <h1 className="mt-2 text-4xl font-semibold text-stone-950">Eliminación de datos</h1>
          <p className="mt-4 text-stone-600">
            Instrucciones para solicitar la eliminación de datos asociados a una cuenta de {appName}.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-7 px-4 py-10 leading-7 text-stone-700 sm:px-6 lg:px-8">
        <Block title="Cómo solicitar eliminación">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Envía un correo a{" "}
              <a className="font-semibold text-emerald-800 hover:text-emerald-950" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>{" "}
              con el asunto “Eliminar datos de Trueka”.
            </li>
            <li>Incluye el correo con el que inicias sesión y, si aplica, el proveedor usado: Google, Facebook o correo.</li>
            <li>Si tienes publicaciones o solicitudes abiertas, indica si quieres pausar publicaciones antes de eliminar la cuenta.</li>
            <li>Recibirás confirmación cuando la solicitud sea revisada y procesada.</li>
          </ol>
        </Block>

        <Block title="Qué datos se eliminan o desactivan">
          <ul className="list-disc space-y-2 pl-5">
            <li>Perfil visible, foto de perfil, bio y datos de ubicación de la cuenta.</li>
            <li>Intereses privados usados para matching.</li>
            <li>Publicaciones activas o pausadas, junto con sus fotos, cuando sea técnicamente posible.</li>
            <li>Guardados y preferencias asociadas a la cuenta.</li>
          </ul>
        </Block>

        <Block title="Datos que podrían conservarse temporalmente">
          <p>
            Algunos datos pueden conservarse por un periodo limitado si son necesarios para seguridad,
            auditoría de reportes, prevención de abuso, resolución de disputas o cumplimiento operativo.
            Por ejemplo: reportes, bloqueos, registros mínimos de moderación o información ligada a trueques ya confirmados.
          </p>
        </Block>

        <Block title="Cuentas con Google o Facebook">
          <p>
            Si usaste Google o Facebook para iniciar sesión, también puedes administrar el acceso desde la
            configuración de esa cuenta. Revocar el acceso del proveedor no siempre elimina automáticamente
            los datos guardados en {appName}; para eso usa el proceso descrito arriba.
          </p>
        </Block>

        <Block title="Más información">
          <p>
            Consulta también la{" "}
            <Link href="/legal/privacidad" className="font-semibold text-emerald-800 hover:text-emerald-950">
              Política de privacidad
            </Link>{" "}
            y los{" "}
            <Link href="/legal/terminos" className="font-semibold text-emerald-800 hover:text-emerald-950">
              Términos de uso
            </Link>.
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
