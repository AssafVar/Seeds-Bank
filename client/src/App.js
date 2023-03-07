import './App.css';
import HomePage from './pages/homePage/HomePage';
import Navbar from './components/navbar/Navbar';
import {Routes, Route } from 'react-router-dom';
import AccountPage from './pages/account/AccountPage';
import AboutPage from './pages/about/AboutPage';
import FunctionalitiesPage from './pages/functionalities/FunctionalitiesPage';
import NewsPage from './pages/news/NewsPage';
import UserProjectsPage from './pages/projects/UserProjectsPage';
import { Container } from '@mui/system';
import ProtectedRoute from './contexts/ProtectedRoute';

function App() {
  return (
      <Container>
        <Navbar/>
        <Routes>
          <Route exact path='/' element={<HomePage/>}/>
          <Route path='/about' element={<AboutPage/>}/>
          <Route path='/functionality' element={<FunctionalitiesPage/>}/>
          <Route path='/news' element={<NewsPage/>}/>
          <Route path='/projects' element={<ProtectedRoute><UserProjectsPage/></ProtectedRoute>}/>
          <Route path='/account' element={<ProtectedRoute><AccountPage/></ProtectedRoute>}/>
        </Routes>
      </Container>
  );
}

export default App;
