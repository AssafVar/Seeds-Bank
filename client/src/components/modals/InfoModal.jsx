import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import { InlineSpinner } from '../common/Spinner.jsx';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    borderRadius: 2,
    border: '1px solid var(--color-divider)',
    boxShadow: 'none',
    p: 4,
  };

export default function InfoModal({isInfoModal, handleCloseInfoModal, message, modalColor}) {
  
  return (
    <div>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={isInfoModal}
        onClose={handleCloseInfoModal}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={isInfoModal}>
          <Box sx={style}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {message?.title === "Pending" && <InlineSpinner size={22} />}
              <Typography id="transition-modal-title" variant="h6" component="h2" style={modalColor}>
                {message?.title}
              </Typography>
            </Box>
            <Typography id="transition-modal-description" sx={{ mt: 2 }} style={modalColor}>
                {message?.description}
            </Typography>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}
