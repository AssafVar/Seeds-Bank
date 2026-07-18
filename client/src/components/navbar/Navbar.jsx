import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
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
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import MenuIcon from "@mui/icons-material/Menu";
import NatureIcon from "@mui/icons-material/Nature";
import ParkIcon from "@mui/icons-material/Park";
import YardIcon from "@mui/icons-material/Yard";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import SpaIcon from "@mui/icons-material/Spa";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import useAuth from "../../hooks/useAuth";
import SeedsBankLogo from "./SeedsBank.png";
import { classes } from "../../styles/navbarStyles";
import { Container } from "@mui/system";

// Grouped so the order reads: informational pages, the public climate
// tool, then (once logged in) the app's actual functionality, admin last.
const PUBLIC_LINKS = [
  { to: "/about", label: "About", tooltip: "About the App", icon: NatureIcon },
  { to: "/functionality", label: "Functionality", tooltip: "App's Functionality", icon: ParkIcon },
  { to: "/news", label: "News", tooltip: "Breeding news", icon: YardIcon },
  { to: "/climate", label: "Climate", tooltip: "Explore climate data by location", icon: WbSunnyIcon },
];

const PROTECTED_LINKS = [
  { to: "/projects", label: "My Projects", tooltip: "Projects", icon: SpaIcon },
  { to: "/account", label: "My account", tooltip: "User account", icon: AccountCircleIcon },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Admin", tooltip: "Manage home page content", icon: AdminPanelSettingsIcon },
];

function NavLink({ to, label, tooltip, icon: Icon }) {
  return (
    <Tooltip title={tooltip}>
      <Link
        component={RouterLink}
        to={to}
        underline="none"
        sx={{
          ...classes.link,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          whiteSpace: "nowrap",
          "&:hover": { color: "success.main" },
        }}
      >
        <Icon fontSize="small" />
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

  const iconButtonSx = { color: "text.primary", "&:hover": { color: "success.main" } };

  const authButtons = !activeUser ? (
    <>
      <Tooltip title="Login">
        <IconButton sx={iconButtonSx} onClick={() => openAuthModal(false)}>
          <LoginIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Signup">
        <IconButton sx={iconButtonSx} onClick={() => openAuthModal(true)}>
          <LocalFloristIcon />
        </IconButton>
      </Tooltip>
    </>
  ) : (
    <Tooltip title="Logout">
      <IconButton sx={{ color: "text.primary", "&:hover": { color: "error.main" } }} onClick={onLogout}>
        <LogoutIcon />
      </IconButton>
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
        <Typography variant="h6">
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
            {links.map(({ icon: Icon, ...link }) => (
              <ListItemButton
                key={link.to}
                component={RouterLink}
                to={link.to}
                onClick={() => setIsDrawerOpen(false)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
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
