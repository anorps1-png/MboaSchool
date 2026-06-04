import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-8 rounded overflow-hidden shadow">
              <div className="bg-emerald-600 w-1/3 h-full"></div>
              <div className="bg-red-600 w-1/3 h-full flex items-center justify-center relative">
                <span className="text-[6px] text-yellow-400">★</span>
              </div>
              <div className="bg-yellow-400 w-1/3 h-full"></div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">MboaSchool</span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <a href="#solution" className="text-slate-600 hover:text-indigo-600 font-medium">Solution</a>
            <a href="#fonctionnalites" className="text-slate-600 hover:text-indigo-600 font-medium">Fonctionnalités</a>
            <a href="#tarifs" className="text-slate-600 hover:text-indigo-600 font-medium">Tarifs</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-indigo-600 font-medium hover:text-indigo-700 hidden sm:block">
              Se connecter
            </Link>
            <Link href="#contact" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              Démo Gratuite
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
