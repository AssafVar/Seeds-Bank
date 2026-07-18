import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { getEmbedUrl } from "../../libs/video";

function VideoSection({ videoUrl }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Video
        </Typography>
        {videoUrl ? (
          <Box sx={{ position: "relative", pt: "56.25%" }}>
            <iframe
              src={getEmbedUrl(videoUrl)}
              title="Seeds Bank video"
              frameBorder="0"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No video yet.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default VideoSection;
