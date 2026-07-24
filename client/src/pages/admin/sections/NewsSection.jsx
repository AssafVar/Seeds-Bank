import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CrudTable from "../../../components/admin/CrudTable.jsx";
import FormDialog from "../../../components/admin/FormDialog.jsx";
import SectionHeader from "../../../components/admin/SectionHeader.jsx";
import Spinner from "../../../components/common/Spinner.jsx";
import { createNewsPost, deleteNewsPost, getNews, updateNewsPost } from "../../../services/serverCalls";

const emptyForm = { title: "", body: "" };

const columns = [
  {
    key: "title",
    header: "Title",
    cellSx: { maxWidth: 160 },
    render: (post) => (
      <Typography variant="body2" noWrap>
        {post.title}
      </Typography>
    ),
  },
  {
    key: "body",
    header: "Body",
    cellSx: { maxWidth: 280 },
    render: (post) => (
      <Typography variant="body2" noWrap>
        {post.body}
      </Typography>
    ),
  },
];

function NewsSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    const data = await getNews();
    if (data) setPosts(data);
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

  const handleEdit = (post) => {
    setEditingId(post.id);
    setForm({ title: post.title, body: post.body });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.body) return;
    setIsSaving(true);
    if (editingId) {
      const success = await updateNewsPost(editingId, form.title, form.body);
      setMessage(success ? "Saved" : "Failed to save");
      if (success) {
        await load();
        resetForm();
      }
    } else {
      const created = await createNewsPost(form.title, form.body);
      setMessage(created ? "Published" : "Failed to publish");
      if (created) {
        setPosts([created, ...posts]);
        resetForm();
      }
    }
    setIsSaving(false);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const success = await deleteNewsPost(id);
    setDeletingId(null);
    if (success) {
      setPosts(posts.filter((post) => post.id !== id));
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
        <SectionHeader title="News posts" buttonLabel="New post" onAdd={handleAdd} />
        <CrudTable
          columns={columns}
          rows={posts}
          getRowId={(post) => post.id}
          selectedId={editingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
          emptyText="No posts yet."
        />
        <FormDialog
          open={dialogOpen}
          onClose={resetForm}
          title={editingId ? "Edit post" : "New post"}
          message={message}
          onSave={handleSave}
          saveLabel={editingId ? "Save" : "Publish"}
          saving={isSaving}
          saveDisabled={!form.title || !form.body || isSaving}
        >
          <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField
            label="Body"
            multiline
            minRows={3}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </FormDialog>
      </CardContent>
    </Card>
  );
}

export default NewsSection;
