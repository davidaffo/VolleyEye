self.onmessage = ({ data }) => {
  try {
    const match = JSON.stringify(data.snapshot.savedMatches[data.matchName]);
    const { savedMatches, ...rest } = data.snapshot;
    const prefix = JSON.stringify(rest);
    const snapshot = prefix.slice(0, -1) + (prefix.length > 2 ? "," : "") +
      '"savedMatches":{' + JSON.stringify(data.matchName) + ':' + match + '}}';
    self.postMessage({ id: data.id, snapshot, match });
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message || error) });
  }
};
