import React from 'react';
import "./locationInfo.css";

function LocationInfo(props) {
    return (
        <div className='location-info'>
            <span>Location</span>
            <span>Temp</span>
            <span>Clowdy</span>
        </div>
    );
}

export default LocationInfo;