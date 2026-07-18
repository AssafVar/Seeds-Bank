import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import LoginModal from "../modals/RegisterModal";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MenuIcon from "@mui/icons-material/Menu";
import useAuth from "../../hooks/useAuth";
import SeedsBankLogo from "./SeedsBank.png";
import { classes } from "../../styles/navbarStyles";
import "./navbar.css";
import { Container } from "@mui/system";

const PUBLIC_LINKS = [
  { to: "/about", label: "About", tooltip: "About the App" },
  { to: "/functionality", label: "Functionality", tooltip: "App's Functionality" },
  { to: "/climate", label: "Climate", tooltip: "Explore climate data by location" },
  { to: "/news", label: "News", tooltip: "Breeding news" },
];

const PROTECTED_LINKS = [
  { to: "/account", label: "My account", tooltip: "User account" },
  { to: "/projects", label: "My Projects", tooltip: "Projects" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Admin", tooltip: "Manage home page content" },
];

function NavLink({ to, label, tooltip }) {
  return (
    <Tooltip title={tooltip}>
      <Link component={RouterLink} to={to} underline="none" style={classes.link}>
        {label}
      </Link>
    </Tooltip>
  );
}

function Navbar() {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { onLogout, activeUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleLogin = () => {
    setIsSignup(false);
    setIsOpenModal(!isOpenModal);
  };

  const openAuthModal = (signup) => {
    setIsSignup(signup);
    handleLogin();
    setIsDrawerOpen(false);
  };

  const links = activeUser
    ? [...PUBLIC_LINKS, ...PROTECTED_LINKS, ...(activeUser.isAdmin ? ADMIN_LINKS : [])]
    : PUBLIC_LINKS;

  const authButtons = !activeUser ? (
    <>
      <Tooltip title="Login">
        <Button style={{ minWidth: 0 }} color="success" onClick={() => openAuthModal(false)}>
          <LoginIcon />
        </Button>
      </Tooltip>
      <Tooltip title="Signup">
        <Button style={{ minWidth: 0 }} color="success" onClick={() => openAuthModal(true)}>
          <PersonAddIcon />
        </Button>
      </Tooltip>
    </>
  ) : (
    <Tooltip title="Logout">
      <Button style={{ minWidth: 0 }} color="error" onClick={onLogout}>
        <LogoutIcon />
      </Button>
    </Tooltip>
  );

  const logo = (
    <Tooltip title="Home">
      <Link
        component={RouterLink}
        to="/"
        style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
      >
        <img src={SeedsBankLogo} alt="Logo" style={classes.image} />
        <Typography variant="h6" style={{ color: "black" }}>
          Home
        </Typography>
      </Link>
    </Tooltip>
  );

  return (
    <>
      <Container sx={classes.sxContainer}>
        <Box className="nav-left">{logo}</Box>
        {isMobile ? (
          <IconButton onClick={() => setIsDrawerOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </IconButton>
        ) : (
          <Box className="nav-right">
            {links.map((link) => (
              <NavLink key={link.to} {...link} />
            ))}
            <Divider style={classes.divider} />
            {authButtons}
          </Box>
        )}
      </Container>
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <Box sx={{ width: 220 }} role="presentation">
          <List>
            {links.map((link) => (
              <ListItemButton
                key={link.to}
                component={RouterLink}
                to={link.to}
                onClick={() => setIsDrawerOpen(false)}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>{authButtons}</Box>
        </Box>
      </Drawer>
      <LoginModal isOpenModal={isOpenModal} isSignup={isSignup} handleLogin={handleLogin} />
    </>
  );
}

export default Navbar;
