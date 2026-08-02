import React, { useState, useEffect } from 'react';

export function formatBRL(value: number, showSymbol = false): string {
  if (value === undefined || value === null || isNaN(value)) {
    return showSymbol ? 'R$ 0,00' : '0,00';
  }
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `R$ ${formatted}` : formatted;
}

export function parseBRLToNumber(input: string): number {
  if (!input) return 0;
  const cleanDigits = input.replace(/\D/g, '');
  if (!cleanDigits) return 0;
  return parseInt(cleanDigits, 10) / 100;
}

interface CurrencyInputProps {
  value: number;
  onChange: (numericValue: number) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  showSymbol?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  id,
  name,
  placeholder = '0,00',
  className = '',
  showSymbol = false,
  disabled = false,
  required = false,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    if (value === 0 || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatBRL(value, showSymbol));
    }
  }, [value, showSymbol]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digitsOnly = rawInput.replace(/\D/g, '');

    if (!digitsOnly) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numValue = parseInt(digitsOnly, 10) / 100;
    const formatted = formatBRL(numValue, showSymbol);

    setDisplayValue(formatted);
    onChange(numValue);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      name={name}
      disabled={disabled}
      required={required}
      placeholder={showSymbol ? `R$ ${placeholder}` : placeholder}
      className={className}
      value={displayValue}
      onChange={handleChange}
    />
  );
}
