import { ShieldCheck, Cpu, Wifi, Wrench as Tool, Wrench, CheckCircle } from "lucide-react";
import Image from "next/image";
import CheckoutButton from "@/components/CheckoutButton";

export default function Home() {
  const WHATSAPP_LINK = "https://wa.me/17868164874?text=Hi%20Jesus,%20I%20want%20to%20buy%20the%20EAATA%2090%20Scanner%20for%20$1600";

  return (
    <main className="min-h-screen bg-brand-dark text-gray-100 font-sans selection:bg-brand-cyan selection:text-brand-dark">
      {/* Navbar */}
      <nav className="fixed w-full z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-white">
              EAATA<span className="text-brand-cyan">90</span>
            </span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">FEATURES</a>
            <a href="#specs" className="hover:text-white transition-colors">SPECS</a>
            <a href="#support" className="hover:text-white transition-colors">VIP SUPPORT</a>
          </div>
          <div className="flex items-center gap-3">
            <CheckoutButton
              className="hidden sm:inline-block btn-glow bg-green-500 text-white px-5 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            />
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              className="btn-glow bg-brand-cyan text-brand-dark px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            >
              ORDER NOW
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cyan/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan text-sm font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
              </span>
              Official US Distributor
            </div>

            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              Stop Guessing. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                Start Diagnosing.
              </span>
            </h1>

            The EAATA 90 Advanced Diagnostic Machine. Full bidirectional control, exact ADAS calibration, and remote VCI programming.

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <CheckoutButton
                className="btn-glow bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:bg-green-600"
              />
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                className="bg-white/10 text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-white/20 transition-all border border-white/20"
              >
                Ask on WhatsApp
              </a>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-400 px-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                Free US Shipping
              </div>
            </div>
          </div>

          <div className="relative aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center">
            {/* Pulsing ring around product */}
            <div className="absolute w-[120%] h-[120%] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
            <div className="absolute w-[90%] h-[90%] border border-brand-cyan/20 rounded-full animate-[spin_40s_linear_infinite_reverse]" />

            {/* The Product Image */}
            <div className="glass-panel w-full max-w-md aspect-[4/3] rounded-2xl flex items-center justify-center p-8 relative z-10 shadow-2xl border-white/10">
              <div className="text-center">
                <Image
                  src="/eaata90-3.jpeg"
                  alt="EAATA 90 Scanner"
                  width={400}
                  height={300}
                  className="rounded-xl shadow-2xl mb-6 mx-auto border border-white/10"
                />
                <h3 className="text-2xl font-bold mb-2">EAATA 90 Tablet</h3>
                <p className="text-brand-cyan font-medium">9&quot; HD Display • 128GB Storage</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offers & Specs Section (User Requested Text) */}
      <section className="py-24 bg-brand-dark border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">

            {/* Promo & Functions */}
            <div>
              <div className="inline-block bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-full font-bold mb-4">
                🎁 ¡Incluye 3 AÑOS DE ACTUALIZACIONES GRATUITAS!
              </div><br />
              <div className="inline-block bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 px-4 py-2 rounded-full font-bold mb-8">
                💎 ¡Disfruta de 3 meses de soporte gratuito TSS PREMIUM!
              </div>

              <h2 className="text-3xl font-bold mb-6">Diagnóstico de nivel OEM para todos los sistemas</h2>

              <div className="grid sm:grid-cols-2 gap-4 text-gray-300">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Leer/borrar códigos de falla</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Flujo de datos y Pruebas activas</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Funciones especiales avanzadas</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Codificación y programacion</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Diagnóstico remoto (VCI)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Diagnóstico de topología de red</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Clonación de ECU x TCM</li>
                </ul>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Cobertura de +120 marcas</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Interfaz J2534 PassThru</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Escaneo automático de VIN</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Línea Otto/Diesel (LIGERA)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-cyan shrink-0" /> Protocolos: CAN / CANFD / DOiP</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-500 shrink-0" /> Calibración ADAS (Licencia extra)</li>
                </ul>
              </div>
            </div>

            {/* Hardware Specs */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Cpu className="text-brand-cyan" />
                Hardware EAATA 90
              </h3>
              <ul className="space-y-4 text-gray-400">
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span>Pantalla</span> <strong className="text-white text-right">Tableta de 9&quot; (1280 x 800)</strong>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span>Sistema</span> <strong className="text-white">Android 10</strong>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2 gap-4">
                  <span>CPU</span> <strong className="text-white text-right">MTK MT8766 4 núcleos 2GHz</strong>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span>Memoria</span> <strong className="text-white">4 GB RAM / 128 GB ROM</strong>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span>Batería</span> <strong className="text-white text-right">12600 mAh - 3,7 V</strong>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2 gap-4">
                  <span>Conexión</span> <strong className="text-white text-right">Bluetooth 5.0 / Wi-Fi ac/a/b/g/n</strong>
                </li>
                <li className="flex justify-between">
                  <span>Cámara</span> <strong className="text-white">8 MP</strong>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-brand-gray/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Professional Level Power</h2>
            <p className="text-xl text-gray-400">Everything a modern shop needs, packed into one 9&quot; device.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Cpu, title: "Bidirectional Control", desc: "Command components instantly. Test solenoides, ABS pumps, and actuators without guessing." },
              { icon: Tool, title: "Module Programming", desc: "Code and program ECUs, PCMs, and VCIs safely with OE-level access." },
              { icon: Wifi, title: "Remote Diagnostics", desc: "Built-in VCI interface connects you directly to our expert engineers for complex jobs." }
            ].map((feature, i) => (
              <div key={i} className="glass-panel p-8 rounded-2xl border border-white/5 hover:border-brand-cyan/50 transition-colors group">
                <div className="w-12 h-12 bg-brand-cyan/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-brand-cyan" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Support Differentiator */}
      <section id="support" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-3xl p-8 lg:p-16 border border-brand-cyan/20 relative overflow-hidden">
            {/* Background noise/pattern for the premium feel */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                  Don&apos;t just buy a tool.<br />Buy <span className="text-brand-cyan">the team.</span>
                </h2>
                <p className="text-lg text-gray-400 mb-8">
                  Most retailers just ship the box. When you buy from <strong>Jesus Teran</strong>, you gain access to our TSS PREMIUM Support for the hardest jobs, including <strong>Advanced Module Programming</strong> and <strong>All Keys Lost</strong> situations.
                </p>
                <ul className="space-y-4 mb-8">
                  {['Odis', 'Techline', 'WiTech 2', 'FJDS', 'FDRS', 'Mercedes Benz (Xentry)'].map(sw => (
                    <li key={sw} className="flex items-center gap-3 text-gray-300 font-medium">
                      <CheckCircle className="w-5 h-5 text-brand-cyan" />
                      Direct access to OE software: <span className="text-white">{sw}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-black/50 p-8 rounded-2xl border border-white/10">
                <div className="mb-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-brand-cyan/20 flex items-center justify-center border border-brand-cyan/50">
                    <Wrench className="w-8 h-8 text-brand-cyan" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Jesus Teran</h3>
                    <p className="text-brand-cyan text-sm uppercase tracking-wide">Electronic Engineer</p>
                  </div>
                </div>
                <p className="text-gray-400 italic mb-6">&quot;If you&apos;re stuck on a module programming or lost keys situation, our remote team will connect through the EAATA 90 VCI and finish the programming for you.&quot;</p>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  className="block w-full text-center bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Contact For Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-gray-500">
        <div className="text-2xl font-black tracking-tighter text-white mb-4">
          EAATA<span className="text-brand-cyan">90</span> USA
        </div>
        <p>Official US Distributor. Shipped from Miami, FL.</p>
        <p className="mt-2 text-sm">© {new Date().getFullYear()} All rights reserved. Not affiliated with VAG or FCA.</p>
      </footer>
    </main>
  );
}
