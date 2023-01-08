import { Button, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import LoginModal from '../modals/RegisterModal';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import useAuth from '../../hooks/useAuth';
import "./navbar.css";


function Navbar({props}) {

    const [isOpenModal, setIsOpenModal] = useState(false);
    const [isSignup, setIsSignup] = useState(true);
    const {onLogout,activeUser} = useAuth();

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
                    {!activeUser&&<>
                    <Tooltip title="Login">
                        <Button color='success' onClick={()=>{handleLogin();setIsSignup(false)}}><LoginIcon/></Button>
                    </Tooltip>
                    <Tooltip title="Signup">
                        <Button color='success' onClick={()=>{handleLogin();setIsSignup(true)}}><PersonAddIcon/></Button>
                    </Tooltip>
                    </>}
                    {activeUser&&<>
                    <Tooltip title="Logout">
                        <Button color='error' onClick={onLogout} ><LogoutIcon/></Button>
                    </Tooltip></>}
                </div>
            </div>
        </>
    );
}

export default Navbar;