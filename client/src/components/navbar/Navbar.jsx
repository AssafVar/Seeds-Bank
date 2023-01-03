import React from 'react';
import "./navbar.css";

function Navbar(props) {
    return (
        <div className='navbar'>
            <span>Seeds bank</span>
            <div>
                <button> Login </button>
                <button> Signup </button>
            </div>

        </div>
    );
}

export default Navbar;