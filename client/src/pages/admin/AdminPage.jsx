import { useState } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { Container } from "@mui/system";
import PageHeadline from "../../components/headline/PageHeadline";
import HomeContentSection from "./sections/HomeContentSection.jsx";
import GallerySection from "./sections/GallerySection.jsx";
import NewsSection from "./sections/NewsSection.jsx";
import VarietiesSection from "./sections/VarietiesSection.jsx";
import WorkersSection from "./sections/WorkersSection.jsx";

const SECTIONS = [
  { id: "content", label: "Home page content", Component: HomeContentSection },
  { id: "gallery", label: "Picture gallery", Component: GallerySection },
  { id: "news", label: "News posts", Component: NewsSection },
  { id: "varieties", label: "Vegetable varieties", Component: VarietiesSection },
  { id: "workers", label: "Workers", Component: WorkersSection },
];

function AdminPage() {
  const [activeSection, setActiveSection] = useState("content");
  const ActiveSection = SECTIONS.find((section) => section.id === activeSection).Component;

  return (
    <Container>
      <PageHeadline title="Admin" />
      <Box sx={{ display: "flex", gap: 3, mt: 2, alignItems: "flex-start" }}>
        <List sx={{ width: 220, flexShrink: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, py: 0 }}>
          {SECTIONS.map((section) => (
            <ListItemButton
              key={section.id}
              selected={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
            >
              <ListItemText primary={section.label} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ActiveSection />
        </Box>
      </Box>
    </Container>
  );
}

export default AdminPage;
