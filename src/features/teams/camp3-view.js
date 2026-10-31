import { getCamp3RowKind } from "./imports/camp3-model.js";
import { camp3ConfirmStore } from "../../state/roster-import-store.mjs";

export function publishCamp3ConfirmView(draft) {
  const map = (row) =>
    Object.freeze({
      ...row,
      kind: getCamp3RowKind(row),
      onRemove: () => {
        row.enabled = false;
        publishCamp3ConfirmView(draft);
      },
      onChange: (field, value) => {
        if (
          !["number", "lastName", "firstName", "role", "isCaptain"].includes(
            field,
          )
        )
          return;
        if (field === "isCaptain" && value)
          (draft.rows || []).forEach((other) => {
            if (other) other.isCaptain = other.id === row.id;
          });
        else row[field] = value;
        publishCamp3ConfirmView(draft);
      },
    });
  camp3ConfirmStore.publish({
    rows: Object.freeze(
      (draft.rows || []).filter((row) => row && row.enabled).map(map),
    ),
    outRows: Object.freeze(
      (draft.outRows || []).filter((row) => row && row.enabled).map(map),
    ),
  });
}

export function setCamp3ConfirmOpen(open) {
  camp3ConfirmStore.publish({ open });
}
