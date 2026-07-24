import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Container } from "@mui/system";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PageHeadline from "../../components/headline/PageHeadline";
import {
  SERVER_BASE_URL,
  createNewsPost,
  createVegetableVariety,
  createWorker,
  deleteGalleryImage,
  deleteNewsPost,
  deleteVegetableVariety,
  deleteWorker,
  extractErrorMessage,
  getNews,
  getSiteContent,
  getVegetableVarieties,
  getWorkers,
  updateNewsPost,
  updateSiteContent,
  updateVegetableVariety,
  updateWorker,
  uploadGalleryImage,
} from "../../services/serverCalls";
import Spinner, { InlineSpinner } from "../../components/common/Spinner.jsx";

const SECTIONS = [
  { id: "content", label: "Home page content" },
  { id: "gallery", label: "Picture gallery" },
  { id: "news", label: "News posts" },
  { id: "varieties", label: "Vegetable varieties" },
  { id: "workers", label: "Workers" },
];

const emptyContent = {
  description: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  videoUrl: "",
};

const emptyVarietyForm = {
  name: "",
  plantSpacing: "",
  rowSpacing: "",
  waterMmPerSeason: "",
  fertilizerKgPer100m2: "",
  seedBufferPercent: "",
  seedUnit: "seeds",
};

const emptyWorkerForm = { name: "", role: "", hourlyRate: "" };

