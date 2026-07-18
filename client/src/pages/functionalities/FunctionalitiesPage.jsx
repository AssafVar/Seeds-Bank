import React from "react";
import { Container } from "@mui/system";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GrassIcon from "@mui/icons-material/Grass";
import VerifiedIcon from "@mui/icons-material/Verified";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import DevicesIcon from "@mui/icons-material/Devices";
import PageHeadline from "../../components/headline/PageHeadline";

const FUNCTIONALITIES = [
  {
    icon: GrassIcon,
    title: "Project & plant tracking",
    description:
      "Create a breeding project and log every plant in it: its line, generation, parentage, and fruit/seed traits, all in one place.",
  },
  {
    icon: VerifiedIcon,
    title: "Purity detection",
    description:
      "Once a line's traits stay the same across a couple of generations, it's automatically flagged as stable — a quick signal for which lines are ready to breed from.",
  },
  {
    icon: CallSplitIcon,
    title: "Crossing tool",
    description:
      "Pick any two plants in a project and cross them: a new record is created with both parents tracked, ready for you to fill in as it grows.",
  },
  {
    icon: WbSunnyIcon,
    title: "Climate explorer",
    description:
      "Look up hourly temperature, precipitation, and vapor pressure deficit for any location to plan around real growing conditions.",
  },
  {
    icon: DevicesIcon,
    title: "Works on any device",
    description:
      "The breeding data table adapts to your screen — a full table on desktop, stacked cards on your phone.",
  },
];

function FunctionalitiesPage() {
  return (
    <Container>
      <PageHeadline title="Why Seeds Bank" />
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 2, maxWidth: 720 }}>
        Here's what Seeds Bank actually does for your breeding program.
      </Typography>
      {FUNCTIONALITIES.map(({ icon: Icon, title, description }, index) => (
        <Accordion key={title} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Icon color="success" />
              <Typography variant="subtitle1" fontWeight="bold">
                {title}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
}

export default FunctionalitiesPage;
