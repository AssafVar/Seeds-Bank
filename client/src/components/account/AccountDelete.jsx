import { Button, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useState } from "react";
import { classes } from "../../styles/accountStyle";

function AccountDelete(props) {
  const [password, setPassword] = useState("");

  const onDelete = () => {
    console.log("onDelete");
  };

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
      <Button style={classes.formButtonDelete} onClick={onDelete}>
        Delete
      </Button>
    </Box>
  );
}

export default AccountDelete;
