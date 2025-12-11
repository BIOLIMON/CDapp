import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '/home/lemon/Documentos/Cultiva_Datos/docs/CultivaDatos - Códigos Únicos.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];

    // Read as arrays to check headers (Same identifying logic as AdminPanel)
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    console.log("Total rows:", data.length);
    if (data.length > 0) console.log("Header (Row 0):", data[0]);
    if (data.length > 1) console.log("Row 1:", data[1]);

    const codeIndex = 1;
    const labelIndex = 0;
    const varietyIndex = 2;

    const kitsToUpload = data.slice(1) // Skip header
        .filter(row => row[codeIndex] && (typeof row[codeIndex] === 'string' || typeof row[codeIndex] === 'number'))
        .map(row => ({
            code: String(row[codeIndex]).trim().toUpperCase(),
            kit_number: row[labelIndex] ? String(row[labelIndex]).trim() : undefined,
            variety: row[varietyIndex] ? String(row[varietyIndex]).trim() : undefined,
            batch_id: `UPLOAD_TEST`
        }))
        .filter(item => item.code.length > 2); // Basic filter

    console.log("Parsed " + kitsToUpload.length + " kits.");
    console.log("Sample Kit 1:", kitsToUpload[0]);
    console.log("Sample Kit 2:", kitsToUpload[1]);

} catch (error) {
    console.error("Error reading file:", error);
}
