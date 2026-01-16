// Node 18+ has native fetch

async function testVin() {
    // Random valid VIN (Toyota Camry example or similar)
    const vin = '5YFEPMAE2KP043000'; // Example VIN
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Log structure to see how to parse
        // console.log(JSON.stringify(data, null, 2));

        const getVal = (varName) => {
            const item = data.Results.find(r => r.Variable === varName);
            return item ? item.Value : 'N/A';
        };

        const make = getVal('Make');
        const model = getVal('Model');
        const year = getVal('Model Year');

        console.log(`VIN: ${vin}`);
        console.log(`Result: ${year} ${make} ${model}`);

    } catch (e) {
        console.error(e);
    }
}

testVin();
