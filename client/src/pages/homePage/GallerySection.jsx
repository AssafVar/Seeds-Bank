import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

function GallerySection({ images }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Gallery
        </Typography>
        {images.length > 0 ? (
          <Grid container spacing={1}>
            {images.map((image) => (
              <Grid item xs={6} sm={4} key={image.id}>
                <img
                  src={image.url}
                  alt={image.caption || "Gallery"}
                  style={{ width: "100%", borderRadius: 4 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No photos yet.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default GallerySection;
