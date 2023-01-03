import React from 'react';
import AppInfo from '../AppInfo';
import Weather from '../Weather';
import Example from '../Example';
import "./homeMain.css"

function HomeMain(props) {
    return (
        <div className='home-main'>
            <AppInfo/>
            <div>
                <Weather/>
                <Example/>
                <Example/>
            </div>
        </div>
    );
}

export default HomeMain;