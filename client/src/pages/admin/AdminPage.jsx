import { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { Container } from "@mui/system";
import PageHeadline from "../../components/headline/PageHeadline";
import AdminSectionList from "../../components/admin/AdminSectionList.jsx";
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
      <Grid container spacing={{ xs: 3, sm: 6 }}>
        <Grid item xs={12} sm={4}>
          <Box>
            <AdminSectionList sections={SECTIONS} activeId={activeSection} onChange={setActiveSection} />
          </Box>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Box>
            <ActiveSection />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AdminPage;
