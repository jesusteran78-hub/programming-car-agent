import { useState, useEffect } from 'react';
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
  RefreshCw,
  Smartphone,
  Film,
  Flame,
  Diamond,
  Theater,
  Palmtree,
  Cpu,
  Siren,
  Smile,
} from 'lucide-react';

const VIDEO_STYLES = [
  { id: 'ugc', name: 'UGC Selfie', icon: Smartphone, color: 'text-green-600 bg-green-100', description: 'VIRAL PROBADO' },
  { id: 'cinematic', name: 'Cinematico', icon: Film, color: 'text-purple-600 bg-purple-100', description: 'Netflix quality' },
  { id: 'viral', name: 'Viral Hook', icon: Flame, color: 'text-orange-600 bg-orange-100', description: '100M views' },
  { id: 'luxury', name: 'Luxury', icon: Diamond, color: 'text-blue-600 bg-blue-100', description: 'Rolex aesthetic' },
  { id: 'story', name: 'Story', icon: Theater, color: 'text-pink-600 bg-pink-100', description: 'Mini-pelicula' },
  { id: 'hypebeast', name: 'Hypebeast', icon: Palmtree, color: 'text-emerald-600 bg-emerald-100', description: 'Miami Street' },
  { id: 'tech', name: 'Tech', icon: Cpu, color: 'text-cyan-600 bg-cyan-100', description: 'Cyberpunk' },
  { id: 'emergency', name: 'Emergency', icon: Siren, color: 'text-red-600 bg-red-100', description: 'Rescate 3AM' },
  { id: 'satisfying', name: 'Satisfying', icon: Smile, color: 'text-amber-600 bg-amber-100', description: 'ASMR' },
];

export default function MarketingView() {
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    scene: '',
    idealCustomer: '',
    photoLink: '',
    videoStyle: 'ugc',
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/video-factory/jobs?limit=20');
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error('Error loading jobs:', e);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!formData.productName) {
      return alert('Ponle un nombre al producto/servicio');
    }

    setGenerating(true);

    try {
      const res = await fetch('/video-factory/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start job');
      }

      console.log('Job Started:', data.job.id);
      alert(`Video iniciado! Job ID: ${data.job.id}\n\nEl video tardara 5-10 minutos.`);

      // Add to local list immediately
      setJobs((prev) => [data.job, ...prev]);
      setFormData({
        productName: '',
        description: '',
        scene: '',
        idealCustomer: '',
        photoLink: '',
        videoStyle: 'ugc',
      });

      // Start polling for this job
      pollJobStatus(data.job.id);
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
    setGenerating(false);
  };

  const pollJobStatus = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/video-factory/jobs/${jobId}`);
        const data = await res.json();

        if (data.success && data.job) {
          // Update job in list
          setJobs((prev) =>
            prev.map((j) => (j.id === jobId ? data.job : j))
          );

          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(interval);
            if (data.job.status === 'completed') {
              // Show notification
              if (Notification.permission === 'granted') {
                new Notification('Video Listo!', {
                  body: data.job.product_name,
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 10000); // Poll every 10 seconds
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'generating_video':
        return 'bg-blue-100 text-blue-700';
      case 'generating_prompt':
        return 'bg-purple-100 text-purple-700';
      case 'processing':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Listo';
      case 'failed':
        return 'Error';
      case 'generating_video':
        return 'Generando...';
      case 'generating_prompt':
        return 'Prompt...';
      case 'processing':
        return 'Procesando...';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Video className="w-8 h-8 text-purple-600" />
            Video Factory
          </h1>
          <p className="text-slate-500 font-medium ml-11">
            Sistema UGC Viral - Sora 2 + Captions Automaticos
          </p>
        </div>
        <button
          onClick={loadJobs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Nuevo Video</h3>
                  <p className="text-xs text-green-600 font-bold">UGC VIRAL SYSTEM</p>
                </div>
              </div>

              {/* STYLE SELECTOR */}
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Estilo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_STYLES.map((style) => {
                    const Icon = style.icon;
                    const isSelected = formData.videoStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setFormData({ ...formData, videoStyle: style.id })}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 shadow-lg'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${style.color} flex items-center justify-center mx-auto mb-1`}>
                          <Icon size={16} />
                        </div>
                        <div className="text-xs font-bold text-slate-700">{style.name}</div>
                        {style.id === 'ugc' && (
                          <div className="text-[10px] text-green-600 font-bold">VIRAL</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {/* PRODUCT NAME */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Producto / Servicio *
                  </label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="BMW Key Programming"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Descripcion
                  </label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none h-20 resize-none"
                    placeholder="Cliente perdio llave BMW a las 2am en South Beach..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* SCENE */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Escena
                  </label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Parking lot South Beach, noche, neon"
                    value={formData.scene}
                    onChange={(e) => setFormData({ ...formData, scene: e.target.value })}
                  />
                </div>

                {/* PHOTO LINK */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Imagen (URL opcional)
                  </label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                    placeholder="https://..."
                    value={formData.photoLink}
                    onChange={(e) => setFormData({ ...formData, photoLink: e.target.value })}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`mt-6 w-full py-4 rounded-xl font-black text-lg text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
                  generating
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-[1.02] hover:shadow-purple-500/30'
                }`}
              >
                {generating ? (
                  <>
                    <Activity className="animate-spin" size={20} />
                    INICIANDO...
                  </>
                ) : (
                  <>
                    <Play fill="currentColor" size={20} />
                    GENERAR VIDEO
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <Eye size={20} className="text-slate-400 mb-2" />
              <div className="text-2xl font-black text-slate-900">
                {jobs.filter((j) => j.status === 'completed').length}
              </div>
              <div className="text-xs font-bold text-green-600">Videos Listos</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <Activity size={20} className="text-slate-400 mb-2" />
              <div className="text-2xl font-black text-slate-900">
                {jobs.filter((j) => !['completed', 'failed'].includes(j.status)).length}
              </div>
              <div className="text-xs font-bold text-blue-600">En Proceso</div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: JOBS LIST */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                Video Factory Jobs
              </h3>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                {jobs.length} total
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Video size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No hay videos todavia</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getStatusColor(job.status)}`}
                      >
                        {job.status === 'completed' ? (
                          <CheckCircle2 size={20} />
                        ) : job.status === 'failed' ? (
                          <AlertTriangle size={20} />
                        ) : (
                          <Activity size={20} className="animate-pulse" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-900 truncate">
                            {job.product_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(job.status)}`}
                          >
                            {getStatusText(job.status)}
                          </span>
                        </div>

                        {job.description && (
                          <p className="text-xs text-slate-500 truncate mb-2">
                            {job.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                            {job.video_style || 'ugc'}
                          </span>
                          <span>
                            {new Date(job.created_at).toLocaleString('es-ES', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {job.processing_time_ms && (
                            <span>{Math.round(job.processing_time_ms / 1000)}s</span>
                          )}
                        </div>

                        {/* Video Link */}
                        {job.video_link && (
                          <a
                            href={job.video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 hover:text-purple-800 font-bold"
                          >
                            <Play size={12} fill="currentColor" />
                            Ver Video
                          </a>
                        )}

                        {/* Captions Preview */}
                        {job.tiktok_caption && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                            <div className="text-[10px] font-bold text-slate-400 mb-1">
                              TIKTOK CAPTION:
                            </div>
                            <div className="text-xs text-slate-600 truncate">
                              {job.tiktok_caption}
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {job.failure_message && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg">
                            <div className="text-xs text-red-600">
                              {job.failure_message}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
