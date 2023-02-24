import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
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
            <Typography id="transition-modal-title" variant="h6" component="h2" style={modalColor}>
              {message?.title}
            </Typography>
            <Typography id="transition-modal-description" sx={{ mt: 2 }} style={modalColor}>
                {message?.description}
            </Typography>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}
