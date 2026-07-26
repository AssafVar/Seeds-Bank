import './App.css';
import HomePage from './pages/homePage/HomePage';
import Navbar from './components/navbar/Navbar';
import {Routes, Route } from 'react-router-dom';
import AccountPage from './pages/account/AccountPage';
import AboutPage from './pages/about/AboutPage';
import FunctionalitiesPage from './pages/functionalities/FunctionalitiesPage';
import NewsPage from './pages/news/NewsPage';
import UserProjectsPage from './pages/projects/UserProjectsPage';
import ProjectItem from './components/projects/ProjectItem';
import FieldsPage from './pages/projects/FieldsPage';
import { Container } from '@mui/system';
import ProtectedRoute from './contexts/ProtectedRoute';
import AdminRoute from './contexts/AdminRoute';
import AdminPage from './pages/admin/AdminPage';
import ClimatePage from './pages/climate/ClimatePage';

function App() {
  return (
      <Container>
        <Navbar/>
        <Routes>
          <Route exact path='/' element={<HomePage/>}/>
          <Route path='/about' element={<AboutPage/>}/>
          <Route path='/functionality' element={<FunctionalitiesPage/>}/>
          <Route path='/climate' element={<ClimatePage/>}/>
          <Route path='/news' element={<NewsPage/>}/>
          <Route path='/projects' element={<ProtectedRoute><UserProjectsPage/></ProtectedRoute>}/>
          <Route path='/projects/:projectId' element={<ProtectedRoute><ProjectItem/></ProtectedRoute>}/>
          <Route path='/projects/:projectId/fields' element={<ProtectedRoute><FieldsPage/></ProtectedRoute>}/>
          <Route path='/account' element={<ProtectedRoute><AccountPage/></ProtectedRoute>}/>
          <Route path='/admin' element={<AdminRoute><AdminPage/></AdminRoute>}/>
        </Routes>
      </Container>
  );
}

export default App;
