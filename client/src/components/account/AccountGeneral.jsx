import React, { useContext, useState } from "react";
import { Box } from "@mui/system";
import { Alert, Button, TextField, Typography } from "@mui/material";
import {classes} from '../../styles/accountStyle'
import authContext from "../../contexts/AuthContext";
import { updateUserAccount } from "../../services/serverCalls";

function AccountGeneral(props) {

  const {activeUser:user} = useContext(authContext);
  const [userName, setUserName] = useState(user?.username);
  const [userEmail, setUserEmail] = useState(user?.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerAlert, setRegisterAlert] = useState('');
  const onSubmitPassword = (target) => {
    if (password===confirmPassword){
      onSubmit(target);
    }else{
      setRegisterAlert("Passwords don't match")
      setTimeout(()=>{
        setRegisterAlert("")},3000)
    }
  }
  const onSubmit = ({target}) => {
    updateUserAccount()
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
        {registerAlert&&<Alert severity="error">{registerAlert}</Alert>}
      </Box></>
  );
}

export default AccountGeneral;
