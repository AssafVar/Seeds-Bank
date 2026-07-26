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
import { Link as RouterLink, useLocation } from "react-router-dom";
import LoginModal from "../modals/RegisterModal";
import MenuIcon from "@mui/icons-material/Menu";
import useAuth from "../../hooks/useAuth";
import SeedsBankLogo from "./SeedsBank.png";
import { classes } from "../../styles/navbarStyles";
import { Container } from "@mui/system";

// Grouped so the order reads: informational pages, the public climate
// tool, then (once logged in) the app's actual functionality, admin last.
const PUBLIC_LINKS = [
  { to: "/about", label: "About", tooltip: "About the App" },
  { to: "/functionality", label: "Functionality", tooltip: "App's Functionality" },
  { to: "/news", label: "News", tooltip: "Breeding news" },
  { to: "/climate", label: "Climate", tooltip: "Explore climate data by location" },
];

const PROTECTED_LINKS = [
  { to: "/projects", label: "My Projects", tooltip: "Projects" },
  { to: "/account", label: "My account", tooltip: "User account" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Admin", tooltip: "Manage home page content" },
];

function NavLink({ to, label, tooltip, isActive }) {
  return (
    <Tooltip title={tooltip}>
      <Link
        component={RouterLink}
        to={to}
        underline="none"
        aria-current={isActive ? "page" : undefined}
        sx={{
          ...classes.link,
          whiteSpace: "nowrap",
          color: isActive ? "success.main" : "text.primary",
          fontWeight: isActive ? 700 : 400,
          "&:hover": { color: "success.main" },
        }}
      >
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
  const location = useLocation();
  const isPathActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

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

  const authButtonSx = { ...classes.link, textTransform: "none", "&:hover": { color: "success.main" } };

  const authButtons = !activeUser ? (
    <>
      <Button sx={authButtonSx} onClick={() => openAuthModal(false)}>
        Login
      </Button>
      <Button sx={authButtonSx} onClick={() => openAuthModal(true)}>
        Sign up
      </Button>
    </>
  ) : (
    <Button sx={{ ...authButtonSx, "&:hover": { color: "error.main" } }} onClick={onLogout}>
      Logout
    </Button>
  );

  const isHomeActive = isPathActive("/");

  const logo = (
    <Tooltip title="Home">
      <Link
        component={RouterLink}
        to="/"
        style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
      >
        <img src={SeedsBankLogo} alt="Logo" style={classes.image} />
        <Typography
          variant="h6"
          sx={{ color: isHomeActive ? "success.main" : "text.primary", fontWeight: isHomeActive ? 700 : 500 }}
        >
          Home
        </Typography>
      </Link>
    </Tooltip>
  );

  return (
    <>
      <Container sx={classes.sxContainer}>
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{logo}</Box>
        {isMobile ? (
          <IconButton onClick={() => setIsDrawerOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </IconButton>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            {links.map((link) => (
              <NavLink key={link.to} {...link} isActive={isPathActive(link.to)} />
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
                selected={isPathActive(link.to)}
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
      <LoginModal
        isOpenModal={isOpenModal}
        isSignup={isSignup}
        setIsSignup={setIsSignup}
        handleLogin={handleLogin}
      />
    </>
  );
}

export default Navbar;
