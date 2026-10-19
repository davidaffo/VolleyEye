
export function FileImportInput({
  onFile,
  clearAfter = false,
  onError = console.error,
  ...props
}) {
  return (
    <input
      {...props}
      type="file"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          try {
            Promise.resolve(onFile(file)).catch(onError);
          } catch (error) {
            onError(error);
          }
        }
        if (clearAfter) event.target.value = "";
      }}
    />
  );
}
