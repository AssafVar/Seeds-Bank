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
import PageHeadline from "../../components/headline/PageHeadline";
import {
  SERVER_BASE_URL,
  deleteGalleryImage,
  getSiteContent,
  updateSiteContent,
  uploadGalleryImage,
} from "../../services/serverCalls";

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

  useEffect(() => {
    loadContent();
  }, []);

  const handleFieldChange = (field) => (e) => {
    setContent({ ...content, [field]: e.target.value });
  };

  const handleSave = async () => {
    const success = await updateSiteContent(content);
    setSaveMessage(success ? "Saved" : "Failed to save");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const uploaded = await uploadGalleryImage(selectedFile, caption);
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
    const success = await deleteGalleryImage(imageId);
    if (success) {
      setImages(images.filter((image) => image.id !== imageId));
    }
  };

  return (
    <Container>
      <PageHeadline title="Admin" />
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
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
                  <Button variant="contained" onClick={handleSave}>
                    Save
                  </Button>
                  {saveMessage && <Typography variant="body2">{saveMessage}</Typography>}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
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
                  <Button variant="contained" onClick={handleUpload} disabled={!selectedFile}>
                    Upload
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
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bgcolor: "background.paper",
                        }}
                      >
                        <DeleteIcon color="error" fontSize="small" />
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
      </Grid>
    </Container>
  );
}

export default AdminPage;
