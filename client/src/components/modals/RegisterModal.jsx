import React from "react";
import Modal from "@mui/material/Modal";
import { Box, Typography } from "@mui/material";
import {style} from "./modalStyle";
import RegisterForm from "../forms/RegisterForm";

function RegisterModal({ isOpenModal, handleLogin, isSignup }) {

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
              {isSignup?<>Create a new account</>:<>Login to your account</>}
          </Typography>
          <RegisterForm isSignup={isSignup}/>
        </Box>
      </Modal>
    </div>
  );
}

export default RegisterModal;
