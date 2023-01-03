import React from 'react';
import AppInfo from './AppInfo';
import Example from './Example';
import LocationInfo from './LocationInfo';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Weather from './Weather';

function Home(props) {
    return (
        <div>
            <h1>Seeds Bank</h1>
            <Navbar/>
            <LocationInfo/>
            <Sidebar/>
            <AppInfo/>
            <Weather/>
            <Example/>
            <Example/>
        </div>
    );
}

export default Home;