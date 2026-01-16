// vin_decoder.js
// Utilidad para decodificar VINs usando la API de NHTSA (Gratis/Pública)

async function decodeVIN(vin) {
    if (!vin || vin.length < 17) return { error: "VIN inválido o muy corto" };

    try {
        const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;
        console.log(`🔍 Buscando VIN en NHTSA: ${vin}`);

        const response = await fetch(url);
        const data = await response.json();

        // Helper para extraer valor por nombre de variable
        const getVal = (varName) => {
            const item = data.Results.find(r => r.Variable === varName);
            return item ? item.Value : null;
        };

        const year = getVal('Model Year');
        const make = getVal('Make');
        const model = getVal('Model');
        const type = getVal('Body Class');
        const engine = getVal('Engine Cylinders');
        const fuel = getVal('Fuel Type - Primary');

        if (!make || !model || !year) {
            return { error: "No se pudo decodificar el VIN (Datos incompletos en NHTSA)" };
        }

        return {
            success: true,
            vin: vin,
            year: year,
            make: make,
            model: model,
            desc: `${year} ${make} ${model} (${type})`,
            details: {
                engine: engine,
                fuel: fuel
            }
        };

    } catch (error) {
        console.error("Error en decodeVIN:", error);
        return { error: "Error de conexión con NHTSA API" };
    }
}

module.exports = { decodeVIN };
