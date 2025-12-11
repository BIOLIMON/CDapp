import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '/home/lemon/Documentos/Cultiva_Datos/docs/CultivaDatos - Códigos Únicos.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get headers (first row)
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
    console.log("Headers:", headers);

    // Get first few rows of data
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log("First 2 rows:", data.slice(0, 2));
} catch (error) {
    console.error("Error reading file:", error);
}
