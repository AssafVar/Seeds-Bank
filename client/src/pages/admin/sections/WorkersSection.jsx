import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import CrudTable from "../../../components/admin/CrudTable.jsx";
import FormDialog from "../../../components/admin/FormDialog.jsx";
import SectionHeader from "../../../components/admin/SectionHeader.jsx";
import Spinner from "../../../components/common/Spinner.jsx";
import {
  createWorker,
  deleteWorker,
  extractErrorMessage,
  getWorkers,
  updateWorker,
} from "../../../services/serverCalls";

const emptyForm = { name: "", role: "", hourlyRate: "" };

const columns = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role", render: (w) => w.role || "—" },
  { key: "hourlyRate", header: "Hourly rate", align: "right", render: (w) => `$${w.hourlyRate}/h` },
];

function WorkersSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    const data = await getWorkers();
    if (data) setWorkers(data);
  };

  useEffect(() => {
    load().then(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (w) => {
    setEditingId(w.id);
    setForm({ name: w.name, role: w.role || "", hourlyRate: String(w.hourlyRate) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const hourlyRate = Number(form.hourlyRate);
    if (!form.name || !(hourlyRate >= 0)) {
      setMessage("Please fill in a name and a non-negative rate");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const payload = { name: form.name, role: form.role || null, hourlyRate };

    setIsSaving(true);
    if (editingId) {
      const success = await updateWorker(editingId, payload);
      setMessage(success ? "Saved" : "Failed to save");
      if (success) {
        await load();
        resetForm();
      }
    } else {
      const created = await createWorker(payload);
      setMessage(created ? "Added" : "Failed to add");
      if (created) {
        setWorkers([...workers, created].sort((a, b) => a.name.localeCompare(b.name)));
        resetForm();
      }
    }
    setIsSaving(false);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const success = await deleteWorker(id);
      if (success) {
        setWorkers(workers.filter((w) => w.id !== id));
        if (editingId === id) resetForm();
      }
    } catch (err) {
      // Deleting a worker who already has logged hours is a real, expected
      // outcome here (unlike varieties, where a blocked delete would be
      // unusual) - surface the server's message instead of failing silently.
      setMessage(extractErrorMessage(err));
      setTimeout(() => setMessage(""), 3000);
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <SectionHeader
          title="Workers"
          description="Shared roster used for logging hours/cost against a field's Labor tab."
          buttonLabel="New worker"
          onAdd={handleAdd}
        />
        <CrudTable
          columns={columns}
          rows={workers}
          getRowId={(w) => w.id}
          getRowLabel={(w) => w.name}
          selectedId={editingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
          emptyText="No workers yet."
        />
        <FormDialog
          open={dialogOpen}
          onClose={resetForm}
          title={editingId ? "Edit worker" : "New worker"}
          message={message}
          onSave={handleSave}
          saveLabel={editingId ? "Save" : "Add"}
          saving={isSaving}
          saveDisabled={!form.name || isSaving}
        >
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Role (optional)"
              fullWidth
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
            <TextField
              label="Hourly rate"
              type="number"
              fullWidth
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            />
          </Box>
        </FormDialog>
      </CardContent>
    </Card>
  );
}

export default WorkersSection;
