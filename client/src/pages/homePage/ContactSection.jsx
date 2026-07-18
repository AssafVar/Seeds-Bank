import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

function ContactSection({ contactEmail, contactPhone, contactAddress }) {
  const hasContactInfo = contactEmail || contactPhone || contactAddress;

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Contact
        </Typography>
        {hasContactInfo ? (
          <Stack spacing={1}>
            {contactEmail && <Typography variant="body1">Email: {contactEmail}</Typography>}
            {contactPhone && <Typography variant="body1">Phone: {contactPhone}</Typography>}
            {contactAddress && <Typography variant="body1">Address: {contactAddress}</Typography>}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Contact info coming soon.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default ContactSection;
