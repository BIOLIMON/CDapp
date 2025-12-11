import fs from 'fs';
import * as XLSX from 'xlsx';
import pg from 'pg';
import dns from 'dns';
import util from 'util';

const { Client } = pg;
const lookup = util.promisify(dns.lookup);

const host = 'db.sbkthgolctsnwgikzuan.supabase.co';
const password = 'Xbit_19751722';

async function seed() {
    console.log("Reading Excel...");
    const buf = fs.readFileSync('docs/CultivaDatos - Códigos Únicos.xlsx');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    // Data format based on inspection:
    // { 'N Caja': 1, 'Código Único': 'CVPL-01', 'Variedad de tomate (Roma o Cal Ace)': 'Cal Ace' }

    const kits = data.map(row => ({
        code: row['Código Único'],
        kit_number: String(row['N Caja']),
        variety: row['Variedad de tomate (Roma o Cal Ace)'],
        batch_id: 'MANUAL_SEED_SCRIPT'
    })).filter(k => k.code);

    console.log(`Prepared ${kits.length} kits.`);

    // Generate SQL Migration Content
    console.log(`Generating SQL for ${kits.length} kits...`);

    const sqlLines = kits.map(k => {
        // Escape strings to prevent SQL injection errors
        const code = k.code.replace(/'/g, "''");
        const num = k.kit_number.replace(/'/g, "''");
        const var_name = k.variety.replace(/'/g, "''");
        const batch = k.batch_id.replace(/'/g, "''");

        return `INSERT INTO allowed_kits (code, kit_number, variety, batch_id, status) VALUES ('${code}', '${num}', '${var_name}', '${batch}', 'available') ON CONFLICT (code) DO UPDATE SET kit_number = EXCLUDED.kit_number, variety = EXCLUDED.variety, batch_id = EXCLUDED.batch_id;`;
    });

    const migrationContent = `-- Auto-generated seed from Excel
${sqlLines.join('\n')}
`;

    // Write to migration file
    const migrationPath = 'supabase/migrations/20251211202500_seed_excel_kits.sql';
    fs.writeFileSync(migrationPath, migrationContent);

    console.log(`Migration file created at ${migrationPath}`);
}

seed();
