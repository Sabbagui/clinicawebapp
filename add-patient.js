const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'gynecology_practice',
  user: 'postgres',
  password: 'postgres',
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addPatient() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('=== Add New Patient ===\n');

    const name = await question('Patient Name: ');
    const cpf = await question('CPF: ');
    const birthDate = await question('Birth Date (YYYY-MM-DD): ');
    const phone = await question('Phone: ');
    const whatsapp = await question('WhatsApp (press Enter to use same as phone): ') || phone;
    const email = await question('Email (optional): ') || null;

    console.log('\n--- Address ---');
    const street = await question('Street: ');
    const number = await question('Number: ');
    const complement = await question('Complement (optional): ') || null;
    const neighborhood = await question('Neighborhood: ');
    const city = await question('City: ');
    const state = await question('State: ');
    const zipCode = await question('ZIP Code: ');

    console.log('\n--- Emergency Contact (optional) ---');
    const emergencyContactName = await question('Name: ') || null;
    const emergencyContactRelationship = await question('Relationship: ') || null;
    const emergencyContactPhone = await question('Phone: ') || null;

    const query = `
      INSERT INTO patients (
        id, name, cpf, "birthDate", phone, whatsapp, email,
        street, number, complement, neighborhood, city, state, "zipCode",
        "emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone",
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16,
        now(), now()
      )
      RETURNING id, name, cpf, phone;
    `;

    const values = [
      name, cpf, birthDate, phone, whatsapp, email,
      street, number, complement, neighborhood, city, state, zipCode,
      emergencyContactName, emergencyContactRelationship, emergencyContactPhone
    ];

    const result = await client.query(query, values);

    console.log('\n✅ Patient added successfully!');
    console.log('Patient ID:', result.rows[0].id);
    console.log('Name:', result.rows[0].name);
    console.log('CPF:', result.rows[0].cpf);

  } catch (error) {
    console.error('❌ Error adding patient:', error.message);
  } finally {
    await client.end();
    rl.close();
    process.exit(0);
  }
}

addPatient();
