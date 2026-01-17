// Native fetch in Node 20+

async function check() {
  const url =
    'https://s3.eu-central-1.wasabisys.com/in-files/17864782531/jpeg-2a433b09198f3bcb51a9-80b60429068f0a.jpeg';
  console.log(`Checking URL: ${url}`);

  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Content-Length: ${res.headers.get('content-length')}`);

    if (res.status === 200) {
      console.log('✅ Image is accessible!');
    } else {
      console.log('❌ Image is NOT accessible.');
    }
  } catch (e) {
    console.error('❌ Fetch Error:', e.message);
  }
}

check();
