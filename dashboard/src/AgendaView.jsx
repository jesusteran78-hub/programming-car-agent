import { useState } from 'react';

export default function AgendaView() {
  const [jobs, setJobs] = useState([
    {
      id: 1,
      client: 'Juan Perez',
      car: '2015 Chevy Silverado',
      service: 'Programación TCM',
      address: '1234 SW 8th St, Miami, FL',
      time: '10:00 AM',
      status: 'pending',
      price: '$250',
    },
    {
      id: 2,
      client: 'Maria Rodriguez',
      car: '2018 Honda Civic',
      service: 'All Keys Lost',
      address: '8500 NW 12th Ave, Miami, FL',
      time: '02:00 PM',
      status: 'confirmed',
      price: '$180',
    },
  ]);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* HEADER AGENDA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-800">AGENDA DE CAMPO 🗓️</h3>
          <p className="text-sm text-slate-500">Tus misiones para hoy. Solo maneja y cobra.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-600">$430.00</div>
          <div className="text-xs text-slate-400 font-bold uppercase">Proyectado Hoy</div>
        </div>
      </div>

      {/* LISTA DE TRABAJOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}

        {/* Empty State / Add New */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer min-h-[250px] group">
          <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">+</div>
          <div className="font-bold">Agendar Manualmente</div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-1">
      <div
        className={`h-2 w-full ${job.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-400'}`}
      />
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
            {job.time}
          </span>
          <span
            className={`text-xs font-black uppercase tracking-wider ${job.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-500'}`}
          >
            {job.status === 'confirmed' ? 'CONFIRMADO' : 'PENDIENTE'}
          </span>
        </div>

        <h4 className="text-lg font-black text-slate-800 mb-1">{job.car}</h4>
        <div className="text-sm font-bold text-purple-600 mb-4">{job.service}</div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>👤</span> {job.client}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>📍</span> <span className="truncate">{job.address}</span>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
          <div className="font-black text-slate-900 text-lg">{job.price}</div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800">
            Ver Mapa 🗺️
          </button>
        </div>
      </div>
    </div>
  );
}
