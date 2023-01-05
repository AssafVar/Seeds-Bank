import { Button, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import LoginModal from '../modals/RegisterModal';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import "./navbar.css";


function Navbar(props) {

    const [isOpenModal, setIsOpenModal] = useState(false);
    const [isSignup, setIsSignup] = useState(true);

    const handleLogin = () => {
        setIsSignup(false);
        setIsOpenModal(!isOpenModal);
    }

    return (
        <>
            <LoginModal 
            isOpenModal={isOpenModal}
            isSignup={isSignup}
            handleLogin = {handleLogin}
            />
            <div className='navbar'>
                <div className="nav-left">
                    <div>
                        <Typography>Seeds bank</Typography>
                    </div>
                    <div>
                        <Typography>Design </Typography>
                    </div>
                </div>
                <div className='nav-right'>
                    <Button>My Profile</Button>
                    <Tooltip title="Login">
                        <Button onClick={()=>{handleLogin();setIsSignup(false)}}><LoginIcon/></Button>
                    </Tooltip>
                    <Tooltip title="Signup">
                        <Button onClick={()=>{handleLogin();setIsSignup(true)}}><PersonAddIcon/></Button>
                    </Tooltip>
                </div>
            </div>
        </>
    );
}

export default Navbar;