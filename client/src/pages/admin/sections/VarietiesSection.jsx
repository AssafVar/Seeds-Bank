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
  createVegetableVariety,
  deleteVegetableVariety,
  getVegetableVarieties,
  updateVegetableVariety,
} from "../../../services/serverCalls";

const emptyForm = {
  name: "",
  plantSpacing: "",
  rowSpacing: "",
  waterMmPerSeason: "",
  fertilizerKgPer100m2: "",
  seedBufferPercent: "",
  seedUnit: "seeds",
};

const columns = [
  { key: "name", header: "Name" },
  { key: "plantSpacing", header: "Plant spacing", align: "right", render: (v) => `${v.plantSpacing}m` },
  { key: "rowSpacing", header: "Row spacing", align: "right", render: (v) => `${v.rowSpacing}m` },
  { key: "water", header: "Water", align: "right", render: (v) => `${v.waterMmPerSeason}mm` },
  { key: "fertilizer", header: "Fertilizer", align: "right", render: (v) => `${v.fertilizerKgPer100m2}kg/100m²` },
  {
    key: "seedBuffer",
    header: "Seed buffer",
    align: "right",
    render: (v) => `${Math.round(v.seedBufferPercent * 100)}%`,
  },
  { key: "seedUnit", header: "Seed unit" },
];

function VarietiesSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [varieties, setVarieties] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    const data = await getVegetableVarieties();
    if (data) setVarieties(data);
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

  const handleEdit = (v) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      plantSpacing: String(v.plantSpacing),
      rowSpacing: String(v.rowSpacing),
      waterMmPerSeason: String(v.waterMmPerSeason),
      fertilizerKgPer100m2: String(v.fertilizerKgPer100m2),
      seedBufferPercent: String(Math.round(v.seedBufferPercent * 100)),
      seedUnit: v.seedUnit || "seeds",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const numericValues = [
      form.plantSpacing,
      form.rowSpacing,
      form.waterMmPerSeason,
      form.fertilizerKgPer100m2,
      form.seedBufferPercent,
    ].map(Number);
    if (!form.name || numericValues.some((v) => !(v >= 0))) {
      setMessage("Please fill in a name and non-negative numbers");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const payload = {
      name: form.name,
      plantSpacing: numericValues[0],
      rowSpacing: numericValues[1],
      waterMmPerSeason: numericValues[2],
      fertilizerKgPer100m2: numericValues[3],
      seedBufferPercent: numericValues[4] / 100,
      seedUnit: form.seedUnit || "seeds",
    };

    setIsSaving(true);
    if (editingId) {
      const success = await updateVegetableVariety(editingId, payload);
      setMessage(success ? "Saved" : "Failed to save");
      if (success) {
        await load();
        resetForm();
      }
    } else {
      const created = await createVegetableVariety(payload);
      setMessage(created ? "Added" : "Failed to add");
      if (created) {
        setVarieties([...varieties, created].sort((a, b) => a.name.localeCompare(b.name)));
        resetForm();
      }
    }
    setIsSaving(false);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const success = await deleteVegetableVariety(id);
    setDeletingId(null);
    if (success) {
      setVarieties(varieties.filter((v) => v.id !== id));
      if (editingId === id) resetForm();
    }
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
          title="Vegetable varieties"
          description="Powers the variety dropdown and materials estimate everywhere in the app."
          buttonLabel="New variety"
          onAdd={handleAdd}
        />
        <CrudTable
          columns={columns}
          rows={varieties}
          getRowId={(v) => v.id}
          getRowLabel={(v) => v.name}
          selectedId={editingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
          emptyText="No varieties yet."
        />
        <FormDialog
          open={dialogOpen}
          onClose={resetForm}
          title={editingId ? "Edit variety" : "New variety"}
          message={message}
          onSave={handleSave}
          saveLabel={editingId ? "Save" : "Add"}
          saving={isSaving}
          saveDisabled={!form.name || isSaving}
        >
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Plant spacing (m)"
              type="number"
              fullWidth
              value={form.plantSpacing}
              onChange={(e) => setForm({ ...form, plantSpacing: e.target.value })}
            />
            <TextField
              label="Row spacing (m)"
              type="number"
              fullWidth
              value={form.rowSpacing}
              onChange={(e) => setForm({ ...form, rowSpacing: e.target.value })}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Water (mm/season)"
              type="number"
              fullWidth
              value={form.waterMmPerSeason}
              onChange={(e) => setForm({ ...form, waterMmPerSeason: e.target.value })}
            />
            <TextField
              label="Fertilizer (kg/100m²)"
              type="number"
              fullWidth
              value={form.fertilizerKgPer100m2}
              onChange={(e) => setForm({ ...form, fertilizerKgPer100m2: e.target.value })}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Seed buffer (%)"
              type="number"
              fullWidth
              value={form.seedBufferPercent}
              onChange={(e) => setForm({ ...form, seedBufferPercent: e.target.value })}
            />
            <TextField
              label="Seed unit"
              fullWidth
              value={form.seedUnit}
              onChange={(e) => setForm({ ...form, seedUnit: e.target.value })}
            />
          </Box>
        </FormDialog>
      </CardContent>
    </Card>
  );
}

export default VarietiesSection;
