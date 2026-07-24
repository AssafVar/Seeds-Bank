import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { InlineSpinner } from "../common/Spinner.jsx";

const emptyEntry = { workerId: "", workDate: "", hoursWorked: "" };
const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// Unlike FieldTimeline (purely presentational off the already-loaded Field
// object), work logs aren't part of FieldDto - this owns its own fetch,
// scoped to whichever sub-field is currently selected.
function FieldLaborTab({ fieldId, workers, onGetWorkLogs, onCreateWorkLog, onDeleteWorkLog }) {
  const [logs, setLogs] = useState(null);
  const [entry, setEntry] = useState(emptyEntry);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);

  useEffect(() => {
    setLogs(null);
    setEntry(emptyEntry);
    setError("");
    onGetWorkLogs(fieldId).then((data) => setLogs(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  const handleAddLog = async () => {
    const hours = Number(entry.hoursWorked);
    if (!entry.workerId || !entry.workDate || !(hours > 0)) {
      setError("Pick a worker, a date, and positive hours");
      return;
    }

    setIsSaving(true);
    const created = await onCreateWorkLog(fieldId, {
      workerId: Number(entry.workerId),
      workDate: entry.workDate,
      hoursWorked: hours,
    });
    setIsSaving(false);
    if (created) {
      setLogs((prev) => [created, ...prev]);
      setEntry(emptyEntry);
      setError("");
    } else {
      setError("Failed to log hours");
    }
  };

  const handleDeleteLog = async (logId) => {
    setDeletingLogId(logId);
    const success = await onDeleteWorkLog(fieldId, logId);
    setDeletingLogId(null);
    if (success) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    }
  };

  if (logs === null) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", p: 4 }}>
        <InlineSpinner size={24} />
      </Box>
    );
  }

  const totalHours = logs.reduce((sum, l) => sum + l.hoursWorked, 0);
  const totalCost = logs.reduce((sum, l) => sum + l.cost, 0);

  return (
    <Box sx={{ p: 3, width: "100%", maxWidth: 560 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Labor
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="labor-worker-label">Worker</InputLabel>
          <Select
            labelId="labor-worker-label"
            label="Worker"
            value={entry.workerId}
            onChange={(e) => setEntry({ ...entry, workerId: e.target.value })}
          >
            {workers.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
                {w.role ? ` (${w.role})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={entry.workDate}
            onChange={(e) => setEntry({ ...entry, workDate: e.target.value })}
          />
          <TextField
            label="Hours"
            type="number"
            fullWidth
            value={entry.hoursWorked}
            onChange={(e) => setEntry({ ...entry, hoursWorked: e.target.value })}
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="contained" onClick={handleAddLog} disabled={isSaving}>
            {isSaving ? <InlineSpinner size={20} /> : "Log hours"}
          </Button>
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {logs.map((log) => (
          <Box
            key={log.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {log.workerName} · {formatDate(log.workDate)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {log.hoursWorked}h × ${log.hourlyRateAtEntry}/h = ${log.cost.toFixed(2)}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => handleDeleteLog(log.id)} disabled={deletingLogId === log.id}>
              {deletingLogId === log.id ? <InlineSpinner size={16} /> : <DeleteIcon color="error" fontSize="small" />}
            </IconButton>
          </Box>
        ))}
        {logs.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No hours logged yet.
          </Typography>
        )}
      </Box>

      {logs.length > 0 && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          Total: <strong>{totalHours}h</strong> · <strong>${totalCost.toFixed(2)}</strong>
        </Typography>
      )}
    </Box>
  );
}

export default FieldLaborTab;
