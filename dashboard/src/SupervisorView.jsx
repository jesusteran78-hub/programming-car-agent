
import { useState } from 'react';
import LeadsTable from './LeadsTable';
import ChatView from './ChatView';

export default function SupervisorView() {
    const [selectedLead, setSelectedLead] = useState(null);
    const [trainingStatus, setTrainingStatus] = useState(null);
    const [supervisorLogs, setSupervisorLogs] = useState('');
    const [isTraining, setIsTraining] = useState(false);

    const handleTrainAlex = async () => {
        if (!selectedLead) return;

        setIsTraining(true);
        setTrainingStatus('Detectando errores...');
        setSupervisorLogs(prev => prev + `\n[${new Date().toLocaleTimeString()}] Iniciando supervisión...`);

        try {
            // Need to fetch phone from lead ID, but for now passing empty phone lets supervisor pick latest message of that lead?
            // Actually supervisor API takes 'phone'. We need the phone number of the selected lead.
            // LeadsTable passes ID. We might need to fetch the lead details or modify LeadsTable to pass phone.
            // For now, let's assume we can fetch the lead phone or just use the ID if we update backend.
            // To keep it simple, I'll update LeadsTable to pass full object or just fetch it here.
            // BETTER: Let's fetch the lead details here using Supabase, or simplest: 
            // Just hit the train endpoint without phone (defaults to latest chat), 
            // BUT we want to train on THIS specific chat.

            // Let's rely on the user selecting the lead, and we assume we can get the phone.
            // Since I don't want to overcomplicate, I'll just use the backend "latest" logic if no phone provided,
            // OR I can quickly fetch the phone here.

            // Let's fetch the phone for the selected lead ID
            const { supabase } = await import('./supabaseClient');
            const { data: lead } = await supabase.from('leads').select('phone').eq('id', selectedLead).single();

            const response = await fetch('/api/supervisor/train', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: lead?.phone }),
            });

            const result = await response.json();

            if (result.success) {
                setTrainingStatus(result.status);
                setSupervisorLogs(prev => prev + `\n${result.logs}`);
            } else {
                setTrainingStatus('Error');
                setSupervisorLogs(prev => prev + `\n❌ Error: ${result.error}`);
            }

        } catch (e) {
            setTrainingStatus('Fallo de Red');
            setSupervisorLogs(prev => prev + `\n❌ Exception: ${e.message}`);
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">

            {/* COL 1: LEAD SELECTION */}
            <div className="lg:col-span-1 h-full overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-700 bg-slate-50">
                    👥 Selección de Chat
                </div>
                <div className="flex-1 overflow-hidden">
                    <LeadsTable onSelect={setSelectedLead} selectedId={selectedLead} />
                </div>
            </div>

            {/* COL 2: LIVE CHAT (Wider) */}
            <div className="lg:col-span-2 h-full overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-700 bg-slate-50">
                    📡 Transmisión en Vivo
                </div>
                <div className="flex-1 overflow-hidden p-0">
                    <ChatView leadId={selectedLead} />
                </div>
            </div>

            {/* COL 3: SUPERVISOR CONTROLS */}
            <div className="lg:col-span-1 h-full overflow-hidden bg-slate-900 text-slate-300 rounded-2xl shadow-sm border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 font-bold text-white flex justify-between items-center bg-slate-950">
                    <span>👨‍🏫 Supervisor AI</span>
                    <div className={`h-2 w-2 rounded-full ${isTraining ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    <div className="text-sm text-slate-400 text-center">
                        Revisa la conversación y entrena a Alex para mejorar sus respuestas futuras.
                    </div>

                    <button
                        onClick={handleTrainAlex}
                        disabled={!selectedLead || isTraining}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all
              ${!selectedLead
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : isTraining
                                    ? 'bg-yellow-600 cursor-wait'
                                    : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95'
                            }`}
                    >
                        {isTraining ? 'Analizando...' : '⚡ ENTRENAR AHORA'}
                    </button>

                    {trainingStatus && (
                        <div className={`text-center font-bold text-lg border-2 border-dashed rounded-lg p-3 ${trainingStatus === 'APROBADO' ? 'border-green-500 text-green-400' :
                                trainingStatus === 'MEJORANDO' ? 'border-yellow-500 text-yellow-400' :
                                    'border-red-500 text-red-400'
                            }`}>
                            {trainingStatus}
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-black p-4 m-4 rounded-xl font-mono text-xs overflow-y-auto border border-slate-800 text-green-500 whitespace-pre-wrap">
                    {supervisorLogs || '> Esperando comando...'}
                </div>
            </div>

        </div>
    );
}
