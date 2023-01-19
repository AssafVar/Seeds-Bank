import React, { useContext, useState } from "react";
import { Box } from "@mui/system";
import { Button, TextField, Typography } from "@mui/material";
import {classes} from '../../styles/accountStyle'
import authContext from "../../contexts/AuthContext";

function AccountGeneral(props) {

  const {activeUser:user} = useContext(authContext);
  console.log(user);
  const [userName, setUserName] = useState(user?.username);
  const [userEmail, setUserEmail] = useState(user?.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmitPassword = () => {

  }
  const onSubmit = () => {

  };

  return (
    <><Box style={classes.formBox}>
      <Typography style={classes.boxHeadline}>Change account user name</Typography>
      <TextField
        id="outlined-name"
        label="Name"
        value={userName}
        style={classes.formInput}
        onChange={(e) => setUserName(e.target.value)} /><br />
      <Button style={classes.formButton} onClick={onSubmit}>Save</Button>
    </Box><Box style={classes.formBox}>
        <Typography style={classes.boxHeadline}>Change account email</Typography>
        <TextField
          id="outlined-email"
          label="Email"
          value={userEmail}
          style={classes.formInput}
          onChange={(e) => setUserEmail(e.target.value)} /><br />
        <Button style={classes.formButton} onClick={onSubmit}>Save</Button>
      </Box><Box style={classes.formBox}>
        <Typography style={classes.boxHeadline}>Change account password</Typography>
        <Typography style={classes.formText}>Type new password and confirm the new password</Typography>
        <TextField
          id="outlined-password"
          label="Password"
          value={password}
          style={classes.formInput}
          onChange={(e) => setPassword(e.target.value)} /><br />
        <Typography style={classes.boxHeadline}>Confirm password</Typography>
        <TextField
          id="outlined-confirm-password"
          label="Confirm password"
          value={confirmPassword}
          style={classes.formInput}
          onChange={(e) => setConfirmPassword(e.target.value)} /><br />
        <Button style={classes.formButton} onClick={onSubmitPassword}>Save</Button>
      </Box></>
  );
}

export default AccountGeneral;
