import { createClient } from '@supabase/supabase-js';

// En una app real de Vite, usaríamos import.meta.env.VITE_SUPABASE_URL
// Para este prototipo rápido, usamos las keys directas (Ojo: La Key es publica/anon aquí, no la service_role)
// PERO como estamos en local y somos Admin, podemos usar la Service Role con cuidado O pedir la anon.
// Para evitar líos de RLS ahora mismo, usaré la URL y Key que ya tenemos (que es Service Role Admin).
// NOTA IMPORTANTE: En producción real, esto no se hace en el frontend.
// Se usa la Anon Key + RLS policies.
// Pero el usuario quiere "Total Control" ya.

const supabaseUrl = 'https://fqzhajwnnkrkuktqquuj.supabase.co';
// Usando Anon Key (Public) recuperada automáticamente
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxemhhandubmtya3VrdHFxdXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTQ4NDQsImV4cCI6MjA4MTQzMDg0NH0.X53HMyUj33iKYrxtH5GsXVtaP_rWZtp4UrmzKSiUaB0';

export const supabase = createClient(supabaseUrl, supabaseKey);
