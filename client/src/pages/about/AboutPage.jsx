import { Button, Card, CardMedia, Grid, Typography } from "@mui/material";
import { Container } from "@mui/system";
import React, { useState } from "react";
import PageHeadline from "../../components/headline/PageHeadline";

function AboutPage(props) {

  const [readMore, setReadMore] = useState(false);

  return (
    <Container>
      <PageHeadline title="About Us"/>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="body1">
            Our application is a software tool that helps plant breeders manage
            and organize their breeding programs.
          </Typography>
          <Typography variant="body1">
            With the aid of SeedsBank, breeders can maintain a comprehensive
            database of their plants, including their pedigree, genotype, and
            phenotype information. They can track each plant's lineage and use
            this information to determine the optimal breeding pairs to produce
            desired traits in their offspring.
          </Typography>
          <br />
          {readMore && (
            <>
              <Typography variant="body1">
                {" "}
                SeedsBank application also includes tools for managing plant
                health records, such as disease resistance, susceptibility, and
                environmental tolerance. This information can be used to ensure
                that the breeding program produces healthy plants with desirable
                traits.
              </Typography>
              <Typography variant="body1">
                {" "}
                In addition, it provides features for tracking plant performance
                metrics, such as yield, quality, and growth rate. This
                information can help breeders make informed decisions about
                which plants to keep for breeding and which ones to discard.
              </Typography>
              <br />
              <Typography variant="body1">
                {" "}
                One of the main benefits of a plant breeding application is that
                it can help breeders streamline their breeding program, by
                allowing them to quickly and easily identify plants with
                desirable traits and select optimal breeding pairs.
              </Typography>
              <Typography variant="body1">
                {" "}
                This can help save time, reduce costs, and increase the
                likelihood of producing high-quality plants with desirable
                traits.
              </Typography>
              <Typography variant="body1">
                <br /> Overall, SeedsBank application can be a powerful tool for
                plant breeders, helping them to manage and optimize their
                breeding programs, and ultimately produce better, more
                resilient, and more productive plants.
              </Typography>
              <Typography variant="body1">
                {" "}
                The purpose of a plant breeding application is to enable
                breeders to keep track of their plants' genetic traits, monitor
                their health and performance, and make informed decisions about
                breeding.
              </Typography><br/>
            </>
          )}
          <Button onClick={() => setReadMore(!readMore)} style={{borderRadius:"5px", }} variant="contained" color="success">
            {!readMore ? "More Info" : "Less Info"}
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              image="https://pxhere.com/en/photo/1130736?utm_content=shareClip&utm_medium=referral&utm_source=pxhere"
              title="About Us Image"
            />
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AboutPage;
