

export function readCamp3FileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
    reader.readAsArrayBuffer(file);
  });
}

export function readCamp3FileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
    reader.readAsText(file);
  });
}
