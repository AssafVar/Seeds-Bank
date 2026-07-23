import React, { useContext, useState } from "react";
import { Box } from "@mui/system";
import { Alert, Button, TextField, Typography } from "@mui/material";
import {classes} from '../../styles/accountStyle'
import authContext from "../../contexts/AuthContext";
import { updateProfile } from "../../services/serverCalls";
import { InlineSpinner } from "../common/Spinner.jsx";

function AccountGeneral(props) {


  const {activeUser: user, updateActiveUser} = useContext(authContext);
  const [userName, setUserName] = useState(user?.userName || '');
  const [userNameMessage, setUserNameMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerAlert, setRegisterAlert] = useState('');
  const [isSavingUserName, setIsSavingUserName] = useState(false);
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

  };

  const onSubmitUserName = async () => {
    setIsSavingUserName(true);
    const result = await updateProfile(userName);
    setIsSavingUserName(false);
    if (result) {
      updateActiveUser({ userName: result.userName });
      setUserNameMessage("Saved");
    } else {
      setUserNameMessage("Failed to save");
    }
    setTimeout(() => setUserNameMessage(""), 2000);
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
        <Button style={classes.formButton} onClick={onSubmitUserName} disabled={isSavingUserName}>
          {isSavingUserName ? <InlineSpinner size={20} /> : "Save"}
        </Button>
        {userNameMessage && <Alert severity={userNameMessage === "Saved" ? "success" : "error"}>{userNameMessage}</Alert>}
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
