
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function DataView() {
    const [activeTab, setActiveTab] = useState('requests'); // requests | prices
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    async function fetchData() {
        setLoading(true);
        let table = activeTab === 'requests' ? 'price_requests' : 'service_prices';

        const { data: result, error } = await supabase
            .from(table)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error(error);
            setData([]);
            // Show alert or toast? simpler to just log for now, but user says "empty".
            // Let's add an error display in the UI.
            setErrorMessage(error.message);
        } else {
            setData(result || []);
            setErrorMessage(null);
        }
        setLoading(false);
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* HEADER */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex gap-2">
                    <TabButton
                        active={activeTab === 'requests'}
                        label="📝 Solicitudes (Historial)"
                        onClick={() => setActiveTab('requests')}
                    />
                    <TabButton
                        active={activeTab === 'prices'}
                        label="🏷️ Catálogo de Precios"
                        onClick={() => setActiveTab('prices')}
                    />
                </div>
                <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">
                    ↻ Refrescar
                </button>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Vehículo</th>
                            <th className="px-6 py-3">Servicio</th>
                            <th className="px-6 py-3">Detalle Precio</th>
                            {activeTab === 'requests' && <th className="px-6 py-3">Cliente</th>}
                            {activeTab === 'requests' && <th className="px-6 py-3">Estado</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {errorMessage && (
                            <tr>
                                <td colSpan="6" className="p-4 bg-red-50 text-red-600 font-bold text-center border-b border-red-200">
                                    Error: {errorMessage}
                                </td>
                            </tr>
                        )}
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center">Cargando datos...</td></tr>
                        ) : (data.map((row) => (
                            <tr key={row.id} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-xs">
                                    {new Date(row.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                    {row.make} {row.model} {row.year}
                                </td>
                                <td className="px-6 py-4">
                                    {row.service_type}
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate">
                                    {row.price_data ? (
                                        <div className="flex flex-col gap-1 text-xs">
                                            {Object.entries(row.price_data).map(([k, v]) => (
                                                v && <span key={k} className="bg-green-50 text-green-700 px-1 rounded border border-green-100">
                                                    {k.replace('oem_', 'OEM ').toUpperCase()}: ${v}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="font-bold text-slate-900">${row.price}</span>
                                    )}
                                </td>
                                {activeTab === 'requests' && (
                                    <td className="px-6 py-4 text-xs font-mono">
                                        {row.client_phone}
                                    </td>
                                )}
                                {activeTab === 'requests' && (
                                    <td className="px-6 py-4">
                                        <StatusBadge status={row.status} />
                                    </td>
                                )}
                            </tr>
                        )))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TabButton({ active, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
        >
            {label}
        </button>
    )
}

function StatusBadge({ status }) {
    const colors = {
        pending: 'bg-yellow-100 text-yellow-800',
        answered: 'bg-green-100 text-green-800',
        expired: 'bg-gray-100 text-gray-800'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>
            {status?.toUpperCase()}
        </span>
    );
}
