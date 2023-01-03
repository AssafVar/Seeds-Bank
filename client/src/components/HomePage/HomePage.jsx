import React from 'react';
import LocationInfo from '../LocationInfo';
import HomeMain from '../homeMain/HomeMain';
import Sidebar from '../Sidebar';
import "./homePage.css";

function HomePage(props) {
    return (
        <div className='home-page'>
            <LocationInfo/>
            <div className='home-page-container'>
                <div className='sidebar-container'>
                    <Sidebar/>
                </div>
                <div className='home-main-container'>
                    <HomeMain/>
                </div>
            </div>
        </div>
    );
}

export default HomePage;