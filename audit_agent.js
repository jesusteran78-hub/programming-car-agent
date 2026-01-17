const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function audit() {
  console.log('🕵️‍♂️ Auditing Alex (Last 10 Messages)...\n');

  const { data, error } = await supabase
    .from('conversations')
    .select('role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No messages found.');
    return;
  }

  // Print in chronological order (Oldest -> Newest)
  data.reverse().forEach((msg) => {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const roleIcon = msg.role === 'user' ? '👤 Client' : '🤖 Alex';
    console.log(`[${time}] ${roleIcon}: ${msg.content}\n`);
  });
}

audit();
