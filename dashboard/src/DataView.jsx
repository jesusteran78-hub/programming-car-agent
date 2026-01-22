
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function DataView() {
    const [activeTab, setActiveTab] = useState('prices'); // prices | requests
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredData(data);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredData(data.filter(row =>
                (row.make?.toLowerCase().includes(term)) ||
                (row.model?.toLowerCase().includes(term)) ||
                (row.service_type?.toLowerCase().includes(term))
            ));
        }
    }, [searchTerm, data]);

    async function fetchData() {
        setLoading(true);
        let table = activeTab === 'requests' ? 'price_requests' : 'service_prices';

        let query = supabase.from(table).select('*');

        if (activeTab === 'prices') {
            // Order by make, model for prices catalog
            query = query.order('make', { ascending: true }).order('model', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data: result, error } = await query.limit(500);

        if (error) {
            console.error(error);
            setData([]);
            setFilteredData([]);
            setErrorMessage(error.message);
        } else {
            setData(result || []);
            setFilteredData(result || []);
            setErrorMessage(null);
        }
        setLoading(false);
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* HEADER */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <TabButton
                            active={activeTab === 'prices'}
                            label="🏷️ Catálogo de Precios"
                            onClick={() => setActiveTab('prices')}
                        />
                        <TabButton
                            active={activeTab === 'requests'}
                            label="📝 Solicitudes (Historial)"
                            onClick={() => setActiveTab('requests')}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{filteredData.length} resultados</span>
                        <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">
                            ↻ Refrescar
                        </button>
                    </div>
                </div>
                {/* Search */}
                <input
                    type="text"
                    placeholder="Buscar por marca, modelo o servicio... (ej: BMW, Mercedes, copy)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Marca</th>
                            <th className="px-6 py-3">Modelo</th>
                            <th className="px-6 py-3">Años</th>
                            <th className="px-6 py-3">Servicio</th>
                            <th className="px-6 py-3">Precio</th>
                            {activeTab === 'requests' && <th className="px-6 py-3">Cliente</th>}
                            {activeTab === 'requests' && <th className="px-6 py-3">Estado</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {errorMessage && (
                            <tr>
                                <td colSpan="7" className="p-4 bg-red-50 text-red-600 font-bold text-center border-b border-red-200">
                                    Error: {errorMessage}
                                </td>
                            </tr>
                        )}
                        {loading ? (
                            <tr><td colSpan="7" className="p-8 text-center">Cargando datos...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay resultados</td></tr>
                        ) : (filteredData.map((row) => (
                            <tr key={row.id} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold text-slate-800">
                                    {row.make}
                                </td>
                                <td className="px-6 py-3">
                                    {row.model}
                                </td>
                                <td className="px-6 py-3 font-mono text-xs">
                                    {row.year_start ? `${row.year_start}-${row.year_end}` : row.year}
                                </td>
                                <td className="px-6 py-3">
                                    <ServiceBadge type={row.service_type} />
                                </td>
                                <td className="px-6 py-3">
                                    {row.price_data ? (
                                        <div className="flex flex-col gap-1 text-xs">
                                            {Object.entries(row.price_data).map(([k, v]) => (
                                                v && <span key={k} className="bg-green-50 text-green-700 px-1 rounded border border-green-100">
                                                    {k.replace('oem_', 'OEM ').toUpperCase()}: ${v}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="font-bold text-green-600 text-lg">${row.price}</span>
                                    )}
                                </td>
                                {activeTab === 'requests' && (
                                    <td className="px-6 py-3 text-xs font-mono">
                                        {row.client_phone}
                                    </td>
                                )}
                                {activeTab === 'requests' && (
                                    <td className="px-6 py-3">
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

function ServiceBadge({ type }) {
    const colors = {
        copy: 'bg-blue-100 text-blue-800',
        lost_all: 'bg-red-100 text-red-800',
        programming: 'bg-purple-100 text-purple-800',
        tcm_programmed: 'bg-orange-100 text-orange-800',
        transmission_rebuilt: 'bg-amber-100 text-amber-800',
    };
    const labels = {
        copy: 'Copia',
        lost_all: 'Llave Perdida',
        programming: 'Programación',
        tcm_programmed: 'TCM',
        transmission_rebuilt: 'Transmisión',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
            {labels[type] || type}
        </span>
    );
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
