const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'gynecology_practice',
  user: 'postgres',
  password: 'postgres',
});

async function listPatients() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const query = `
      SELECT
        id,
        name,
        cpf,
        TO_CHAR("birthDate", 'DD/MM/YYYY') as birth_date,
        phone,
        email,
        city,
        state,
        TO_CHAR("createdAt", 'DD/MM/YYYY HH24:MI') as created_at
      FROM patients
      ORDER BY "createdAt" DESC;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log('No patients found.');
    } else {
      console.log(`=== Total Patients: ${result.rows.length} ===\n`);

      result.rows.forEach((patient, index) => {
        console.log(`${index + 1}. ${patient.name}`);
        console.log(`   CPF: ${patient.cpf}`);
        console.log(`   Birth Date: ${patient.birth_date}`);
        console.log(`   Phone: ${patient.phone}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Location: ${patient.city}, ${patient.state}`);
        console.log(`   Registered: ${patient.created_at}`);
        console.log(`   ID: ${patient.id}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error listing patients:', error.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}

listPatients();
