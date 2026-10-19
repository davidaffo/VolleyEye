
import { useEffect, useRef, useState } from "react";
export function EventControl({ model, onDone, commitOnBlur = false, onFocus }) {
  const [value, setValue] = useState(model.value),
    root = useRef(null),
    latest = useRef(model.value),
    committed = useRef(model.value);
  useEffect(() => {
    root.current?.querySelector("input,select")?.focus();
  }, []);
  const commit = (value) => {
    if (JSON.stringify(value) === JSON.stringify(committed.current)) return;
    committed.current = value;
    model.onChange(value);
  };
  const change = (value) => {
    latest.current = value;
    setValue(value);
    if (!commitOnBlur || model.type === "select" || model.type === "checkbox")
      commit(value);
  };
  const blur = () => {
    if (commitOnBlur) commit(latest.current);
    onDone?.();
  };
  const keydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(latest.current);
      onDone?.();
    }
  };
  const focus = (event) => onFocus?.(event.target);
  if (model.type === "time")
    return (
      <div ref={root} className="video-time-input" onFocus={focus}>
        {["H", "M", "S"].map((label, index) => (
          <label key={label} className="video-time-part">
            <span>{label}</span>
            <input
              type="number"
              min="0"
              max={index ? 59 : 23}
              step="1"
              value={value[index]}
              onChange={(event) =>
                change(
                  value.map((part, i) =>
                    i === index ? event.target.value : part,
                  ),
                )
              }
              onBlur={blur}
              onKeyDown={keydown}
            />
          </label>
        ))}
      </div>
    );
  return (
    <div ref={root} onFocus={focus}>
      {model.type === "select" ? (
        <select
          value={
            model.options.some(
              (option) => String(option.value) === String(value),
            )
              ? value
              : ""
          }
          onChange={(event) => change(event.target.value)}
          onBlur={blur}
        >
          {!model.options.some(
            (option) => String(option.value) === String(value),
          ) &&
            !model.options.some((option) => option.value === "") && (
              <option value="" hidden />
            )}
          {model.options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : model.type === "checkbox" ? (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(event) => change(event.target.checked)}
          onBlur={blur}
        />
      ) : (
        <input
          type={model.type}
          min={model.min}
          max={model.max}
          value={value}
          onChange={(event) => change(event.target.value)}
          onBlur={blur}
          onKeyDown={keydown}
        />
      )}
    </div>
  );
}
