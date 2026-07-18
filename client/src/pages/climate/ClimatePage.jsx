import React from "react";
import { Container } from "@mui/system";
import PageHeadline from "../../components/headline/PageHeadline";
import LocationInfo from "../../components/locationInfo/LocationInfo";

function ClimatePage() {
  return (
    <Container>
      <PageHeadline title="Climate" />
      <LocationInfo />
    </Container>
  );
}

export default ClimatePage;
