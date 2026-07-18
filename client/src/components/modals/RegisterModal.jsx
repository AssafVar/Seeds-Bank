import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import RegisterForm from "../forms/RegisterForm";

function RegisterModal({ isOpenModal, handleLogin, isSignup, setIsSignup }) {
  const Icon = isSignup ? LocalFloristIcon : LoginIcon;

  return (
    <Dialog
      open={isOpenModal}
      onClose={handleLogin}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { position: "relative", overflow: "visible" } }}
    >
      <IconButton
        onClick={handleLogin}
        aria-label="Close"
        size="small"
        sx={{
          position: "absolute",
          top: -14,
          left: -14,
          bgcolor: "background.paper",
          boxShadow: 3,
          "&:hover": { bgcolor: "background.paper", opacity: 0.9 },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon color="primary" />
        {isSignup ? "Create your account" : "Welcome back"}
      </DialogTitle>
      <DialogContent>
        <RegisterForm isSignup={isSignup} setIsSignup={setIsSignup} handleLogin={handleLogin} />
      </DialogContent>
    </Dialog>
  );
}

export default RegisterModal;
