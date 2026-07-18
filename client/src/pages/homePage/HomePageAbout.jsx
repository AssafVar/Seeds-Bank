import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';

const paragraphs = [
  "Welcome to our plant breeding application, where you can explore a world of possibilities for breeding the perfect plants.",
  "Our application offers a variety of tools and resources to help you develop and refine your plant breeding strategies, whether you're a professional breeder or just getting started.",
  "With our user-friendly interface, you can easily navigate through the different features and access the latest research and breeding techniques.",
  "Our application is designed to provide you with a comprehensive platform that will enable you to achieve your breeding goals, by providing you with the tools and resources you need to select the best traits and genetic material for your plants.",
  "We are excited to have you on board and look forward to helping you create the perfect plant varieties for your needs.",
];

function HomePageAbout() {
    return (
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About Seeds Bank
          </Typography>
          <Stack spacing={1.5}>
            {paragraphs.map((paragraph) => (
              <Typography key={paragraph} variant="body1">
                {paragraph}
              </Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
}

export default HomePageAbout;
