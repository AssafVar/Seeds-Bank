import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
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
  deleteGalleryImage,
  deleteNewsPost,
  getNews,
  getSiteContent,
  updateNewsPost,
  updateSiteContent,
  uploadGalleryImage,
} from "../../services/serverCalls";
import Spinner, { InlineSpinner } from "../../components/common/Spinner.jsx";

const emptyContent = {
  description: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  videoUrl: "",
};

function AdminPage() {
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

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [isSavingNewsPost, setIsSavingNewsPost] = useState(false);
  const [deletingNewsPostId, setDeletingNewsPostId] = useState(null);

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

  useEffect(() => {
    Promise.all([loadContent(), loadNews()]).then(() => setIsLoadingPage(false));
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
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
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
        </Grid>

        <Grid item xs={12} md={4}>
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
        </Grid>

        <Grid item xs={12} md={4}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {newsPosts.map((post) => (
                  <Box
                    key={post.id}
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
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {post.title}
                    </Typography>
                    <Box>
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
                    </Box>
                  </Box>
                ))}
                {newsPosts.length === 0 && (
                  <Typography variant="body2" sx={{ p: 2 }}>
                    No posts yet.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AdminPage;
