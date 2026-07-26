import React from "react";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

function ProjectTabsBar({ value, onChange }) {
  return (
    <Tabs value={value} onChange={(e, v) => onChange(v)} sx={{ mt: 1, mb: 2 }}>
      <Tab label="Plants" />
      <Tab label="Fields" />
      <Tab label="Varieties" />
    </Tabs>
  );
}

export default ProjectTabsBar;
