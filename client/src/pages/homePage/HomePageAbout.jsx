import { Typography } from '@mui/material';
import { Box } from '@mui/system';
import React from 'react';

function HomePageAbout(props) {
    return (
        <Box
        style={{
          border: "1px black solid",
          borderRadius: "5px",
          padding: "12px",
        }}
      >
        <Typography variant="body1">
          Welcome to our plant breeding application, where you can explore a
          world of possibilities for breeding the perfect plants.
        </Typography>
        <br />
        <Typography variant="body1">
          Our application offers a variety of tools and resources to help
          you develop and refine your plant breeding strategies, whether
          you're a professional breeder or just getting started.
        </Typography>
        <br />
        <Typography variant="body1">
          With our user-friendly interface, you can easily navigate through
          the different features and access the latest research and breeding
          techniques.
        </Typography>
        <br />
        <Typography variant="body1">
          Our application is designed to provide you with a comprehensive
          platform that will enable you to achieve your breeding goals, by
          providing you with the tools and resources you need to select the
          best traits and genetic material for your plants.
        </Typography>
        <br />
        <Typography variant="body1">
          We are excited to have you on board and look forward to helping
          you create the perfect plant varieties for your needs.
        </Typography>
        <br />
      </Box>
    );
}

export default HomePageAbout;