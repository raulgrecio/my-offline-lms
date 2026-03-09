const Database = require('better-sqlite3');
const db = new Database('/home/rgr/source/my-offline-lms/data/db.sqlite', { readonly: true });

// 1. El guide con el problema
const targetId = '6bc39d27-80d2-4853-a622-b39943eeca1d';
const row = db.prepare('SELECT * FROM Course_Assets WHERE id = ?').get(targetId);
if (row) {
  console.log('\n=== Guide con problema ===');
  console.log('id:', row.id);
  console.log('course_id:', row.course_id);
  console.log('status:', row.status);
  console.log('local_path:', row.local_path);
  const meta = JSON.parse(row.metadata || '{}');
  console.log('metadata keys:', Object.keys(meta));
  console.log('metadata completa:', JSON.stringify(meta, null, 2));
} else {
  console.log('Guide no encontrado con id:', targetId);
}

// 2. El asset antiguo del fix
const oldId = 'pdf_110015';
const oldRow = db.prepare('SELECT * FROM Course_Assets WHERE id = ?').get(oldId);
if (oldRow) {
  console.log('\n=== Asset antiguo (pdf_110015) ===');
  console.log('id:', oldRow.id);
  console.log('course_id:', oldRow.course_id);
  const oldMeta = JSON.parse(oldRow.metadata || '{}');
  console.log('metadata keys:', Object.keys(oldMeta));
  console.log('metadata completa:', JSON.stringify(oldMeta, null, 2));
} else {
  console.log('Asset pdf_110015 no encontrado');
}

// 3. Mostrar todos los guides del curso 150265
console.log('\n=== Todos los guides del curso 150265 ===');
const guides = db.prepare("SELECT id, metadata, status, local_path FROM Course_Assets WHERE course_id = '150265' AND type = 'guide'").all();
guides.forEach(g => {
  const m = JSON.parse(g.metadata || '{}');
  console.log(`id: ${g.id} | status: ${g.status} | name: ${m.name} | filename: ${m.filename} | local_path: ${g.local_path}`);
  console.log('  -> all metadata keys:', Object.keys(m).join(', '));
});

// 4. Buscar cualquier guide con campo gcc o originalFilename o documentCode
console.log('\n=== Guides con potenciales campos de nombre original ===');
const allGuides = db.prepare("SELECT id, metadata FROM Course_Assets WHERE type = 'guide' LIMIT 20").all();
allGuides.forEach(g => {
  const m = JSON.parse(g.metadata || '{}');
  const interestingKeys = Object.keys(m).filter(k => 
    k.toLowerCase().includes('gcc') || 
    k.toLowerCase().includes('filename') || 
    k.toLowerCase().includes('original') ||
    k.toLowerCase().includes('document') ||
    k.toLowerCase().includes('code') ||
    k.toLowerCase().includes('alias')
  );
  if (interestingKeys.length > 0) {
    console.log(`id: ${g.id} | interesting keys:`, interestingKeys);
    interestingKeys.forEach(k => console.log(`  ${k}: ${m[k]}`));
  }
});

db.close();
