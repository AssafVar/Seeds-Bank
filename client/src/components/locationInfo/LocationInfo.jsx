import React, { useState } from 'react';
import { useEffect } from 'react';
import "./locationInfo.css";

function LocationInfo(props) {

    const [position, setPosition] = useState('');
    
    useEffect(()=>{
        navigator.geolocation.getCurrentPosition((position)=>setPosition(position.coords), (error)=>console.log(error))
    },[]);

    return (
        <div className='location-info'>
            <span>Location  lat:{position.latitude}, lng:{position.longitude}</span>
            <span>Temp</span>
            <span>Clowdy</span>
        </div>
    );
}

export default LocationInfo;