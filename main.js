const mongoose = require('mongoose');
const readline = require('readline');
const db = require('./db/mongo'); // Switched to MongoDB file
const fs = require('fs');
const path = require('path');
require('./events/logger'); 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to make readline work with await
const ask = (query) => new Promise(resolve => rl.question(query, resolve));

// --- Backup Helper (Adapted for Async) ---
async function createBackup() {
  try {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    
    const now = new Date();
    const filename = `backup_${now.toISOString().split('T')[0]}_${now.toTimeString().split(' ')[0].replace(/:/g, '-')}.json`;
    const backupPath = path.join(backupDir, filename);
    
    // Fetch data from Mongo for backup
    const records = await db.listRecords();
    fs.writeFileSync(backupPath, JSON.stringify(records, null, 2));
    console.log(`💾 Automatic Backup created: ${filename}`);
  } catch (err) {
    console.error('Error creating backup:', err.message);
  }
}

function displayRecords(records) {
  if (records.length === 0) console.log('No records found.');
  else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value} | Created: ${r.created}`));
}

async function main() {
  // Initialize DB Connection
  await db.connectDB();

  while (true) {
    console.log(`
===== NodeVault (MongoDB Edition) =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Data
8. View Vault Statistics
9. Exit
=======================================
    `);

    const ans = await ask('Choose option: ');

    switch (ans.trim()) {
      case '1':
        const name = await ask('Enter name: ');
        const value = await ask('Enter value: ');
        await db.addRecord({ name, value });
        console.log('✅ Record added successfully!');
        await createBackup();
        break;

      case '2':
        const records = await db.listRecords();
        displayRecords(records);
        break;

      case '3':
        const uId = await ask('Enter record ID to update: ');
        const uName = await ask('New name: ');
        const uValue = await ask('New value: ');
        const updated = await db.updateRecord(Number(uId), uName, uValue);
        console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
        break;

      case '4':
        const dId = await ask('Enter record ID to delete: ');
        const deleted = await db.deleteRecord(Number(dId));
        if (deleted) {
          console.log('🗑️ Record deleted!');
          await createBackup();
        } else {
          console.log('❌ Record not found.');
        }
        break;

      case '5':
        const term = await ask('Enter search keyword (Name or ID): ');
        const allRecs = await db.listRecords();
        const matches = allRecs.filter(r => 
            r.name.toLowerCase().includes(term.toLowerCase()) || r.id.toString() === term
        );
        console.log(`\nFound ${matches.length} matching records:`);
        displayRecords(matches);
        break;

      case '6':
        const sortOpt = await ask('Sort by (1) Name or (2) Date? ');
        const orderOpt = await ask('Order (1) Ascending or (2) Descending? ');
        let sorted = await db.listRecords();
        
        sorted.sort((a, b) => {
            let valA = sortOpt === '1' ? a.name.toLowerCase() : new Date(a.created);
            let valB = sortOpt === '1' ? b.name.toLowerCase() : new Date(b.created);
            if (valA < valB) return orderOpt === '1' ? -1 : 1;
            if (valA > valB) return orderOpt === '1' ? 1 : -1;
            return 0;
        });
        displayRecords(sorted);
        break;

      case '7':
        const exportData = await db.listRecords();
        const header = `Export Date: ${new Date().toLocaleString()}\nTotal Records: ${exportData.length}\nFile: export.txt\n\n`;
        const content = exportData.map(r => `ID: ${r.id} | Name: ${r.name} | Created: ${r.created} | Value: ${r.value}`).join('\n');
        fs.writeFileSync(path.join(__dirname, 'export.txt'), header + content);
        console.log('✅ Data exported to export.txt');
        break;

      case '8':
        const stats = await db.listRecords();
        if (stats.length === 0) {
            console.log('No records.');
        } else {
            const longest = stats.reduce((a, b) => a.name.length > b.name.length ? a : b);
            const dates = stats.map(r => new Date(r.created)).sort((a, b) => a - b);
            console.log(`Total: ${stats.length}`);
            console.log(`Longest Name: ${longest.name} (${longest.name.length})`);
            console.log(`Earliest: ${dates[0].toISOString().split('T')[0]}`);
            console.log(`Latest: ${dates[dates.length - 1].toISOString().split('T')[0]}`);
        }
        break;

      case '9':
        console.log('👋 Exiting...');
        await mongoose.disconnect();
        rl.close();
        process.exit(0);

      default:
        console.log('Invalid option.');
    }
  }
}

main();