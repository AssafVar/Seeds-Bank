import './App.css';
import AuthProvider from './components/AuthProvider';
import HomePage from './pages/homePage/HomePage';
import Navbar from './components/navbar/Navbar';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Navbar/>
        <HomePage/>
      </AuthProvider>
    </div>
  );
}

export default App;
