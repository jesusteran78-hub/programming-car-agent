
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TRAINING_FILE = path.join(__dirname, '..', 'alex_training.md');

async function supervise(targetPhone) {
    console.log(`🕵️ Supervisor observando: ${targetPhone || 'Último chat activo'}...`);

    try {
        // 1. SELECT TARGET LEAD
        let leadId;
        if (targetPhone) {
            const { data } = await supabase.from('leads').select('id').eq('phone', targetPhone).single();
            if (data) leadId = data.id;
        } else {
            // Get most recent chat
            const { data } = await supabase
                .from('conversations')
                .select('lead_id')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data) leadId = data.lead_id;
        }

        if (!leadId) {
            console.log('❌ No hay chats para supervisar.');
            return;
        }

        // 2. FETCH HISTORY
        const { data: history } = await supabase
            .from('conversations')
            .select('role, content, created_at')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true }) // Oldest first for context
            .limit(20);

        const chatText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
        console.log(`📝 Analizando ${history.length} mensajes...`);

        // 3. SUPERVISOR CRITIQUE
        const systemPrompt = `
      ERES EL JEFE DE VENTAS ("El Supervisor").
      Tu trabajo es entrenar a "Alex" (el vendedor AI) para que sea perfecto.
      
      REGLAS DE ORO PARA ALEX:
      1. Siempre debe pedir Año, Marca y Modelo.
      2. No debe inventar precios.
      3. Debe ser breve y profesional.
      4. Si el cliente pide algo que no hacemos, debe decirlo amablemente.
      
      TU TAREA:
      Analiza la siguiente conversación.
      Si Alex cometió un error, genera una "NUEVA REGLA" corrección.
      Si lo hizo bien, di "APROBADO".
      
      FORMATO DE SALIDA (JSON):
      {
        "status": "APROBADO" | "MEJORAR",
        "critique": "Explicación breve...",
        "new_rule": "Instrucción clara para agregar al manual (Si aplica)"
      }
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: chatText }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        console.log('--- REPORTE DEL SUPERVISOR ---');
        console.log(`Estado: ${result.status}`);
        console.log(`Crítica: ${result.critique}`);

        if (result.status === "MEJORAR" && result.new_rule) {
            console.log(`✨ APRENDIENDO: Agregando nueva regla al manual...`);
            const ruleEntry = `\n- [APRENDIDO ${new Date().toLocaleDateString()}] ${result.new_rule}`;
            fs.appendFileSync(TRAINING_FILE, ruleEntry);
            console.log(`✅ Manual actualizado: ${result.new_rule}`);
        } else {
            console.log('✅ Nada que corregir por ahora.');
        }

    } catch (e) {
        console.error('Error del Supervisor:', e);
    }
}

// Allow CLI arg: node supervisor.js 1786...
const phoneArg = process.argv[2];
supervise(phoneArg);
