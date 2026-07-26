import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { classes } from "../../../styles/adminStyle.js";
import ConfirmDialog from "../../../components/admin/ConfirmDialog.jsx";
import Spinner, { InlineSpinner } from "../../../components/common/Spinner.jsx";
import {
  SERVER_BASE_URL,
  deleteGalleryImage,
  getSiteContent,
  uploadGalleryImage,
} from "../../../services/serverCalls";

function GallerySection() {
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [confirmImageId, setConfirmImageId] = useState(null);

  useEffect(() => {
    getSiteContent().then((data) => {
      if (data) setImages(data.images || []);
      setIsLoading(false);
    });
  }, []);

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

  if (isLoading) {
    return (
      <Box style={classes.sectionBox}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box style={classes.sectionBox}>
      <Typography variant="h6" gutterBottom>
        Picture gallery
      </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <TextField label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
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
                  onClick={() => setConfirmImageId(image.id)}
                  disabled={deletingImageId === image.id}
                  sx={{ position: "absolute", top: 0, right: 0, bgcolor: "background.paper" }}
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

        <ConfirmDialog
          open={confirmImageId != null}
          title="Delete this photo?"
          message="This can't be undone."
          onCancel={() => setConfirmImageId(null)}
          onConfirm={() => {
            handleDeleteImage(confirmImageId);
            setConfirmImageId(null);
          }}
        />
    </Box>
  );
}

export default GallerySection;
