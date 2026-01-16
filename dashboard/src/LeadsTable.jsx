
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function LeadsTable({ onSelect, selectedId }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) console.error('Error fetching leads:', error)
      else setLeads(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center p-10 animate-pulse text-gray-500">Escaneando sector... 📡</div>

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-bold text-brand-dark">📋 Misiones Activas</h3>
      </div>
      <div className="overflow-y-auto max-h-[550px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead.id)}
                className={`cursor-pointer transition-colors duration-150 ${selectedId === lead.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{lead.phone}</div>
                  <div className="text-xs text-gray-500">{lead.name || 'Desconocido'}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${lead.status === 'new' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                    {lead.status || 'NEW'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
