import React, { useState } from 'react';
import LoginModal from '../modals/LoginModal';
import "./navbar.css";

function Navbar(props) {

    const [isOpenModal, setIsOpenModal] = useState(false);
    const handleLogin = () => {
        setIsOpenModal(!isOpenModal);
    }
    return (
        <div className='navbar'>
            <span>Seeds bank</span>
            <div>
                <button onClick={()=>setIsOpenModal(!isOpenModal)}> Login </button>
                <button> Signup </button>
            </div>
            <LoginModal 
                isOpenModal={isOpenModal}
                handleLogin = {handleLogin}
            />
        </div>
    );
}

export default Navbar;