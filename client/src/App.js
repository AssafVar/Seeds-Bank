import './App.css';
import AuthProvider from './components/AuthProvider';
import HomePage from './pages/homePage/HomePage';
import Navbar from './components/navbar/Navbar';
import {Routes, Route } from 'react-router-dom';
import ProfilePage from './pages/profile/ProfilePage';
import AboutPage from './pages/about/AboutPage';
import FunctionalitiesPage from './pages/functionalities/FunctionalitiesPage';
import NewsPage from './pages/news/NewsPage';
import DemoPage from './pages/Demo/DemoPage';
import UserProjectsPage from './pages/projects/UserProjectsPage';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Navbar/>
        <Routes>
          <Route exact path='/' element={<HomePage/>}/>
          <Route path='/about' element={<AboutPage/>}/>
          <Route path='/functionality' element={<FunctionalitiesPage/>}/>
          <Route path='/news' element={<NewsPage/>}/>
          <Route path='/demo' element={<DemoPage/>}/>
          <Route path='/projects' element={<UserProjectsPage/>}/>
          <Route path='/profile' element={<ProfilePage/>}/>
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;
