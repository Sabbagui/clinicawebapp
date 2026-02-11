@echo off
echo ========================================
echo     All Patients in Database
echo ========================================
echo.

docker exec gynecology-practice-db psql -U postgres -d gynecology_practice -c "SELECT name, cpf, TO_CHAR(\"birthDate\", 'DD/MM/YYYY') as birth_date, phone, email, city || ', ' || state as location FROM patients ORDER BY \"createdAt\" DESC;"

echo.
echo ========================================
pause
