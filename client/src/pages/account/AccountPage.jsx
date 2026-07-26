import React, {useContext, useState} from "react";
import AccountHeaderList from "../../components/account/AccountHeaderList";
import AccountGeneral from "../../components/account/AccountGeneral";
import { Box, Grid } from "@mui/material";
import { Container } from "@mui/system";
import AccountProfile from "../../components/account/AccountProfile";
import AccountDelete from "../../components/account/AccountDelete";
import AccountSettings from "../../components/account/AccountSettings";
import authContext from "../../contexts/AuthContext";
import PageHeadline from "../../components/headline/PageHeadline";

function AccountPage(props) {

  const {activeUser}  = useContext(authContext);
  const [formType, setFormType] = useState("General");
  const onFormChange = (type) => {
    setFormType(type);
  };

  return (
    <Container>
      <PageHeadline title={activeUser.userName ? `${activeUser.userName}'s Account` : "My Account"} />
      <Grid container spacing={{ xs: 3, sm: 6 }}>
        <Grid item xs={12} sm={4}>
          <Box>
            <AccountHeaderList onFormChange={onFormChange} formType={formType}/>
          </Box>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Box>
            {formType==="General" && <AccountGeneral />}
            {formType==="Profile" && <AccountProfile />}
            {formType==="Settings" && <AccountSettings />}
            {formType==="Delete Account" && <AccountDelete />}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AccountPage;
