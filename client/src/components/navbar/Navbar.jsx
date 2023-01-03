import { Button, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import LoginModal from '../modals/LoginModal';
import "./navbar.css";
import LoginIcon from '@mui/icons-material/Login';

function Navbar(props) {

    const [isOpenModal, setIsOpenModal] = useState(false);
    const handleLogin = () => {
        setIsOpenModal(!isOpenModal);
    }
    return (
        <>
            <LoginModal 
            isOpenModal={isOpenModal}
            handleLogin = {handleLogin}
            />
            <div className='navbar'>
                <Typography>Seeds bank</Typography>
                <div>
                    <Tooltip title="Login">
                        <Button onClick={()=>setIsOpenModal(!isOpenModal)}><LoginIcon/></Button>
                    </Tooltip>
                    <Button> Signup </Button>
                </div>

            </div>
        </>
    );
}

export default Navbar;