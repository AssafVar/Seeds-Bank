import { Button, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useState } from "react";
import { classes } from "../../styles/accountStyle";
import TextareaAutosize from '@mui/base/TextareaAutosize';

function AccountProfile(props) {

  const [firstName, setFirstName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [biography, setBiography] = useState("");


  return (
    <>
      <Box style={classes.formBox}>
        <Typography style={classes.boxHeadline}>
          Name
        </Typography>
        <TextField
          id="outlined-firstName"
          label="First Name"
          value={firstName}
          style={classes.formInput}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <br />
        <Typography style={classes.boxHeadline}>
          Headline
        </Typography>
        <TextField
          id="outlined-headline"
          label="Headline"
          value={headline}
          style={classes.formInput}
          onChange={(e) => setHeadline(e.target.value)}
        />
        <br />
        <Typography style={classes.boxHeadline}>
          Location
        </Typography>
        <TextField
          id="outlined-location"
          label="Location"
          value={location}
          style={classes.formInput}
          onChange={(e) => setLocation(e.target.value)}
        />
        <br />
        <Typography style={classes.boxHeadline}>
          Skills
        </Typography>
        <TextField
          id="outlined-skills"
          label="skills"
          value={skills}
          style={classes.formInput}
          onChange={(e) => setSkills(e.target.value)}
        />
        <br />
        <Typography style={classes.boxHeadline}>
          Biography
        </Typography>
        <TextareaAutosize 
          id="outlined-biography"
          value={biography}
          style={classes.textareaBox}
          minRows={10}
          onChange={(e) => setBiography(e.target.value)}
        />
        <br />    
        <Button style={classes.formButton}>Save</Button>
      </Box>
    </>
  );
}

export default AccountProfile;
