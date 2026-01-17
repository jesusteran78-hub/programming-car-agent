const https = require('https');

function fetchPrice(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`URL: ${url}`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Length: ${data.length}`);

                // Simple regex to look for price-like structures
                // e.g. "$15.00" or "$ 15.00"
                const prices = data.match(/\$\s?[\d,]+\.\d{2}/g);
                if (prices) {
                    console.log("Found prices:", prices.slice(0, 5));
                } else {
                    console.log("No price patterns found.");
                }

                // Write sample to verify content (first 500 chars)
                console.log("Snippet:", data.substring(0, 500));

                resolve();
            });
        }).on('error', err => {
            console.error("Error:", err.message);
            resolve();
        });
    });
}

async function run() {
    console.log("Testing UHS Hardware...");
    // Search for a common FCC ID: HYQ12BDM
    await fetchPrice('https://www.uhs-hardware.com/pages/search-results-page?q=HYQ12BDM');

    console.log("\nTesting Locksmith Keyless...");
    await fetchPrice('https://www.locksmithkeyless.com/pages/search-results-page?q=HYQ12BDM');
}

run();
