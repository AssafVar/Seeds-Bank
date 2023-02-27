import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { deletePlant } from '../../services/serverCalls';

export default function DialogModal({isOpen, handleDialogModal, message, plantIdToDelete, user_id, fetchProject}) {

  const [deleteMessageColor, setDeleteMessageColor] = useState('black');
  const [deleteMessage, setDeleteMessage] = useState('');

  const handleDelete  = async() => {
    const response = await deletePlant(user_id, plantIdToDelete);
    if (response.status === 200){
      setDeleteMessage("Deleting complete: Item successfully deleted from database");
      setDeleteMessageColor("green")
    }else{
      setDeleteMessage("Error deleting: Could not delete the plant from database");
      setDeleteMessageColor("red")
    };
    setTimeout(() =>{
      setDeleteMessage('');
      handleDialogModal();
      fetchProject();
    },2000)
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleDialogModal}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" variant='h4' color={deleteMessageColor}>
          {!deleteMessage&&message.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" variant='h6' color={deleteMessageColor}>
            {deleteMessage? deleteMessage: message.body}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {!deleteMessage && <><Button onClick={handleDialogModal}>Disagree</Button>
          <Button onClick={handleDelete} autoFocus>
            Agree
          </Button></>}
        </DialogActions>
      </Dialog>
    </>
  );
}
