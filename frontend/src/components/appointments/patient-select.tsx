'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { usePatientStore } from '@/lib/stores/patient-store';
import { formatCPF } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface PatientSelectProps {
  value?: string;
  onChange: (patientId: string) => void;
  error?: string;
}

export function PatientSelect({ value, onChange, error }: PatientSelectProps) {
  const { patients, fetchPatients } = usePatientStore();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPatient = patients.find((p) => p.id === value);

  const filteredPatients = patients.filter((p) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.cpf.includes(search.replace(/\D/g, ''))
    );
  });

  const handleSelect = (patientId: string) => {
    onChange(patientId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {selectedPatient ? (
        <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-background">
          <div>
            <span className="font-medium">{selectedPatient.name}</span>
            <span className="text-sm text-muted-foreground ml-2">
              {formatCPF(selectedPatient.cpf)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente por nome ou CPF..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {isOpen && !selectedPatient && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto border rounded-md bg-card shadow-lg">
          {filteredPatients.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum paciente encontrado
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm cursor-pointer"
                onClick={() => handleSelect(patient.id)}
              >
                <span className="font-medium">{patient.name}</span>
                <span className="text-muted-foreground ml-2">
                  {formatCPF(patient.cpf)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
