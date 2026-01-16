
import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'

export default function ChatView({ leadId }) {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef(null)

    useEffect(() => {
        if (leadId) {
            fetchMessages()
            // Real-time subscription could go here
        }
    }, [leadId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function fetchMessages() {
        setLoading(true)
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true })

        if (error) console.error('Error fetching chat:', error)
        else setMessages(data)
        setLoading(false)
    }

    if (!leadId) return (
        <div className="h-full flex items-center justify-center text-gray-400">
            <p>Selecciona una misión para ver la inteligencia en acción 🛰️</p>
        </div>
    )

    return (
        <div className="flex flex-col h-[600px] bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">📡 Transmisión En Vivo</h3>
                <button onClick={fetchMessages} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    ↻ Actualizar
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Descifrando datos...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 italic">No hay transmisiones aún.</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm text-sm ${msg.role === 'user'
                                        ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                        : 'bg-blue-600 text-white rounded-tr-none'
                                    }`}
                            >
                                <div className="font-xs opacity-70 mb-1">
                                    {msg.role === 'user' ? '👤 Cliente' : '🤖 Alex (IA)'}
                                </div>
                                {msg.content}
                                <div className="text-[10px] opacity-50 mt-1 text-right">
                                    {new Date(msg.created_at).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Modo Observador (Solo Lectura)..."
                        disabled
                        className="w-full bg-gray-100 border-none rounded-full py-2 px-4 text-sm focus:ring-0 text-gray-500 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-2 text-xs text-gray-400 font-bold">LOCKED 🔒</div>
                </div>
            </div>
        </div>
    )
}
