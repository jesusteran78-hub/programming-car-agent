import { useState } from 'react';
import {
  Sparkles,
  Video,
  Link,
  Lightbulb,
  Play,
  Activity,
  Clock,
  Eye,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Terminal,
} from 'lucide-react';

export default function MarketingView() {
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({ title: '', idea: '', image: '' });
  const [logs, setLogs] = useState([
    {
      id: 1,
      type: 'video',
      status: 'ready',
      title: 'Falla Chevy Silverado - Parte 1',
      views: 12500,
      date: 'Hace 2 horas',
    },
    {
      id: 2,
      type: 'video',
      status: 'ready',
      title: 'Llave Perdida BMW',
      views: 8200,
      date: 'Ayer',
    },
  ]);

  const handleGenerate = async () => {
    if (!formData.title) {return alert('Ponle un título al video');}

    setGenerating(true);

    try {
      // 1. Start Job
      const startRes = await fetch('/api/video/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const startData = await startRes.json();

      if (!startData.success) {
        throw new Error(startData.error || 'Failed to start job');
      }

      const jobId = startData.jobId;
      console.log('Job Started:', jobId);

      // 2. Poll for Status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/status/${jobId}`);
          const statusData = await statusRes.json();

          if (!statusData.success) {return;}

          const job = statusData.job;

          if (job.status === 'completed') {
            clearInterval(pollInterval);
            setGenerating(false);

            // Add to logs
            setLogs((prev) => [
              {
                id: Date.now(),
                type: 'video',
                status: 'ready',
                title: formData.title,
                views: 0,
                date: 'Recién horneado',
                script: '✅ Publicado en 5 Plataformas',
              },
              ...prev,
            ]);
            setFormData({ title: '', idea: '', image: '' });
            alert('¡VIDEO LISTO Y PUBLICADO!');
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setGenerating(false);
            alert('Error del motor: ' + job.error);
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 5000);
    } catch (e) {
      console.error(e);
      setGenerating(false);
      alert('Error de conexión con el cerebro');
    }
  };

  return (
    <div className="h-full flex flex-col gap-8 max-w-6xl mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Video className="w-8 h-8 text-purple-600" />
          Viral Video Engine
        </h1>
        <p className="text-slate-500 font-medium ml-11">
          Crea contenido infinito para TikTok, IG, FB, YT y X usando Sora 2.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: FACTORIA */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* FORMULARIO */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Nueva Producción</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    MODO AUTOMÁTICO
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* TITULO */}
                <div className="group/input">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block group-focus-within/input:text-purple-600 transition-colors">
                    Título del Video
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 pl-12 font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:bg-white focus:shadow-lg focus:shadow-purple-500/10 placeholder:text-slate-300"
                      placeholder="Ej: Programando llave de BMW 2024..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Video
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-purple-500 transition-colors"
                      size={20}
                    />
                  </div>
                </div>

                {/* URL IMAGEN */}
                <div className="group/input">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block group-focus-within/input:text-blue-600 transition-colors">
                    Imagen de Referencia (URL)
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 pl-12 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 font-mono text-sm placeholder:text-slate-300"
                      placeholder="https://imgur.com/..."
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    />
                    <Link
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors"
                      size={20}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-right">
                    Dejar vacío para usar imagen genérica de taller.
                  </p>
                </div>

                {/* IDEA */}
                <div className="group/input">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block group-focus-within/input:text-amber-500 transition-colors">
                    Concepto / Guión
                  </label>
                  <div className="relative">
                    <textarea
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 pl-12 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all focus:bg-white focus:shadow-lg focus:shadow-amber-500/10 h-32 resize-none placeholder:text-slate-300 leading-relaxed"
                      placeholder="Explica qué problema tiene el cliente y cómo lo solucionamos rápido y barato..."
                      value={formData.idea}
                      onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                    />
                    <Lightbulb
                      className="absolute left-4 top-5 text-slate-400 group-focus-within/input:text-amber-500 transition-colors"
                      size={20}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`mt-8 w-full py-5 rounded-xl font-black text-lg text-white shadow-2xl shadow-purple-500/30 transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn ${generating ? 'bg-slate-800 cursor-not-allowed grayscale' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-[1.01] hover:shadow-purple-500/50'}`}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                {generating ? (
                  <>
                    <Activity className="animate-spin" />
                    PROCESANDO...
                  </>
                ) : (
                  <>
                    <Play fill="currentColor" />
                    GENERAR VIDEO
                  </>
                )}
              </button>
            </div>
          </div>

          {/* HUD TERMINAL - SOLO VISIBLE SI GENERANDO */}
          {generating && (
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-2xl font-mono relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-50">
                <Activity className="text-green-500 animate-pulse" size={40} strokeWidth={1} />
              </div>
              <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                <Terminal size={16} /> SYSTEM_STATUS: ONLINE
              </h4>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="opacity-80">1. Analizando Idea (GPT-4o)</span>
                </div>
                <div className="flex items-center gap-3 text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                  <span className="opacity-80">2. Renderizando Video Neural (KIE Sora)</span>
                </div>
                <div className="flex items-center gap-3 text-purple-400">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="opacity-50">3. Distribuyendo a Blotato (5 Redes)</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                <span>TAREA: {Math.floor(Math.random() * 999999)}</span>
                <span>TIEMPO EST: 180s</span>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: ESTADISTICAS Y LOGS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* MINI DASHBOARD */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-slate-400 mb-2">
                <Eye size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">24.5K</div>
              <div className="text-xs font-bold text-green-600">+18% esta semana</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-slate-400 mb-2">
                <BarChart3 size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">5</div>
              <div className="text-xs font-bold text-purple-600">Plataformas Activas</div>
            </div>
          </div>

          {/* HISTORY FEED */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-[400px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" /> Historial de Producción
              </h3>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                Recientes
              </span>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[500px]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="group flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl shadow-sm ${log.status === 'ready' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}
                  >
                    {log.status === 'ready' ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <AlertTriangle size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                      {log.title}
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>{log.date}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="font-bold text-slate-600">
                        {log.views.toLocaleString()} vistas
                      </span>
                    </p>
                    {log.script && (
                      <p className="mt-2 text-xs text-purple-600 bg-purple-50 inline-block px-2 py-1 rounded-md font-medium">
                        {log.script}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
