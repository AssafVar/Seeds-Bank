import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import React from 'react';

function PageHeadline({title}) {
    return (
      <Box sx={{ mt: { xs: 1, sm: 2 }, mb: { xs: 3, sm: 5 } }}>
        <Typography
          variant="h3"
          color="text.primary"
          fontWeight={700}
          sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" } }}
        >
          {title}
        </Typography>
      </Box>
    );
}

export default PageHeadline;
