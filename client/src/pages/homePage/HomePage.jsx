import React, { useContext, useEffect, useState } from "react";
import authContext from "../../contexts/AuthContext";
import { Container } from "@mui/system";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import PageHeadline from "../../components/headline/PageHeadline";
import HomePageAbout from "./HomePageAbout";
import ContactSection from "./ContactSection";
import GallerySection from "./GallerySection";
import VideoSection from "./VideoSection";
import FeatureHighlights from "./FeatureHighlights";
import GettingStarted from "./GettingStarted";
import { getSiteContent } from "../../services/serverCalls";

function HomePage(props) {
  const { activeUser } = useContext(authContext);
  const welcomingTitle = activeUser?.userName
    ? `Welcome ${activeUser.userName}`
    : `Welcome new member`;

  const [siteContent, setSiteContent] = useState(null);

  useEffect(() => {
    getSiteContent().then((data) => data && setSiteContent(data));
  }, []);

  return (
    <Container>
      <PageHeadline title={welcomingTitle} />
      <GettingStarted />
      <FeatureHighlights />
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <HomePageAbout />
        </Grid>
      </Grid>
      {siteContent?.description && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body1">{siteContent.description}</Typography>
          </CardContent>
        </Card>
      )}
      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid item xs={12} md={4}>
          <ContactSection
            contactEmail={siteContent?.contactEmail}
            contactPhone={siteContent?.contactPhone}
            contactAddress={siteContent?.contactAddress}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <GallerySection images={siteContent?.images || []} />
        </Grid>
        <Grid item xs={12} md={4}>
          <VideoSection videoUrl={siteContent?.videoUrl} />
        </Grid>
      </Grid>
    </Container>
  );
}

export default HomePage;
