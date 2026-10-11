import { useEffect, useRef, useState } from 'react';
import { parseDecimal } from '@tr-lab/domain';
export function DecimalInput({
  value,
  scale = 1,
  min = 0,
  max = 1000,
  integer = false,
  required = false,
  onValue,
}: {
  value: number | null;
  scale?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  required?: boolean;
  onValue: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value / scale).replace('.', ','));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value === null ? '' : String(value / scale).replace('.', ','));
  }, [value, scale]);
  function validate(input: HTMLInputElement) {
    const parsed = parseDecimal(input.value);
    const empty = !input.value.trim();
    const valid =
      parsed !== null && parsed >= min && parsed <= max && (!integer || Number.isInteger(parsed));
    input.setCustomValidity(
      (empty && !required) || valid
        ? ''
        : `Inserisci ${integer ? 'un intero' : 'un numero'} tra ${min} e ${max}.`,
    );
    if (valid) onValue(Math.round(parsed * scale * 1000) / 1000);
    else if (empty && !required) onValue(null);
  }
  return (
    <input
      inputMode={integer ? 'numeric' : 'decimal'}
      required={required}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => {
        setText(event.target.value);
        // Il testo intermedio resta visibile, ma Invio non deve salvare il valore precedente.
        validate(event.currentTarget);
      }}
      onBlur={(event) => {
        focused.current = false;
        validate(event.currentTarget);
      }}
    />
  );
}
