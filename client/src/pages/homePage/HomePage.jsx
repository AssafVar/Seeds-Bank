import React ,{useContext} from 'react';
import LocationInfo from '../../components/locationInfo/LocationInfo'
import HomeMain from '../../components/homeMain/HomeMain'
import Sidebar from '../../components/sidebar/Sidebar'
import "./homePage.css";
import authContext from '../../contexts/AuthContext';

function HomePage(props) {
    const {activeUser} = useContext(authContext);
    return (
        <div classN
        ame='home-page'>
            <h1> Welcome {activeUser?.userName ? activeUser.userName : "guest"}</h1>
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