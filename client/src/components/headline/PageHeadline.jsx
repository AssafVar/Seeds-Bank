import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import React from 'react';

const imageUrl =
  "https://c.pxhere.com/photos/a6/1e/large_broad_leaf_plant_leaves_lush_colorful_green_nature_foliage_plant_large_leaves_green_clustered-969259.jpg!d";


function PageHeadline({title}) {
    return (
      <Box
        sx={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "8px",
          minHeight: { xs: 140, sm: 200 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h3"
          padding={2}
          textAlign="center"
          color="white"
          sx={{ fontSize: { xs: "1.75rem", sm: "3rem" }, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
        >
          {title}
        </Typography>
      </Box>
    );
}

export default PageHeadline;