function AdminPage() {
  const [activeSection, setActiveSection] = useState("content");

  const [content, setContent] = useState(emptyContent);
  const [images, setImages] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [newsPosts, setNewsPosts] = useState([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [newsMessage, setNewsMessage] = useState("");

  const [varieties, setVarieties] = useState([]);
  const [varietyForm, setVarietyForm] = useState(emptyVarietyForm);
  const [editingVarietyId, setEditingVarietyId] = useState(null);
  const [varietyMessage, setVarietyMessage] = useState("");

  const [workers, setWorkers] = useState([]);
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [workerMessage, setWorkerMessage] = useState("");

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [isSavingNewsPost, setIsSavingNewsPost] = useState(false);
  const [deletingNewsPostId, setDeletingNewsPostId] = useState(null);
  const [isSavingVariety, setIsSavingVariety] = useState(false);
  const [deletingVarietyId, setDeletingVarietyId] = useState(null);
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [deletingWorkerId, setDeletingWorkerId] = useState(null);

  const loadContent = async () => {
    const data = await getSiteContent();
    if (data) {
      setContent({
        description: data.description || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        contactAddress: data.contactAddress || "",
        videoUrl: data.videoUrl || "",
      });
      setImages(data.images || []);
    }
  };

  const loadNews = async () => {
    const data = await getNews();
    if (data) {
      setNewsPosts(data);
    }
  };

  const loadVarieties = async () => {
    const data = await getVegetableVarieties();
    if (data) {
      setVarieties(data);
    }
  };

  const loadWorkers = async () => {
    const data = await getWorkers();
    if (data) {
      setWorkers(data);
    }
  };

  useEffect(() => {
    Promise.all([loadContent(), loadNews(), loadVarieties(), loadWorkers()]).then(() => setIsLoadingPage(false));
  }, []);

  const handleFieldChange = (field) => (e) => {
    setContent({ ...content, [field]: e.target.value });
  };

  const handleSave = async () => {
    setIsSavingContent(true);
    const success = await updateSiteContent(content);
    setIsSavingContent(false);
    setSaveMessage(success ? "Saved" : "Failed to save");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    const uploaded = await uploadGalleryImage(selectedFile, caption);
    setIsUploading(false);
    if (uploaded) {
      setImages([uploaded, ...images]);
      setSelectedFile(null);
      setCaption("");
      setUploadMessage("Uploaded");
    } else {
      setUploadMessage("Upload failed");
    }
    setTimeout(() => setUploadMessage(""), 2000);
  };

  const handleDeleteImage = async (imageId) => {
    setDeletingImageId(imageId);
    const success = await deleteGalleryImage(imageId);
    setDeletingImageId(null);
    if (success) {
      setImages(images.filter((image) => image.id !== imageId));
    }
  };

  const resetNewsForm = () => {
    setEditingPostId(null);
    setNewsTitle("");
    setNewsBody("");
  };

  const handleEditPost = (post) => {
    setEditingPostId(post.id);
    setNewsTitle(post.title);
    setNewsBody(post.body);
  };

  const handleSaveNewsPost = async () => {
    if (!newsTitle || !newsBody) return;
    setIsSavingNewsPost(true);
    if (editingPostId) {
      const success = await updateNewsPost(editingPostId, newsTitle, newsBody);
      setNewsMessage(success ? "Saved" : "Failed to save");
      if (success) {
        await loadNews();
        resetNewsForm();
      }
    } else {
      const created = await createNewsPost(newsTitle, newsBody);
      setNewsMessage(created ? "Published" : "Failed to publish");
      if (created) {
        setNewsPosts([created, ...newsPosts]);
        resetNewsForm();
      }
    }
    setIsSavingNewsPost(false);
    setTimeout(() => setNewsMessage(""), 2000);
  };

  const handleDeleteNewsPost = async (id) => {
    setDeletingNewsPostId(id);
    const success = await deleteNewsPost(id);
    setDeletingNewsPostId(null);
    if (success) {
      setNewsPosts(newsPosts.filter((post) => post.id !== id));
      if (editingPostId === id) {
        resetNewsForm();
      }
    }
  };

  const resetVarietyForm = () => {
    setEditingVarietyId(null);
    setVarietyForm(emptyVarietyForm);
  };

  const handleEditVariety = (v) => {
    setEditingVarietyId(v.id);
    setVarietyForm({
      name: v.name,
      plantSpacing: String(v.plantSpacing),
      rowSpacing: String(v.rowSpacing),
      waterMmPerSeason: String(v.waterMmPerSeason),
      fertilizerKgPer100m2: String(v.fertilizerKgPer100m2),
      seedBufferPercent: String(Math.round(v.seedBufferPercent * 100)),
      seedUnit: v.seedUnit || "seeds",
    });
  };

  const handleSaveVariety = async () => {
    const numericValues = [
      varietyForm.plantSpacing,
      varietyForm.rowSpacing,
      varietyForm.waterMmPerSeason,
      varietyForm.fertilizerKgPer100m2,
      varietyForm.seedBufferPercent,
    ].map(Number);
    if (!varietyForm.name || numericValues.some((v) => !(v >= 0))) {
      setVarietyMessage("Please fill in a name and non-negative numbers");
      setTimeout(() => setVarietyMessage(""), 2000);
      return;
    }

    const payload = {
      name: varietyForm.name,
      plantSpacing: numericValues[0],
      rowSpacing: numericValues[1],
      waterMmPerSeason: numericValues[2],
      fertilizerKgPer100m2: numericValues[3],
      seedBufferPercent: numericValues[4] / 100,
      seedUnit: varietyForm.seedUnit || "seeds",
    };

    setIsSavingVariety(true);
    if (editingVarietyId) {
      const success = await updateVegetableVariety(editingVarietyId, payload);
      setVarietyMessage(success ? "Saved" : "Failed to save");
      if (success) {
        await loadVarieties();
        resetVarietyForm();
      }
    } else {
      const created = await createVegetableVariety(payload);
      setVarietyMessage(created ? "Added" : "Failed to add");
      if (created) {
        setVarieties([...varieties, created].sort((a, b) => a.name.localeCompare(b.name)));
        resetVarietyForm();
      }
    }
    setIsSavingVariety(false);
    setTimeout(() => setVarietyMessage(""), 2000);
  };

  const handleDeleteVariety = async (id) => {
    setDeletingVarietyId(id);
    const success = await deleteVegetableVariety(id);
    setDeletingVarietyId(null);
    if (success) {
      setVarieties(varieties.filter((v) => v.id !== id));
      if (editingVarietyId === id) {
        resetVarietyForm();
      }
    }
  };

  const resetWorkerForm = () => {
    setEditingWorkerId(null);
    setWorkerForm(emptyWorkerForm);
  };

  const handleEditWorker = (w) => {
    setEditingWorkerId(w.id);
    setWorkerForm({
      name: w.name,
      role: w.role || "",
      hourlyRate: String(w.hourlyRate),
    });
  };

  const handleSaveWorker = async () => {
    const hourlyRate = Number(workerForm.hourlyRate);
    if (!workerForm.name || !(hourlyRate >= 0)) {
      setWorkerMessage("Please fill in a name and a non-negative rate");
      setTimeout(() => setWorkerMessage(""), 2000);
      return;
    }

    const payload = {
      name: workerForm.name,
      role: workerForm.role || null,
      hourlyRate,
    };

    setIsSavingWorker(true);
    if (editingWorkerId) {
      const success = await updateWorker(editingWorkerId, payload);
      setWorkerMessage(success ? "Saved" : "Failed to save");
      if (success) {
        await loadWorkers();
        resetWorkerForm();
      }
    } else {
      const created = await createWorker(payload);
      setWorkerMessage(created ? "Added" : "Failed to add");
      if (created) {
        setWorkers([...workers, created].sort((a, b) => a.name.localeCompare(b.name)));
        resetWorkerForm();
      }
    }
    setIsSavingWorker(false);
    setTimeout(() => setWorkerMessage(""), 2000);
  };

  const handleDeleteWorker = async (id) => {
    setDeletingWorkerId(id);
    try {
      const success = await deleteWorker(id);
      if (success) {
        setWorkers(workers.filter((w) => w.id !== id));
        if (editingWorkerId === id) {
          resetWorkerForm();
        }
      }
    } catch (err) {
      // Deleting a worker who already has logged hours is a real, expected
      // outcome here (unlike varieties, where a blocked delete would be
      // unusual) - surface the server's message instead of failing silently.
      setWorkerMessage(extractErrorMessage(err));
      setTimeout(() => setWorkerMessage(""), 3000);
    }
    setDeletingWorkerId(null);
  };

  if (isLoadingPage) {
    return (
      <Container>
        <PageHeadline title="Admin" />
        <Spinner />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeadline title="Admin" />
      <Box sx={{ display: "flex", gap: 3, mt: 2, alignItems: "flex-start" }}>
        <List sx={{ width: 220, flexShrink: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, py: 0 }}>
          {SECTIONS.map((section) => (
            <ListItemButton
              key={section.id}
              selected={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
            >
              <ListItemText primary={section.label} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {activeSection === "content" && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Home page content
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Description"
                    multiline
                    minRows={3}
                    value={content.description}
                    onChange={handleFieldChange("description")}
                  />
                  <TextField
                    label="Contact email"
                    value={content.contactEmail}
                    onChange={handleFieldChange("contactEmail")}
                  />
                  <TextField
                    label="Contact phone"
                    value={content.contactPhone}
                    onChange={handleFieldChange("contactPhone")}
                  />
                  <TextField
                    label="Contact address"
                    value={content.contactAddress}
                    onChange={handleFieldChange("contactAddress")}
                  />
                  <TextField
                    label="Video URL"
                    helperText="YouTube/Vimeo link or a direct video URL"
                    value={content.videoUrl}
                    onChange={handleFieldChange("videoUrl")}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button variant="contained" onClick={handleSave} disabled={isSavingContent}>
                      {isSavingContent ? <InlineSpinner size={20} /> : "Save"}
                    </Button>
                    {saveMessage && <Typography variant="body2">{saveMessage}</Typography>}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeSection === "gallery" && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Picture gallery
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <TextField
                    label="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button variant="contained" onClick={handleUpload} disabled={!selectedFile || isUploading}>
                      {isUploading ? <InlineSpinner size={20} /> : "Upload"}
                    </Button>
                    {uploadMessage && <Typography variant="body2">{uploadMessage}</Typography>}
                  </Box>
                </Box>
                <Grid container spacing={1}>
                  {images.map((image) => (
                    <Grid item xs={6} sm={4} key={image.id}>
                      <Box sx={{ position: "relative" }}>
                        <img
                          src={`${SERVER_BASE_URL}${image.url}`}
                          alt={image.caption || "Gallery"}
                          style={{ width: "100%", borderRadius: 4 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={deletingImageId === image.id}
                          sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            bgcolor: "background.paper",
                          }}
                        >
                          {deletingImageId === image.id ? (
                            <InlineSpinner size={16} />
                          ) : (
                            <DeleteIcon color="error" fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                  {images.length === 0 && (
                    <Typography variant="body2" sx={{ p: 2 }}>
                      No photos uploaded yet.
                    </Typography>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {activeSection === "news" && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  News posts
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
                  <TextField
                    label="Title"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                  />
                  <TextField
                    label="Body"
                    multiline
                    minRows={3}
                    value={newsBody}
                    onChange={(e) => setNewsBody(e.target.value)}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveNewsPost}
                      disabled={!newsTitle || !newsBody || isSavingNewsPost}
                    >
                      {isSavingNewsPost ? (
                        <InlineSpinner size={20} />
                      ) : editingPostId ? (
                        "Save"
                      ) : (
                        "Publish"
                      )}
                    </Button>
                    {editingPostId && <Button onClick={resetNewsForm}>Cancel</Button>}
                    {newsMessage && <Typography variant="body2">{newsMessage}</Typography>}
                  </Box>
                </Box>
                {newsPosts.length === 0 ? (
                  <Typography variant="body2" sx={{ p: 2 }}>
                    No posts yet.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>Body</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {newsPosts.map((post) => (
                          <TableRow key={post.id} selected={editingPostId === post.id}>
                            <TableCell sx={{ maxWidth: 160 }}>
                              <Typography variant="body2" noWrap>
                                {post.title}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 280 }}>
                              <Typography variant="body2" noWrap>
                                {post.body}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => handleEditPost(post)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteNewsPost(post.id)}
                                disabled={deletingNewsPostId === post.id}
                              >
                                {deletingNewsPostId === post.id ? (
                                  <InlineSpinner size={16} />
                                ) : (
                                  <DeleteIcon color="error" fontSize="small" />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "varieties" && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vegetable varieties
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Powers the variety dropdown and materials estimate everywhere in the app.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
                  <TextField
                    label="Name"
                    value={varietyForm.name}
                    onChange={(e) => setVarietyForm({ ...varietyForm, name: e.target.value })}
                  />
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Plant spacing (m)"
                      type="number"
                      fullWidth
                      value={varietyForm.plantSpacing}
                      onChange={(e) => setVarietyForm({ ...varietyForm, plantSpacing: e.target.value })}
                    />
                    <TextField
                      label="Row spacing (m)"
                      type="number"
                      fullWidth
                      value={varietyForm.rowSpacing}
                      onChange={(e) => setVarietyForm({ ...varietyForm, rowSpacing: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Water (mm/season)"
                      type="number"
                      fullWidth
                      value={varietyForm.waterMmPerSeason}
                      onChange={(e) => setVarietyForm({ ...varietyForm, waterMmPerSeason: e.target.value })}
                    />
                    <TextField
                      label="Fertilizer (kg/100m²)"
                      type="number"
                      fullWidth
                      value={varietyForm.fertilizerKgPer100m2}
                      onChange={(e) => setVarietyForm({ ...varietyForm, fertilizerKgPer100m2: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Seed buffer (%)"
                      type="number"
                      fullWidth
                      value={varietyForm.seedBufferPercent}
                      onChange={(e) => setVarietyForm({ ...varietyForm, seedBufferPercent: e.target.value })}
                    />
                    <TextField
                      label="Seed unit"
                      fullWidth
                      value={varietyForm.seedUnit}
                      onChange={(e) => setVarietyForm({ ...varietyForm, seedUnit: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveVariety}
                      disabled={!varietyForm.name || isSavingVariety}
                    >
                      {isSavingVariety ? (
                        <InlineSpinner size={20} />
                      ) : editingVarietyId ? (
                        "Save"
                      ) : (
                        "Add"
                      )}
                    </Button>
                    {editingVarietyId && <Button onClick={resetVarietyForm}>Cancel</Button>}
                    {varietyMessage && <Typography variant="body2">{varietyMessage}</Typography>}
                  </Box>
                </Box>
                {varieties.length === 0 ? (
                  <Typography variant="body2" sx={{ p: 2 }}>
                    No varieties yet.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Plant spacing</TableCell>
                          <TableCell align="right">Row spacing</TableCell>
                          <TableCell align="right">Water</TableCell>
                          <TableCell align="right">Fertilizer</TableCell>
                          <TableCell align="right">Seed buffer</TableCell>
                          <TableCell>Seed unit</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {varieties.map((v) => (
                          <TableRow key={v.id} selected={editingVarietyId === v.id}>
                            <TableCell>{v.name}</TableCell>
                            <TableCell align="right">{v.plantSpacing}m</TableCell>
                            <TableCell align="right">{v.rowSpacing}m</TableCell>
                            <TableCell align="right">{v.waterMmPerSeason}mm</TableCell>
                            <TableCell align="right">{v.fertilizerKgPer100m2}kg/100m²</TableCell>
                            <TableCell align="right">{Math.round(v.seedBufferPercent * 100)}%</TableCell>
                            <TableCell>{v.seedUnit}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => handleEditVariety(v)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteVariety(v.id)}
                                disabled={deletingVarietyId === v.id}
                              >
                                {deletingVarietyId === v.id ? (
                                  <InlineSpinner size={16} />
                                ) : (
                                  <DeleteIcon color="error" fontSize="small" />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "workers" && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Workers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Shared roster used for logging hours/cost against a field's Labor tab.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
                  <TextField
                    label="Name"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                  />
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Role (optional)"
                      fullWidth
                      value={workerForm.role}
                      onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                    />
                    <TextField
                      label="Hourly rate"
                      type="number"
                      fullWidth
                      value={workerForm.hourlyRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, hourlyRate: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveWorker}
                      disabled={!workerForm.name || isSavingWorker}
                    >
                      {isSavingWorker ? (
                        <InlineSpinner size={20} />
                      ) : editingWorkerId ? (
                        "Save"
                      ) : (
                        "Add"
                      )}
                    </Button>
                    {editingWorkerId && <Button onClick={resetWorkerForm}>Cancel</Button>}
                    {workerMessage && <Typography variant="body2">{workerMessage}</Typography>}
                  </Box>
                </Box>
                {workers.length === 0 ? (
                  <Typography variant="body2" sx={{ p: 2 }}>
                    No workers yet.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell align="right">Hourly rate</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workers.map((w) => (
                          <TableRow key={w.id} selected={editingWorkerId === w.id}>
                            <TableCell>{w.name}</TableCell>
                            <TableCell>{w.role || "—"}</TableCell>
                            <TableCell align="right">${w.hourlyRate}/h</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => handleEditWorker(w)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteWorker(w.id)}
                                disabled={deletingWorkerId === w.id}
                              >
                                {deletingWorkerId === w.id ? (
                                  <InlineSpinner size={16} />
                                ) : (
                                  <DeleteIcon color="error" fontSize="small" />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default AdminPage;
