import {
  Box,
  Button,
  Divider,
  Grid,
  Link,
  Tooltip,
} from "@mui/material";
import React, { useState } from "react";
import LoginModal from "../modals/RegisterModal";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import useAuth from "../../hooks/useAuth";
import SeedsBankLogo from "./SeedsBankLogo.jpg";
import { classes } from "../../styles/navbarStyles";
import "./navbar.css";
import { Container } from "@mui/system";

function Navbar(props) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const { onLogout, activeUser } = useAuth();

  const handleLogin = () => {
    setIsSignup(false);
    setIsOpenModal(!isOpenModal);
  };

  return (
    <>
      <Container sx={classes.sxContainer}>
        <Grid container direction="row" justifyContent="space-between">
          <Grid item xs={3}>
            <Box className="nav-left">
              <Tooltip title="Home">
                <Link href="/">
                  <img src={SeedsBankLogo} alt="Logo" style={classes.image} />
                </Link>
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={9} display="flex" justifyContent="flex-end">
            <Box className="nav-right">
              <Tooltip title="About the App">
                <Link href="/about" underline="none" style={classes.link}>
                  About
                </Link>
              </Tooltip>
              <Tooltip title="App's Functinoality">
                <Link
                  href="/functionality"
                  underline="none"
                  style={classes.link}
                >
                  Functionality
                </Link>
              </Tooltip>
              <Tooltip title="Breeding news">
                <Link href="/news" underline="none" style={classes.link}>
                  News
                </Link>
              </Tooltip>
              <Tooltip title="Test the app">
                <Link href="/demo" underline="none" style={classes.link}>
                  Demo
                </Link>
              </Tooltip>
              {activeUser && (
                <>
                  <Divider style={classes.divider} />
                  <Tooltip title="User account">
                    <Link href="/account" underline="none" style={classes.link}>
                      {" "}
                      My account
                    </Link>
                  </Tooltip>
                  <Tooltip title="Test the app">
                    <Link
                      href="/projects"
                      underline="none"
                      style={classes.link}
                    >
                      {" "}
                      My Projects
                    </Link>
                  </Tooltip>
                </>
              )}
              <Divider style={classes.divider} />
              {!activeUser ? (
                <>
                  <Tooltip title="Login">
                    <Button
                      style={{ minWidth: 0 }}
                      color="success"
                      onClick={() => {
                        handleLogin();
                        setIsSignup(false);
                      }}
                    >
                      <LoginIcon />
                    </Button>
                  </Tooltip>
                  <Tooltip title="Signup">
                    <Button
                      style={{ minWidth: 0 }}
                      color="success"
                      onClick={() => {
                        handleLogin();
                        setIsSignup(true);
                      }}
                    >
                      <PersonAddIcon />
                    </Button>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Logout">
                    <Button
                      style={{ minWidth: 0 }}
                      color="error"
                      onClick={onLogout}
                    >
                      <LogoutIcon />
                    </Button>
                  </Tooltip>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
      <LoginModal
        isOpenModal={isOpenModal}
        isSignup={isSignup}
        handleLogin={handleLogin}
      />
    </>
  );
}

export default Navbar;
