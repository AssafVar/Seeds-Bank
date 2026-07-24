import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Spinner, { InlineSpinner } from "../../../components/common/Spinner.jsx";
import { getSiteContent, updateSiteContent } from "../../../services/serverCalls";

const emptyContent = {
  description: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  videoUrl: "",
};

function HomeContentSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState(emptyContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    getSiteContent().then((data) => {
      if (data) {
        setContent({
          description: data.description || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          contactAddress: data.contactAddress || "",
          videoUrl: data.videoUrl || "",
        });
      }
      setIsLoading(false);
    });
  }, []);

  const handleFieldChange = (field) => (e) => {
    setContent({ ...content, [field]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateSiteContent(content);
    setIsSaving(false);
    setSaveMessage(success ? "Saved" : "Failed to save");
    setTimeout(() => setSaveMessage(""), 2000);
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
          <TextField label="Contact email" value={content.contactEmail} onChange={handleFieldChange("contactEmail")} />
          <TextField label="Contact phone" value={content.contactPhone} onChange={handleFieldChange("contactPhone")} />
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
            <Button variant="contained" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <InlineSpinner size={20} /> : "Save"}
            </Button>
            {saveMessage && <Typography variant="body2">{saveMessage}</Typography>}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default HomeContentSection;
