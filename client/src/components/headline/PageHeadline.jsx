import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import SpaIcon from '@mui/icons-material/Spa';
import React from 'react';

function PageHeadline({title}) {
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "12px",
          minHeight: { xs: 110, sm: 160 },
          display: "flex",
          alignItems: "center",
          px: { xs: 3, sm: 6 },
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            bgcolor: "secondary.main",
            opacity: 0.18,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            bgcolor: "secondary.main",
          }}
        />
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.5 }}>
          <SpaIcon sx={{ color: "secondary.main", fontSize: { xs: 28, sm: 36 } }} />
          <Typography
            variant="h3"
            color="white"
            fontWeight={700}
            sx={{ fontSize: { xs: "1.5rem", sm: "2.5rem" } }}
          >
            {title}
          </Typography>
        </Box>
      </Box>
    );
}

export default PageHeadline;
