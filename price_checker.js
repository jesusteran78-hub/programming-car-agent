const { getSupplierLinks } = require('./key_finder');

/**
 * Extract price from HTML content using regex heuristics for Shopify/Common stores.
 */
function extractPrice(html) {
    if (!html) return null;

    // 1. Try JSON-LD (Most reliable for Shopify/Modern sites)
    const jsonLdMatch = html.match(/"price"\s*:\s*"([\d\.]+)"/);
    if (jsonLdMatch) return parseFloat(jsonLdMatch[1]);

    // 2. Try common price meta tags
    const metaPrice = html.match(/<meta\s+property="product:price:amount"\s+content="([\d\.]+)"/i);
    if (metaPrice) return parseFloat(metaPrice[1]);

    // 3. Try visible price with class (money, price, product-price, etc.)
    // Matches: <span class="price">$19.99</span> or <span class="money"> $ 19.99 </span>
    const classPriceMatch = html.match(/class=["']\s*[^"']*(?:price|money|amount)[^"']*\s*["'][^>]*>\s*\$\s*([\d,]+\.?\d*)/i);
    if (classPriceMatch) return parseFloat(classPriceMatch[1].replace(/,/g, ''));

    // 4. Try generic "$" search in body (risky but fallback)
    // Avoid script tags? Hard with regex. Let's try searching for "price" followed by $ nearby
    const fallbackMatch = html.match(/price.*?\$(\d+\.\d{2})/i);
    if (fallbackMatch) return parseFloat(fallbackMatch[1]);

    return null;
}

/**
 * Fetches price from a Supplier Search URL.
 * Note: Search pages might list multiple items. We take the price of the first relevant item or range.
 */
async function fetchSupplierPrice(name, url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) return { name, error: `HTTP ${response.status}`, url };

        const html = await response.text();
        const price = extractPrice(html);

        return {
            name,
            price: price || 'Consultar Web', // Fallback if parsing fails
            found: !!price,
            url
        };
    } catch (e) {
        return { name, error: e.message, url };
    }
}

/**
 * Check prices across all suppliers for a given vehicle/FCC.
 */
async function checkInternalPrices(fccId, make, model, year) {
    // Re-use logic from key_finder to get our target URLs
    const links = getSupplierLinks(make, model, year, fccId);

    // Check all sources in parallel
    const promises = links.map(link => fetchSupplierPrice(link.name, link.url));
    const results = await Promise.all(promises);

    return results;
}

module.exports = { checkInternalPrices };
