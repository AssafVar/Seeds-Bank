import React from 'react';
import Modal from "@mui/material/Modal";
import { Box, Typography } from "@mui/material";
import {style} from './modalStyle.js'
import ProfileInfo from '../profile/ProfileInfo.jsx';

function ProfileModal({isOpenModal, handleModal}) {
    return (
        <Modal
        open={isOpenModal}
        onClose={handleModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
            <Typography id="modal-modal-title" variant="h4" component="h2">
                User profile info
            </Typography>
            <Typography id="modal-modal" variant="h6" component="h2">
                <ProfileInfo/>
            </Typography>
            </Box>
        </Modal>
    );
}

export default ProfileModal;