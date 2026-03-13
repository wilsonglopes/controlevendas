import * as XLSX from 'xlsx';
import * as fs from 'fs';

const fileStore = fs.readFileSync('Relat\u00f3rio_de_pedidos.xlsx');
const workbook = XLSX.read(fileStore, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log('Headers:', data[0]);

if (data.length > 1) {
  console.log('\nRow 1 Data:', data[1]);
}
if (data.length > 2) {
  console.log('Row 2 Data:', data[2]);
}
