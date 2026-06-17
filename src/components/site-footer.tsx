import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Trueka: artículos por artículos. Sin pagos ni envíos gestionados.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/legal/privacidad" className="hover:text-emerald-800">
            Privacidad
          </Link>
          <Link href="/legal/terminos" className="hover:text-emerald-800">
            Términos
          </Link>
          <Link href="/legal/eliminacion-datos" className="hover:text-emerald-800">
            Eliminar datos
          </Link>
        </nav>
      </div>
    </footer>
  );
}
