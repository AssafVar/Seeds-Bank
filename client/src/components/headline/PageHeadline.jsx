import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import React from 'react';

const imageUrl =
  "https://c.pxhere.com/photos/a6/1e/large_broad_leaf_plant_leaves_lush_colorful_green_nature_foliage_plant_large_leaves_green_clustered-969259.jpg!d";


function PageHeadline({title}) {
    return (
      <Box
        sx={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover" }}
      >
        <Typography variant="h3" padding={5} margin={"3rem 0"} color={"white"}>
          {title}
        </Typography>
      </Box>
    );
}

export default PageHeadline;