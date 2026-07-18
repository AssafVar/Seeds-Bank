import { Card, CardContent, Grid, Typography } from "@mui/material";
import { Container } from "@mui/system";
import React from "react";
import PageHeadline from "../../components/headline/PageHeadline";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InsightsIcon from "@mui/icons-material/Insights";

const CAPABILITIES = [
  {
    icon: AccountTreeIcon,
    title: "Pedigree & trait tracking",
    description:
      "Keep a full record of each plant's pedigree, genotype, and phenotype, and trace its lineage generation by generation.",
  },
  {
    icon: CallSplitIcon,
    title: "Smart breeding pairs",
    description:
      "See which lines have gone stable and cross the ones most likely to produce the traits you're after.",
  },
  {
    icon: HealthAndSafetyIcon,
    title: "Health & performance records",
    description:
      "Track disease resistance, environmental tolerance, yield, and growth rate alongside every plant's data.",
  },
  {
    icon: InsightsIcon,
    title: "Streamlined decisions",
    description:
      "Spend less time on spreadsheets and more time breeding — spot desirable traits and act on them faster.",
  },
];

function AboutPage() {
  return (
    <Container>
      <PageHeadline title="About Us" />
      <Typography variant="h6" sx={{ mt: 2, maxWidth: 720 }}>
        SeedsBank helps plant breeders manage and organize their breeding
        programs — from a single seedling to a fully mapped pedigree.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
        Whether you're a professional breeder or just getting started, it
        gives you one place to track lineage, plan crosses, and make
        informed decisions about which plants to keep.
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {CAPABILITIES.map(({ icon: Icon, title, description }) => (
          <Grid item xs={12} sm={6} key={title}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent sx={{ display: "flex", gap: 2 }}>
                <Icon color="success" fontSize="large" sx={{ flexShrink: 0 }} />
                <div>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default AboutPage;
