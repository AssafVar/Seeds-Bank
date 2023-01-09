import './App.css';
import AuthProvider from './components/AuthProvider';
import HomePage from './pages/homePage/HomePage';
import Navbar from './components/navbar/Navbar';
import {Routes, Route } from 'react-router-dom';
import ProfilePage from './pages/profile/ProfilePage';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Navbar/>
        <Routes>
          <Route exact path='/' element={<HomePage/>}/>
          <Route path='/profile' element={<ProfilePage/>}/>
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
