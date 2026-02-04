
const { getSupabase } = require('../../core/supabase');

console.log('Starting video job check...');

async function checkVideoJobs() {
    try {
        console.log('Initializing Supabase...');
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('video_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching video jobs:', JSON.stringify(error, null, 2));
            return;
        }

        console.log(`Found ${data.length} video jobs.`);
        if (data.length > 0) {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('No video jobs found.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkVideoJobs();
