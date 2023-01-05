import React from 'react';
import AppInfo from './AppInfo';
import "./homeMain.css"
import Weather from '../Weather';
import Example from '../Example';

function HomeMain(props) {
    return (
        <div className='home-main'>
            <div className="home-first-container">
                <AppInfo/>
            </div>
            <div className='home-second-container'>
                <Weather/>
                <Example/>
                <Example/>
            </div>
        </div>
    );
}

export default HomeMain;