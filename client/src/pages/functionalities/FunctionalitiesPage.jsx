import React from "react";
import { Container } from "@mui/system";
import { Typography } from "@mui/material";
import PageHeadline from "../../components/headline/PageHeadline";

function FunctionalitiesPage(props) {
  return (
    <Container>
        <PageHeadline title={"Why Seeds Bank"}/>
      <Typography variant="body1">
        The SeedsBank application is a software tool designed to help plant
        breeders manage their breeding programs.
      </Typography><br/>
      <Typography variant="body1">
        {" "}
        It allows breeders to maintain a database of their plants, including
        pedigree, genotype, and phenotype information, and track lineage to
        identify optimal breeding pairs for desired traits.
      </Typography><br/>
      <Typography variant="body1">
        {" "}
        The application also includes tools for managing plant health records,
        tracking plant performance metrics, and making informed decisions about
        breeding.
      </Typography><br/>
      <Typography variant="body1">
        {" "}
        The main purpose of the application is to streamline breeding programs,
        save time and costs, and produce high-quality, resilient, and productive
        plants.
      </Typography><br/>
    </Container>
  );
}

export default FunctionalitiesPage;
