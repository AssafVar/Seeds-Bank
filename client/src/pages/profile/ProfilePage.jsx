import React from 'react';
import { Button } from '@mui/material';
import './profilePage.css';

function ProfilePage(props) {

    return (
        <div className='my-profile'>
            <div className="profile-sidebar">
                <Button>Personal Info</Button>
                <h1>My Websites</h1>
                <ul>
                    <li>web</li>
                    <li>site</li>
                    <li>link</li>
                    <li>other link</li>
                </ul>
            </div>
            <div className="profile-main-container">
                <div className="profile-my-projects">
                    my-open-projects
                </div>

            </div>
        </div>
    );
}

export default ProfilePage;