import './App.css';
import AuthProvider from './components/AuthProvider';
import HomePage from './pages/homePage/HomePage';
import Navbar from './components/navbar/Navbar';
import {Routes, Route } from 'react-router-dom';
import AccountPage from './pages/account/AccountPage';
import AboutPage from './pages/about/AboutPage';
import FunctionalitiesPage from './pages/functionalities/FunctionalitiesPage';
import NewsPage from './pages/news/NewsPage';
import DemoPage from './pages/Demo/DemoPage';
import UserProjectsPage from './pages/projects/UserProjectsPage';
import { Container } from '@mui/system';

function App() {
  return (
      <Container>
      <AuthProvider>
        <Navbar/>
        <Routes>
          <Route exact path='/' element={<HomePage/>}/>
          <Route path='/about' element={<AboutPage/>}/>
          <Route path='/functionality' element={<FunctionalitiesPage/>}/>
          <Route path='/news' element={<NewsPage/>}/>
          <Route path='/demo' element={<DemoPage/>}/>
          <Route path='/projects' element={<UserProjectsPage/>}/>
          <Route path='/account' element={<AccountPage/>}/>
        </Routes>
      </AuthProvider>
      </Container>
  );
}

export default App;
