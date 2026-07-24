import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { InlineSpinner } from "../common/Spinner.jsx";

// Generic table for the Admin page's create/edit/delete sections (News,
// Vegetable varieties, Workers) - the caller supplies the columns and rows,
// only the table chrome, the edit/delete actions column, and the delete
// confirmation gate are shared.
function CrudTable({ columns, rows, getRowId, getRowLabel, selectedId, onEdit, onDelete, deletingId, emptyText }) {
  const [confirmId, setConfirmId] = useState(null);

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ p: 2 }}>
        {emptyText}
      </Typography>
    );
  }

  const confirmRow = confirmId != null ? rows.find((row) => getRowId(row) === confirmId) : null;

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align}>
                  {col.header}
                </TableCell>
              ))}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow key={id} selected={selectedId === id}>
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align} sx={col.cellSx}>
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setConfirmId(id)} disabled={deletingId === id}>
                      {deletingId === id ? (
                        <InlineSpinner size={16} />
                      ) : (
                        <DeleteIcon color="error" fontSize="small" />
                      )}
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={confirmId != null}
        title="Delete this row?"
        message={
          confirmRow && getRowLabel
            ? `Delete "${getRowLabel(confirmRow)}"? This can't be undone.`
            : "This can't be undone."
        }
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          onDelete(confirmId);
          setConfirmId(null);
        }}
      />
    </>
  );
}

export default CrudTable;
