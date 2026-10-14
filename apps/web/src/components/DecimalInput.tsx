import { useEffect, useId, useRef, useState } from 'react';
import { parseDecimal } from '@tr-lab/domain';
import styles from '../styles/App.module.css';
function decimalState(text: string, min: number, max: number, integer: boolean, required: boolean) {
  const parsed = parseDecimal(text);
  const empty = !text.trim();
  const valid =
    parsed !== null && parsed >= min && parsed <= max && (!integer || Number.isInteger(parsed));
  return {
    parsed,
    empty,
    valid,
    message:
      (empty && !required) || valid
        ? ''
        : `Inserisci ${integer ? 'un intero' : 'un numero'} tra ${min} e ${max}.`,
  };
}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const visible = focused.current
      ? (inputRef.current?.value ?? '')
      : value === null
        ? ''
        : String(value / scale).replace('.', ',');
    if (!focused.current) setText(visible);
    // Un reset esterno aggiorna anche il vincolo nativo, senza inviare un nuovo valore al padre.
    const message = decimalState(visible, min, max, integer, required).message;
    inputRef.current?.setCustomValidity(message);
    setError(message);
  }, [value, scale, min, max, integer, required]);
  function validate(input: HTMLInputElement) {
    const { parsed, empty, valid, message } = decimalState(
      input.value,
      min,
      max,
      integer,
      required,
    );
    input.setCustomValidity(message);
    setError(message);
    if (valid && parsed !== null) onValue(Math.round(parsed * scale * 1000) / 1000);
    else if (empty && !required) onValue(null);
  }
  return (
    <>
      <input
        ref={inputRef}
        inputMode={integer ? 'numeric' : 'decimal'}
        required={required}
        aria-invalid={touched && !!error}
        aria-describedby={touched && error ? errorId : undefined}
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
          setTouched(true);
          validate(event.currentTarget);
        }}
        onInvalid={() => setTouched(true)}
      />
      {touched && error && (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      )}
    </>
  );
}
