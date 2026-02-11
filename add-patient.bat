@echo off
echo ========================================
echo     Add New Patient to Database
echo ========================================
echo.

set /p name="Patient Name: "
set /p cpf="CPF: "
set /p birthDate="Birth Date (YYYY-MM-DD): "
set /p phone="Phone: "
set /p whatsapp="WhatsApp (leave empty to use phone): "
if "%whatsapp%"=="" set whatsapp=%phone%
set /p email="Email (optional): "

echo.
echo --- Address ---
set /p street="Street: "
set /p number="Number: "
set /p complement="Complement (optional): "
set /p neighborhood="Neighborhood: "
set /p city="City: "
set /p state="State (e.g., SP): "
set /p zipCode="ZIP Code: "

echo.
echo --- Emergency Contact (optional) ---
set /p emergencyName="Name: "
set /p emergencyRel="Relationship: "
set /p emergencyPhone="Phone: "

echo.
echo Adding patient to database...

docker exec -i gynecology-practice-db psql -U postgres -d gynecology_practice -c "INSERT INTO patients (id, name, cpf, \"birthDate\", phone, whatsapp, email, street, number, complement, neighborhood, city, state, \"zipCode\", \"emergencyContactName\", \"emergencyContactRelationship\", \"emergencyContactPhone\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), '%name%', '%cpf%', '%birthDate%', '%phone%', '%whatsapp%', NULLIF('%email%', ''), '%street%', '%number%', NULLIF('%complement%', ''), '%neighborhood%', '%city%', '%state%', '%zipCode%', NULLIF('%emergencyName%', ''), NULLIF('%emergencyRel%', ''), NULLIF('%emergencyPhone%', ''), now(), now()); SELECT name, cpf, phone FROM patients WHERE cpf = '%cpf%';"

echo.
echo ========================================
echo Patient added successfully!
echo ========================================
pause
