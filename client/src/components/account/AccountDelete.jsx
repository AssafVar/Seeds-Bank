import { Button, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useState } from "react";
import { classes } from "../../styles/accountStyle";
import AlertDialog from "../alert/AlertDialog";
import { useNavigate } from "react-router-dom";

function AccountDelete(props) {

  const [password, setPassword] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const navigate = useNavigate();

  const handleDeleteAgree = (agree) => {
    setIsAlertOpen(false);
    if (agree){
      console.log("Delete the account");
      navigate('/');
    }
  };
  const handleClose = () => {
    setIsAlertOpen(false);
  }

  return (
    <Box style={classes.formBox}>
      <Typography style={classes.boxHeadline}>
        Delete the account will delete all the account information.
      </Typography>
      <TextField
        id="outlined-password"
        label="password"
        value={password}
        style={classes.formInput}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <Button style={classes.formButtonDelete} onClick={()=>setIsAlertOpen(true)}>
        Delete
      </Button>
      <AlertDialog isAlertOpen={isAlertOpen} dialogTitle ={"Delete Account"} dialogText={"Are you sure you want to delete the account"} handleDeleteAgree={handleDeleteAgree} handleClose={handleClose}/>
    </Box>
  );
}

export default AccountDelete;
