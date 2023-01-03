import React from "react";
import Modal from "@mui/material/Modal";
import { Box, Typography } from "@mui/material";
import {style} from "./modalStyle";
import LoginForm from "../forms/loginForm/LoginForm";

function LoginModal({ isOpenModal, handleLogin }) {

  return (
    <div>
      <Modal
        open={isOpenModal}
        onClose={handleLogin}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
                Login to your account
            </Typography>
            <LoginForm handleLogin={handleLogin}/>
        </Box>
      </Modal>
    </div>
  );
}

export default LoginModal;
