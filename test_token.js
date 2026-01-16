const token1 = 'YZYaIrtUh68ssCRhP44mUK7MYDHWxPLn'; // Capital I
const token2 = 'YZYalrtUh68ssCRhP44mUK7MYDHWxPLn'; // Lowercase l

async function test(t, label) {
    console.log(`Testing ${label}: ${t}`);
    try {
        const response = await fetch('https://gate.whapi.cloud/users/profile', {
            headers: { authorization: `Bearer ${t}` }
        });
        console.log(`${label} Status: ${response.status}`);
        if (response.ok) console.log(`${label} IS VALID ✅`);
        else console.log(`${label} IS INVALID ❌`);
    } catch (e) { console.error(e.message); }
}

(async () => {
    await test(token1, 'Token 1 (Capital I)');
    await test(token2, 'Token 2 (Lowercase l)');
})();
