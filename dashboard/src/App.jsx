import { useState } from 'react';
import LeadsTable from './LeadsTable';
import ChatView from './ChatView';
import MarketingView from './MarketingView';
import AgendaView from './AgendaView';
import SupervisorView from './SupervisorView';
import DataView from './DataView';

function App() {
  const [currentView, setCurrentView] = useState('marketing');
  const [selectedLead, setSelectedLead] = useState(null);

  const renderContent = () => {
    switch (currentView) {
      case 'sales':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            <div className="lg:col-span-1 h-full overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-700">
                Misiones Activas
              </div>
              <div className="flex-1 overflow-hidden">
                <LeadsTable onSelect={setSelectedLead} selectedId={selectedLead} />
              </div>
            </div>
            <div className="lg:col-span-2 h-full overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-700">
                Cerebro de Alex
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView leadId={selectedLead} />
              </div>
            </div>
          </div>
        );
      case 'ops':
        return <AgendaView />;
      case 'supervisor':
        return <SupervisorView />;
      case 'data':
        return <DataView />;
      case 'marketing':
        return <MarketingView />;
      case 'finance':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl border border-dashed border-slate-300 m-4">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-slate-700">Bóveda Financiera</h3>
            <p className="text-slate-400">Panel de Stripe en construcción.</p>
          </div>
        );
      default:
        return <MarketingView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans text-slate-600 overflow-hidden">
      {/* SIDEBAR - EasyPanel Style */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-emerald-200 shadow-lg">
              PC
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">Programming Car</h1>
              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Online v1.0
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem
            icon="🧠"
            label="Cerebro (Ventas)"
            active={currentView === 'sales'}
            onClick={() => setCurrentView('sales')}
          />
          <NavItem
            icon="🚀"
            label="Marketing (Viral)"
            active={currentView === 'marketing'}
            onClick={() => setCurrentView('marketing')}
          />
          <NavItem
            icon="🗓️"
            label="Operaciones (App)"
            active={currentView === 'ops'}
            onClick={() => setCurrentView('ops')}
          />
          <NavItem
            icon="👨‍🏫"
            label="Supervisor"
            active={currentView === 'supervisor'}
            onClick={() => setCurrentView('supervisor')}
          />
          <NavItem
            icon="🗄️"
            label="Base de Datos"
            active={currentView === 'data'}
            onClick={() => setCurrentView('data')}
          />
          <NavItem
            icon="💸"
            label="Finanzas"
            active={currentView === 'finance'}
            onClick={() => setCurrentView('finance')}
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              JP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Jesus Perez</div>
              <div className="text-[10px] text-slate-400 truncate">CEO / Técnico</div>
            </div>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F3F4F6]">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {currentView === 'sales' && '🧠 Centro de Comando'}
              {currentView === 'ops' && '🔧 Despacho de Campo'}
              {currentView === 'supervisor' && '👨‍🏫 Panel de Entrenamiento'}
              {currentView === 'data' && '🗄️ Registros del Sistema'}
              {currentView === 'marketing' && '🚀 Motor de Creación Viral'}
              {currentView === 'finance' && '💸 Finanzas'}
            </h2>
          </div>
          <div className="flex gap-4">
            {/* Simulated Server Stats like EasyPanel */}
            <div className="hidden md:flex gap-3">
              <StatusPill label="CPU" value="12%" color="text-slate-600" />
              <StatusPill label="RAM" value="2.1 GB" color="text-slate-600" />
              <StatusPill label="DISK" value="SSD" color="text-emerald-600" />
            </div>
          </div>
        </header>

        {/* CONTENT SCROLLABLE AREA */}
        <div className="flex-1 overflow-auto p-6 relative">{renderContent()}</div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm mb-1
            ${active
          ? 'bg-white text-emerald-700 font-bold shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

function StatusPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
      <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default App;
