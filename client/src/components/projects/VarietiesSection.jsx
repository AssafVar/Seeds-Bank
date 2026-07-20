import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getFields } from "../../services/serverCalls";

function groupByVariety(fields) {
  const groups = {};
  for (const field of fields) {
    if (!field.variety) continue;
    if (!groups[field.variety]) {
      groups[field.variety] = { variety: field.variety, fieldCount: 0, totalCapacity: 0, fieldNames: [] };
    }
    groups[field.variety].fieldCount += 1;
    groups[field.variety].totalCapacity += field.totalCapacity;
    groups[field.variety].fieldNames.push(field.name);
  }
  return Object.values(groups).sort((a, b) => b.totalCapacity - a.totalCapacity);
}

function VarietiesSection({ userId, projectId }) {
  const [fields, setFields] = useState(null);

  useEffect(() => {
    getFields(userId, projectId).then((data) => data && setFields(data));
  }, [userId, projectId]);

  if (fields === null) {
    return null;
  }

  const varieties = groupByVariety(fields);

  if (fields.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        No fields yet. Add a field (with a vegetable variety selected) to see it here.
      </Typography>
    );
  }

  if (varieties.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        None of this project's fields have a vegetable variety set yet — pick one when adding or
        editing a field to see it grouped here.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Varieties
      </Typography>
      <Grid container spacing={2}>
        {varieties.map((v) => (
          <Grid item xs={12} sm={6} md={4} key={v.variety}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {v.variety}
                </Typography>
                <Typography variant="body2">
                  {v.fieldCount} field{v.fieldCount === 1 ? "" : "s"} ·{" "}
                  <strong>{v.totalCapacity} plants</strong> total
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {v.fieldNames.join(", ")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default VarietiesSection;
