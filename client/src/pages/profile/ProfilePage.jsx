import React, { useState } from 'react';
import { Button } from '@mui/material';
import './profilePage.css';
import ProfileModal from '../../components/modals/ProfileModal';

function ProfilePage(props) {

    const [isOpenModal, setIsOpenModal] = useState(false);

    const handleModal = () =>{
        setIsOpenModal(!isOpenModal);   
    }
    
    return (
        <div className='my-profile'>
            <div className="profile-sidebar">
                <Button onClick={handleModal}>Personal Info</Button>
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
                    <h2>My-open-projects</h2>
                </div>
            </div>
            <ProfileModal isOpenModal={isOpenModal} handleModal={handleModal}/>
        </div>
    );
}

export default ProfilePage;