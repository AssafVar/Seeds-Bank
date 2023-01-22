import { Button, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useContext, useState } from "react";
import { classes } from "../../styles/accountStyle";
import TextareaAutosize from '@mui/base/TextareaAutosize';
import authContext from "../../contexts/AuthContext";

function AccountProfile(props) {

  const {activeUser:user} = useContext(authContext);

  const [userName, setFirstName] = useState(user?.userName? user?.userName : "");
  const [headline, setHeadline] = useState(user?.headline ? user?.headline : "");
  const [location, setLocation] = useState(user?.userName ? user?.location : "");
  const [skills, setSkills] = useState(user?.userName ? user?.skills : "");
  const [biography, setBiography] = useState(user?.userName ? user.biography : "");


  return (
    <>
      <Box style={classes.formBox}>
        <Typography style={classes.boxHeadline}>
          Name
        </Typography>
        <TextField
          id="outlined-firstName"
          label="First Name"
          value={userName}
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
