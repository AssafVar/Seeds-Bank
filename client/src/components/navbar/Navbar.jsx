import { Button, Link, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import LoginModal from '../modals/RegisterModal';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import useAuth from '../../hooks/useAuth';
import SeedsBankLogo from "./SeedsBankLogo.jpg";
import {style} from "./style.js"
import "./navbar.css";


function Navbar(props) {

    const [isOpenModal, setIsOpenModal] = useState(false);
    const [isSignup, setIsSignup] = useState(true);
    const {onLogout,activeUser} = useAuth();

    const handleLogin = () => {
        setIsSignup(false);
        setIsOpenModal(!isOpenModal);
    }

    return (
        <>
            <div className='navbar'>
                <div className="nav-left">
                    <Tooltip title="Home">
                        <Link href='/'><img src={SeedsBankLogo} alt="Logo" style={style.image}/></Link>
                    </Tooltip>
                </div>
                <div className="nav-center">
                    <Tooltip title="About the App">
                        <Link href='/about' underline="none" style={style.link}>About</Link>
                    </Tooltip>
                    <Tooltip title="App's Functinoality">
                    <Link href='/functionality' underline="none" style={style.link}>Functionality</Link>
                    </Tooltip>
                    <Tooltip title="Breeding news">
                        <Link href='/news' underline="none" style={style.link}>News</Link>
                    </Tooltip>
                    <Tooltip title="Test the app">
                        <Link href='/demo' underline="none" style={style.link}>Demo</Link>
                    </Tooltip>
                    <Tooltip title="User profile">
                        <Link href='/profile' underline="none" style={style.link}> My Profile</Link>
                    </Tooltip>
                    <Tooltip title="Test the app">
                        <Link href='/projects' underline="none" style={style.link}> My Projects</Link>
                    </Tooltip>
                </div>
                <div className='nav-right'>
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
            <LoginModal 
            isOpenModal={isOpenModal}
            isSignup={isSignup}
            handleLogin = {handleLogin}
            />
        </>
    );
}

export default Navbar;